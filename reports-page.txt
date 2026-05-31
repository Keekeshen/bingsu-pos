import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import RevenueLineChart, { type DailyRevenue } from "@/components/admin/RevenueLineChart";
import TopProductsBarChart, { type TopProduct } from "@/components/admin/TopProductsBarChart";
import ReportsFilter from "@/components/admin/ReportsFilter";
import { TrendingUp, ShoppingBag, Users, Calendar, Banknote, QrCode, CreditCard, HelpCircle } from "lucide-react";

function toDateString(d: Date) { return d.toISOString().split("T")[0]; }
function startOfDay(d: Date) { return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)); }
function startOfMonth(d: Date) { return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1, 0, 0, 0)); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return startOfDay(d); }
function formatCurrency(n: number) { return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-MY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();

  const fromDate = params.from ? startOfDay(new Date(params.from)) : daysAgo(29);
  const toDate = params.to ? new Date(params.to + "T23:59:59Z") : now;
  const fromStr = toDateString(fromDate);
  const toStr = toDateString(toDate);

  const monthStart = startOfMonth(now).toISOString();
  const todayStart = startOfDay(now).toISOString();

  const supabase = await createClient();

  const [
    { data: rangeOrders },
    { data: todayOrders },
    { data: monthOrders },
    { count: customerCount },
    { data: itemsRaw },
    { data: recentRaw },
  ] = await Promise.all([
    supabase.from("orders").select("total_amount, payment_method, created_at").eq("status", "completed").gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString()).order("created_at", { ascending: true }),
    supabase.from("orders").select("total_amount").eq("status", "completed").gte("created_at", todayStart),
    supabase.from("orders").select("total_amount").eq("status", "completed").gte("created_at", monthStart),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client"),
    supabase.from("order_items").select("product_name, quantity").gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString()),
    supabase.from("orders").select("order_number, total_amount, points_earned, created_at, payment_method, table_number, source, profiles(full_name)").eq("status", "completed").gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString()).order("created_at", { ascending: false }).limit(30),
  ]);

  const rangeRevenue = (rangeOrders ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const rangeCount = rangeOrders?.length ?? 0;
  const todayRevenue = (todayOrders ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const monthRevenue = (monthOrders ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0);

  // Daily revenue for chart
  const dailyMap = new Map<string, number>();
  let cursor = new Date(fromDate);
  while (cursor <= toDate) {
    dailyMap.set(toDateString(cursor), 0);
    cursor = new Date(cursor.getTime() + 86400000);
  }
  for (const order of rangeOrders ?? []) {
    const day = toDateString(new Date(order.created_at));
    if (dailyMap.has(day)) dailyMap.set(day, (dailyMap.get(day) ?? 0) + (order.total_amount ?? 0));
  }
  const dailyRevenue: DailyRevenue[] = Array.from(dailyMap.entries()).map(([date, revenue]) => ({ date, revenue }));

  // Payment breakdown
  const paymentMap: Record<string, { total: number; count: number }> = {};
  for (const order of rangeOrders ?? []) {
    const method = order.payment_method ?? "unknown";
    if (!paymentMap[method]) paymentMap[method] = { total: 0, count: 0 };
    paymentMap[method].total += order.total_amount ?? 0;
    paymentMap[method].count += 1;
  }

  // Top products
  const productMap = new Map<string, number>();
  for (const item of itemsRaw ?? []) {
    const name = item.product_name ?? "Unknown";
    productMap.set(name, (productMap.get(name) ?? 0) + (item.quantity ?? 0));
  }
  const topProducts: TopProduct[] = Array.from(productMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, quantity]) => ({ name, quantity }));

  type RawOrder = {
    order_number: string; total_amount: number; points_earned: number | null;
    created_at: string; payment_method: string | null; table_number: string | null; source: string | null;
    profiles: { full_name: string } | { full_name: string }[] | null;
  };

  const recentOrders = (recentRaw as RawOrder[] | null ?? []).map(o => ({
    order_number: o.order_number,
    total_amount: o.total_amount,
    points_earned: o.points_earned ?? 0,
    created_at: o.created_at,
    payment_method: o.payment_method,
    table_number: o.table_number,
    source: o.source,
    customer_name: Array.isArray(o.profiles) ? (o.profiles[0]?.full_name ?? null) : (o.profiles?.full_name ?? null),
  }));

  const paymentIcons: Record<string, ReactNode> = {
    cash: <Banknote className="h-4 w-4 text-emerald-600" />,
    qr: <QrCode className="h-4 w-4 text-blue-600" />,
    card: <CreditCard className="h-4 w-4 text-purple-600" />,
  };
  const paymentLabels: Record<string, string> = { cash: "Cash", qr: "QR Code", card: "Card", unknown: "Other" };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Reports</h1>
        <ReportsFilter defaultFrom={fromStr} defaultTo={toStr} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <SummaryCard title="Period Revenue" value={formatCurrency(rangeRevenue)} sub={`${rangeCount} orders`} icon={<TrendingUp className="h-4 w-4" />} />
        <SummaryCard title="Today's Revenue" value={formatCurrency(todayRevenue)} icon={<ShoppingBag className="h-4 w-4" />} />
        <SummaryCard title="Total Customers" value={(customerCount ?? 0).toLocaleString()} icon={<Users className="h-4 w-4" />} />
        <SummaryCard title="Month Revenue" value={formatCurrency(monthRevenue)} icon={<Calendar className="h-4 w-4" />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-700">
              Daily Revenue — {fromStr === toStr ? fromStr : `${fromStr} to ${toStr}`}
            </CardTitle>
          </CardHeader>
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

      {/* Payment breakdown */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-700">Payment Breakdown</CardTitle></CardHeader>
        <CardContent>
          {Object.keys(paymentMap).length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-400">No payment data for this period</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(paymentMap).sort((a, b) => b[1].total - a[1].total).map(([method, { total, count }]) => (
                <div key={method} className="flex flex-col gap-1 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {paymentIcons[method] ?? <HelpCircle className="h-4 w-4 text-zinc-400" />}
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{paymentLabels[method] ?? method}</span>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-zinc-900">{formatCurrency(total)}</p>
                  <p className="text-xs text-zinc-400">{count} order{count !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-700">Orders in Period</CardTitle></CardHeader>
        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-400">No orders in this period</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs text-zinc-500">
                  <TableHead>Order #</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.order_number} className="text-sm">
                    <TableCell className="font-mono font-medium text-zinc-800">{order.order_number}</TableCell>
                    <TableCell>
                      {order.source === "table"
                        ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Table {order.table_number}</span>
                        : <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">POS</span>}
                    </TableCell>
                    <TableCell className="text-zinc-600">{order.customer_name ?? <span className="italic text-zinc-400">Walk-in</span>}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs">
                        {order.payment_method ? (
                          <>{paymentIcons[order.payment_method] ?? <HelpCircle className="h-3 w-3" />}<span>{paymentLabels[order.payment_method] ?? order.payment_method}</span></>
                        ) : <span className="text-zinc-400">—</span>}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-zinc-800">{formatCurrency(order.total_amount)}</TableCell>
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

function SummaryCard({ title, value, sub, icon }: { title: string; value: string; sub?: string; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500">{title}</p>
          <span className="text-zinc-400">{icon}</span>
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
      </CardContent>
    </Card>
  );
}
