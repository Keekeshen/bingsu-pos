import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import RevenueLineChart, { type DailyRevenue } from "@/components/admin/RevenueLineChart";
import ReportsFilter from "@/components/admin/ReportsFilter";
import { aggregateSplitSales } from "@/lib/sales-utils";
import { TrendingUp, ShoppingBag, Users, Calendar, Tag, Banknote, QrCode, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

/* ─── helpers ─────────────────────────────────────────────── */
function toMYT(d: Date) {
  return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
}
function currentMYT() { return toMYT(new Date()); }
function iso(d: Date) { return d.toISOString(); }
function dateKey(isoStr: string) {
  return new Date(isoStr).toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}
function formatCurrency(n: number) {
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDateShort(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
}

type SearchParams = Promise<{ period?: string; y?: string; m?: string; w?: string }>;

/* ─── compute date range ──────────────────────────────────── */
function computeRange(period: string, year: number, month: number, weekOffset: number) {
  const now = currentMYT();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const safeYear = Math.min(year, currentYear);

  if (period === "week") {
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday, label: "Week", isYear: false, isWeek: true, safeYear: now.getFullYear() };
  } else if (period === "year") {
    const start = new Date(safeYear, 0, 1, 0, 0, 0);
    const end = safeYear === currentYear
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      : new Date(safeYear, 11, 31, 23, 59, 59);
    return { start, end, label: String(safeYear), isYear: true, isWeek: false, safeYear };
  } else {
    const safeMonth = safeYear === currentYear ? Math.min(month, currentMonth) : month;
    const start = new Date(safeYear, safeMonth - 1, 1, 0, 0, 0);
    const end = new Date(safeYear, safeMonth, 0, 23, 59, 59);
    const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return { start, end, label: `${names[safeMonth - 1]} ${safeYear}`, isYear: false, isWeek: false, safeYear };
  }
}

/* ─── page ─────────────────────────────────────────────────── */
export default async function ReportsPage(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams;
  const period = sp.period ?? "month";
  const now = currentMYT();
  const year = parseInt(sp.y ?? String(now.getFullYear()));
  const month = parseInt(sp.m ?? String(now.getMonth() + 1));
  const weekOffset = parseInt(sp.w ?? "0");

  const { start, end, label, isYear, isWeek, safeYear } = computeRange(period, year, month, weekOffset);

  const supabase = await createClient();
  const todayStart = (() => { const d = new Date(now); d.setHours(0,0,0,0); return d; })();

  const [
    { data: todayOrders },
    { data: periodOrdersRaw },
    { count: customerCount },
    { data: itemsRaw },
    { data: allProductsRaw },
  ] = await Promise.all([
    supabase.from("orders").select("total_amount, discount_amount")
      .in("status", ["completed", "served"])
      .gte("created_at", iso(todayStart))
      .lte("created_at", iso(new Date(todayStart.getTime() + 86400000 - 1))),
    supabase.from("orders").select("created_at, total_amount, payment_method, discount_amount")
      .in("status", ["completed", "served"])
      .gte("created_at", iso(start))
      .lte("created_at", iso(end))
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client"),
    supabase.from("order_items")
      .select("product_name, quantity, orders!inner(created_at, status)")
      .in("orders.status", ["completed", "served"])
      .gte("orders.created_at", iso(start))
      .lte("orders.created_at", iso(end)),
    supabase.from("products")
      .select("name, code, category")
      .order("name", { ascending: true }),
  ]);

  const periodOrders = periodOrdersRaw ?? [];
  const todayRevenue = (todayOrders ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const todayCount = todayOrders?.length ?? 0;
  const periodRevenue = periodOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const periodDiscount = periodOrders.reduce((s, o) => s + (o.discount_amount ?? 0), 0);
  const periodCount = periodOrders.length;

  /* ─── chart data ─── */
  let chartData: DailyRevenue[] = [];
  if (isYear) {
    // Monthly buckets
    const monthMap = new Map<string, number>();
    for (let m = 1; m <= 12; m++) {
      const key = `${safeYear}-${String(m).padStart(2, "0")}-01`;
      monthMap.set(key, 0);
    }
    for (const o of periodOrders) {
      const d = new Date(o.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
      const mKey = d.slice(0, 7) + "-01";
      if (monthMap.has(mKey)) monthMap.set(mKey, (monthMap.get(mKey) ?? 0) + (o.total_amount ?? 0));
    }
    chartData = Array.from(monthMap.entries()).map(([date, revenue]) => ({ date, revenue }));
  } else {
    // Daily buckets for the range
    const dayMap = new Map<string, number>();
    let cur = new Date(start);
    while (cur <= end) {
      dayMap.set(cur.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" }), 0);
      cur = new Date(cur.getTime() + 86400000);
    }
    for (const o of periodOrders) {
      const d = dateKey(o.created_at);
      if (dayMap.has(d)) dayMap.set(d, (dayMap.get(d) ?? 0) + (o.total_amount ?? 0));
    }
    chartData = Array.from(dayMap.entries()).map(([date, revenue]) => ({ date, revenue }));
  }

  /* ─── breakdown table ─── */
  type BreakRow = { key: string; label: string; cash: number; qr: number; card: number; discount: number; total: number; orders: number };
  const breakMap = new Map<string, BreakRow>();

  if (isYear) {
    for (let m = 1; m <= 12; m++) {
      const key = `${safeYear}-${String(m).padStart(2, "0")}`;
      const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      breakMap.set(key, { key, label: `${names[m-1]} ${safeYear}`, cash: 0, qr: 0, card: 0, discount: 0, total: 0, orders: 0 });
    }
    for (const o of periodOrders) {
      const key = dateKey(o.created_at).slice(0, 7);
      const row = breakMap.get(key);
      if (!row) continue;
      row.total += o.total_amount ?? 0;
      row.discount += o.discount_amount ?? 0;
      row.orders += 1;
      if (o.payment_method === "cash") row.cash += o.total_amount ?? 0;
      else if (o.payment_method === "qr") row.qr += o.total_amount ?? 0;
      else if (o.payment_method === "card") row.card += o.total_amount ?? 0;
    }
  } else {
    let cur = new Date(start);
    while (cur <= end) {
      const key = cur.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
      breakMap.set(key, { key, label: formatDateShort(key), cash: 0, qr: 0, card: 0, discount: 0, total: 0, orders: 0 });
      cur = new Date(cur.getTime() + 86400000);
    }
    for (const o of periodOrders) {
      const key = dateKey(o.created_at);
      const row = breakMap.get(key);
      if (!row) continue;
      row.total += o.total_amount ?? 0;
      row.discount += o.discount_amount ?? 0;
      row.orders += 1;
      if (o.payment_method === "cash") row.cash += o.total_amount ?? 0;
      else if (o.payment_method === "qr") row.qr += o.total_amount ?? 0;
      else if (o.payment_method === "card") row.card += o.total_amount ?? 0;
    }
  }

  const activeRows = Array.from(breakMap.values())
    .filter(r => r.orders > 0)
    .sort((a, b) => b.key.localeCompare(a.key));

  /* ─── product sales (all products, base + toppings split) ─── */
  const { salesMap, toppingNames } = aggregateSplitSales(
    (itemsRaw ?? []) as Array<{ product_name: string; quantity: number }>,
  );

  type ProductSaleRow = { name: string; code: string | null; category: string | null; quantity: number };
  const catalogNames = new Set((allProductsRaw ?? []).map((p) => p.name));
  const productSalesMap = new Map<string, ProductSaleRow>();

  for (const p of allProductsRaw ?? []) {
    productSalesMap.set(p.name, {
      name: p.name,
      code: p.code ?? null,
      category: p.category ?? null,
      quantity: salesMap.get(p.name) ?? 0,
    });
  }

  // Toppings sold with drinks but not a separate menu product (e.g. Mango Popping Ball)
  for (const topping of toppingNames) {
    if (catalogNames.has(topping)) continue;
    const qty = salesMap.get(topping) ?? 0;
    if (qty <= 0) continue;
    productSalesMap.set(topping, {
      name: topping,
      code: null,
      category: "extra topping",
      quantity: qty,
    });
  }

  const productSales: ProductSaleRow[] = Array.from(productSalesMap.values()).sort((a, b) => {
    if (b.quantity !== a.quantity) return b.quantity - a.quantity;
    const ca = a.code ?? "";
    const cb = b.code ?? "";
    if (ca && cb) return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: "base" });
    return a.name.localeCompare(b.name);
  });
  const totalUnitsSold = productSales.reduce((s, p) => s + p.quantity, 0);
  const maxQty = productSales[0]?.quantity ?? 0;

  const periodLabel = isWeek ? "Week" : isYear ? "Year" : "Month";

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Reports</h1>
        <ReportsFilter />
      </div>

      {/* Period label banner */}
      <div className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white w-fit">
        {label}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <SummaryCard title="Today's Revenue" value={formatCurrency(todayRevenue)} sub={`${todayCount} orders`} icon={<TrendingUp className="h-4 w-4" />} />
        <SummaryCard title="Today's Orders" value={todayCount.toString()} icon={<ShoppingBag className="h-4 w-4" />} />
        <SummaryCard title="Total Customers" value={(customerCount ?? 0).toLocaleString()} icon={<Users className="h-4 w-4" />} />
        <SummaryCard title={`${periodLabel} Revenue`} value={formatCurrency(periodRevenue)} sub={`${periodCount} orders`} icon={<Calendar className="h-4 w-4" />} />
        <SummaryCard title={`${periodLabel} Discounts`} value={formatCurrency(periodDiscount)} icon={<Tag className="h-4 w-4" />} accent={periodDiscount > 0} />
      </div>

      {/* Charts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700">
            {isYear ? "Monthly Revenue" : isWeek ? "Daily Revenue (This Week)" : "Daily Revenue"} — {label}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <RevenueLineChart data={chartData} labelMode={isYear ? "month" : "day"} />
        </CardContent>
      </Card>

      {/* All product sales */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700">
            Product Sales — {label}
          </CardTitle>
          <p className="text-xs text-zinc-400 mt-0.5">
            Drinks and toppings counted separately (e.g. Shiki Midori + Mango Popping Ball = 2 lines).
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {productSales.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-400">No products found</p>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow className="text-xs text-zinc-500">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="w-16">Code</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right w-24">Share</TableHead>
                    <TableHead className="w-40">Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSales.map((row, i) => {
                    const share = totalUnitsSold > 0 ? (row.quantity / totalUnitsSold) * 100 : 0;
                    const barPct = maxQty > 0 ? (row.quantity / maxQty) * 100 : 0;
                    const isZero = row.quantity === 0;
                    return (
                      <TableRow key={row.name} className={`text-sm ${isZero ? "bg-zinc-50/80" : ""}`}>
                        <TableCell className="text-zinc-400 tabular-nums">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs font-bold text-zinc-500">
                          {row.code ?? <span className="text-zinc-300">—</span>}
                        </TableCell>
                        <TableCell className={`font-medium ${isZero ? "text-zinc-400" : "text-zinc-800"}`}>{row.name}</TableCell>
                        <TableCell className="capitalize text-zinc-500 text-xs">{row.category ?? "—"}</TableCell>
                        <TableCell className={`text-right tabular-nums font-semibold ${isZero ? "text-zinc-300" : "text-zinc-900"}`}>
                          {row.quantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-zinc-500 text-xs">
                          {row.quantity > 0 ? `${share.toFixed(1)}%` : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isZero ? "bg-zinc-200" : row.quantity >= maxQty * 0.5 ? "bg-zinc-900" : row.quantity >= maxQty * 0.2 ? "bg-zinc-500" : "bg-zinc-300"}`}
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700">
            {isYear ? "Monthly" : "Daily"} Breakdown — {label}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeRows.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-400">No orders for this period</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs text-zinc-500">
                  <TableHead>{isYear ? "Month" : "Date"}</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right"><span className="flex items-center justify-end gap-1"><Banknote className="h-3 w-3" />Cash</span></TableHead>
                  <TableHead className="text-right"><span className="flex items-center justify-end gap-1"><QrCode className="h-3 w-3" />QR Code</span></TableHead>
                  <TableHead className="text-right"><span className="flex items-center justify-end gap-1"><CreditCard className="h-3 w-3" />Card</span></TableHead>
                  <TableHead className="text-right text-rose-500"><span className="flex items-center justify-end gap-1"><Tag className="h-3 w-3" />Discount</span></TableHead>
                  <TableHead className="text-right font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRows.map((row) => (
                  <TableRow key={row.key} className="text-sm">
                    <TableCell className="font-medium text-zinc-700">{row.label}</TableCell>
                    <TableCell className="text-right text-zinc-500">{row.orders}</TableCell>
                    <TableCell className="text-right tabular-nums text-zinc-600">{row.cash > 0 ? formatCurrency(row.cash) : <span className="text-zinc-300">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums text-zinc-600">{row.qr > 0 ? formatCurrency(row.qr) : <span className="text-zinc-300">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums text-zinc-600">{row.card > 0 ? formatCurrency(row.card) : <span className="text-zinc-300">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums text-rose-500 font-medium">{row.discount > 0 ? `-${formatCurrency(row.discount)}` : <span className="text-zinc-300">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-zinc-900">{formatCurrency(row.total)}</TableCell>
                  </TableRow>
                ))}
                {activeRows.length > 1 && (() => {
                  const t = activeRows.reduce((s, r) => ({
                    orders: s.orders + r.orders, cash: s.cash + r.cash, qr: s.qr + r.qr,
                    card: s.card + r.card, discount: s.discount + r.discount, total: s.total + r.total,
                  }), { orders: 0, cash: 0, qr: 0, card: 0, discount: 0, total: 0 });
                  return (
                    <TableRow className="bg-zinc-50 text-sm font-bold border-t-2 border-zinc-200">
                      <TableCell className="text-zinc-700">Total</TableCell>
                      <TableCell className="text-right text-zinc-700">{t.orders}</TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-700">{t.cash > 0 ? formatCurrency(t.cash) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-700">{t.qr > 0 ? formatCurrency(t.qr) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-700">{t.card > 0 ? formatCurrency(t.card) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-rose-600">{t.discount > 0 ? `-${formatCurrency(t.discount)}` : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-900">{formatCurrency(t.total)}</TableCell>
                    </TableRow>
                  );
                })()}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value, sub, icon, accent }: { title: string; value: string; sub?: string; icon: ReactNode; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500">{title}</p>
          <span className={accent ? "text-rose-400" : "text-zinc-400"}>{icon}</span>
        </div>
        <p className={`mt-2 text-2xl font-bold tabular-nums ${accent ? "text-rose-600" : "text-zinc-900"}`}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
      </CardContent>
    </Card>
  );
}
