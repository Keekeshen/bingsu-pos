import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import RevenueLineChart, {
  type DailyRevenue,
} from "@/components/admin/RevenueLineChart";
import TopProductsBarChart, {
  type TopProduct,
} from "@/components/admin/TopProductsBarChart";
import { TrendingUp, ShoppingBag, Users, Calendar, Tag, Banknote, QrCode, CreditCard } from "lucide-react";

function toMYTDateString(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}

function startOfDay(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0));
}

function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1, 0, 0, 0));
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

function formatCurrency(n: number) {
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatDateShort(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[parseInt(m) - 1]}`;
}

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const supabase = await createClient();
  const now = new Date();

  const todayStart = startOfDay(now).toISOString();
  const monthStart = startOfMonth(now).toISOString();
  const thirtyDaysStart = daysAgo(29).toISOString();

  const [
    { data: todayOrders },
    { data: monthOrders },
    { count: customerCount },
    { data: revenueRaw },
    { data: itemsRaw },
    { data: recentRaw },
    { data: periodOrders },
  ] = await Promise.all([
    supabase.from("orders").select("total_amount, discount_amount").eq("status", "completed").gte("created_at", todayStart),
    supabase.from("orders").select("total_amount, discount_amount").eq("status", "completed").gte("created_at", monthStart),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client"),
    supabase.from("orders").select("created_at, total_amount, payment_method, discount_amount").eq("status", "completed").gte("created_at", thirtyDaysStart).order("created_at", { ascending: true }),
    supabase.from("order_items").select("product_name, quantity"),
    supabase.from("orders").select("order_number, total_amount, points_earned, created_at, payment_method, discount_amount, profiles(full_name)").eq("status", "completed").order("created_at", { ascending: false }).limit(20),
    supabase.from("orders").select("created_at, total_amount, payment_method, discount_amount").eq("status", "completed").gte("created_at", thirtyDaysStart).order("created_at", { ascending: true }),
  ]);

  const todayRevenue = (todayOrders ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const todayCount = todayOrders?.length ?? 0;
  const monthRevenue = (monthOrders ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const monthDiscount = (monthOrders ?? []).reduce((s, o) => s + (o.discount_amount ?? 0), 0);

  // Daily revenue map
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = daysAgo(29 - i);
    dailyMap.set(d.toISOString().split("T")[0], 0);
  }
  for (const order of revenueRaw ?? []) {
    const day = toMYTDateString(order.created_at);
    if (dailyMap.has(day)) dailyMap.set(day, (dailyMap.get(day) ?? 0) + (order.total_amount ?? 0));
  }
  const dailyRevenue: DailyRevenue[] = Array.from(dailyMap.entries()).map(([date, revenue]) => ({ date, revenue }));

  // Top products
  const productMap = new Map<string, number>();
  for (const item of itemsRaw ?? []) {
    const name = item.product_name ?? "Unknown";
    productMap.set(name, (productMap.get(name) ?? 0) + (item.quantity ?? 0));
  }
  const topProducts: TopProduct[] = Array.from(productMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, quantity]) => ({ name, quantity }));

  // Daily breakdown by payment method + discount
  type DayBreakdown = { date: string; cash: number; qr: number; card: number; discount: number; total: number; orders: number };
  const breakdownMap = new Map<string, DayBreakdown>();
  for (let i = 0; i < 30; i++) {
    const d = daysAgo(29 - i);
    const key = d.toISOString().split("T")[0];
    breakdownMap.set(key, { date: key, cash: 0, qr: 0, card: 0, discount: 0, total: 0, orders: 0 });
  }
  for (const o of periodOrders ?? []) {
    const day = toMYTDateString(o.created_at);
    const row = breakdownMap.get(day);
    if (!row) continue;
    row.total += o.total_amount ?? 0;
    row.discount += o.discount_amount ?? 0;
    row.orders += 1;
    if (o.payment_method === "cash") row.cash += o.total_amount ?? 0;
    else if (o.payment_method === "qr") row.qr += o.total_amount ?? 0;
    else if (o.payment_method === "card") row.card += o.total_amount ?? 0;
  }
  // Only days with orders
  const activeDays = Array.from(breakdownMap.values())
    .filter(r => r.orders > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Recent orders
  type RawOrder = {
    order_number: string;
    total_amount: number;
    points_earned: number | null;
    created_at: string;
    payment_method: string | null;
    discount_amount: number | null;
    profiles: { full_name: string } | { full_name: string }[] | null;
  };

  const recentOrders = (recentRaw as RawOrder[] | null ?? []).map((o) => ({
    order_number: o.order_number,
    total_amount: o.total_amount,
    points_earned: o.points_earned ?? 0,
    created_at: o.created_at,
    payment_method: o.payment_method,
    discount_amount: o.discount_amount ?? 0,
    customer_name: Array.isArray(o.profiles) ? (o.profiles[0]?.full_name ?? null) : (o.profiles?.full_name ?? null),
  }));

  const PAYMENT_ICONS: Record<string, ReactNode> = {
    cash: <Banknote className="h-3.5 w-3.5" />,
    qr: <QrCode className="h-3.5 w-3.5" />,
    card: <CreditCard className="h-3.5 w-3.5" />,
  };
  const PAYMENT_LABELS: Record<string, string> = { cash: "Cash", qr: "QR Code", card: "Card" };

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-bold text-zinc-900">Reports</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <SummaryCard title="Today's Revenue" value={formatCurrency(todayRevenue)} sub={`${todayCount} orders`} icon={<TrendingUp className="h-4 w-4" />} />
        <SummaryCard title="Today's Orders" value={todayCount.toString()} icon={<ShoppingBag className="h-4 w-4" />} />
        <SummaryCard title="Total Customers" value={(customerCount ?? 0).toLocaleString()} icon={<Users className="h-4 w-4" />} />
        <SummaryCard title="Month Revenue" value={formatCurrency(monthRevenue)} icon={<Calendar className="h-4 w-4" />} />
        <SummaryCard title="Month Discounts" value={formatCurrency(monthDiscount)} icon={<Tag className="h-4 w-4" />} accent />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-700">Daily Revenue — Last 30 Days</CardTitle></CardHeader>
          <CardContent className="pt-0"><RevenueLineChart data={dailyRevenue} /></CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-700">Top 5 Products by Quantity</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {topProducts.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-zinc-400">No sales data yet</div>
            ) : (
              <TopProductsBarChart data={topProducts} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily payment & discount breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700">Daily Breakdown — Last 30 Days (active days only)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeDays.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-400">No orders in the last 30 days</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs text-zinc-500">
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">
                    <span className="flex items-center justify-end gap-1"><Banknote className="h-3 w-3" />Cash</span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="flex items-center justify-end gap-1"><QrCode className="h-3 w-3" />QR Code</span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="flex items-center justify-end gap-1"><CreditCard className="h-3 w-3" />Card</span>
                  </TableHead>
                  <TableHead className="text-right text-rose-500">
                    <span className="flex items-center justify-end gap-1"><Tag className="h-3 w-3" />Discount</span>
                  </TableHead>
                  <TableHead className="text-right font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeDays.map((row) => (
                  <TableRow key={row.date} className="text-sm">
                    <TableCell className="font-medium text-zinc-700">{formatDateShort(row.date)}</TableCell>
                    <TableCell className="text-right text-zinc-500">{row.orders}</TableCell>
                    <TableCell className="text-right tabular-nums text-zinc-600">{row.cash > 0 ? formatCurrency(row.cash) : <span className="text-zinc-300">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums text-zinc-600">{row.qr > 0 ? formatCurrency(row.qr) : <span className="text-zinc-300">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums text-zinc-600">{row.card > 0 ? formatCurrency(row.card) : <span className="text-zinc-300">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums text-rose-500 font-medium">{row.discount > 0 ? `-${formatCurrency(row.discount)}` : <span className="text-zinc-300">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-zinc-900">{formatCurrency(row.total)}</TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                {activeDays.length > 1 && (() => {
                  const totals = activeDays.reduce((s, r) => ({
                    orders: s.orders + r.orders,
                    cash: s.cash + r.cash,
                    qr: s.qr + r.qr,
                    card: s.card + r.card,
                    discount: s.discount + r.discount,
                    total: s.total + r.total,
                  }), { orders: 0, cash: 0, qr: 0, card: 0, discount: 0, total: 0 });
                  return (
                    <TableRow className="bg-zinc-50 text-sm font-bold border-t-2 border-zinc-200">
                      <TableCell className="text-zinc-700">Total</TableCell>
                      <TableCell className="text-right text-zinc-700">{totals.orders}</TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-700">{totals.cash > 0 ? formatCurrency(totals.cash) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-700">{totals.qr > 0 ? formatCurrency(totals.qr) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-700">{totals.card > 0 ? formatCurrency(totals.card) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-rose-600">{totals.discount > 0 ? `-${formatCurrency(totals.discount)}` : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-900">{formatCurrency(totals.total)}</TableCell>
                    </TableRow>
                  );
                })()}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-700">Recent Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-400">No orders yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs text-zinc-500">
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right text-rose-500">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.order_number} className="text-sm">
                    <TableCell className="font-mono font-medium text-zinc-800">{order.order_number}</TableCell>
                    <TableCell className="text-zinc-600">{order.customer_name ?? <span className="italic text-zinc-400">Walk-in</span>}</TableCell>
                    <TableCell>
                      {order.payment_method ? (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          {PAYMENT_ICONS[order.payment_method]}
                          {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
                        </span>
                      ) : <span className="text-zinc-300 text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {order.discount_amount > 0
                        ? <span className="text-rose-500 font-medium">-{formatCurrency(order.discount_amount)}</span>
                        : <span className="text-zinc-300">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-zinc-900">{formatCurrency(order.total_amount)}</TableCell>
                    <TableCell className="text-right text-xs text-zinc-400">{formatDateTime(order.created_at)}</TableCell>
                  </TableRow>
                ))}
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
