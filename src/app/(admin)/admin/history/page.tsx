"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Search, Printer, ChevronDown, ChevronUp, Banknote, QrCode, CreditCard, Monitor, LayoutGrid, Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ReceiptPrint, { type ReceiptOrder, type ReceiptLineItem } from "@/components/admin/ReceiptPrint";

type OrderItem = {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
};

type Order = {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  source: string | null;
  table_number: string | null;
  subtotal: number;
  total_amount: number;
  points_redeemed: number;
  points_earned?: number;
  payment_method: string | null;
  voucher_code: string | null;
  discount_amount: number;
  customer_name: string | null;
  order_items: OrderItem[];
};

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-3.5 w-3.5" />,
  qr: <QrCode className="h-3.5 w-3.5" />,
  card: <CreditCard className="h-3.5 w-3.5" />,
};
const PAYMENT_LABELS: Record<string, string> = { cash: "Cash", qr: "QR Code", card: "Card" };

function toLocalDate(d: Date) {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}

export default function SalesHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(() => toLocalDate(new Date()));
  const [toDate, setToDate] = useState(() => toLocalDate(new Date()));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ order: ReceiptOrder; items: ReceiptLineItem[]; paymentMethod?: string; tableNumber?: string; serviceCharge?: number } | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const from = new Date(fromDate + "T00:00:00").toISOString();
    const to = new Date(toDate + "T23:59:59").toISOString();

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, order_number, created_at, status, source, table_number,
        subtotal, total_amount, points_redeemed, payment_method,
        voucher_code, discount_amount,
        profiles!customer_id(full_name),
        order_items(id, product_name, unit_price, quantity, subtotal)
      `)
      .eq("status", "completed")
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false });

    if (error) { toast.error("Failed to load orders"); setLoading(false); return; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = (data ?? []).map((o: any) => ({
      ...o,
      customer_name: Array.isArray(o.profiles)
        ? (o.profiles[0]?.full_name ?? null)
        : (o.profiles?.full_name ?? null),
      order_items: o.order_items ?? [],
      discount_amount: o.discount_amount ?? 0,
    }));

    setOrders(mapped);
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const SERVICE_CHARGE_PCT = 6;

  function openReceipt(order: Order) {
    const isTable = order.source === "table";
    const serviceCharge = isTable ? +(order.subtotal * SERVICE_CHARGE_PCT / 100).toFixed(2) : undefined;
    const rounding = serviceCharge !== undefined
      ? +(order.total_amount - order.subtotal - serviceCharge).toFixed(2)
      : undefined;

    const items: ReceiptLineItem[] = order.order_items.map(i => {
      const expected = +(i.unit_price * i.quantity).toFixed(2);
      const discountPct = expected > 0 && i.subtotal < expected - 0.01
        ? Math.round((1 - i.subtotal / expected) * 100)
        : undefined;
      return {
        product_id: i.id,
        name: i.product_name,
        unit_price: i.unit_price,
        quantity: i.quantity,
        subtotal: i.subtotal,
        discountPct,
      };
    });

    setReceipt({
      order: {
        order_number: order.order_number,
        created_at: order.created_at,
        subtotal: order.subtotal,
        total_amount: order.total_amount,
        points_redeemed: order.points_redeemed ?? 0,
        points_earned: 0,
      },
      items,
      paymentMethod: order.payment_method ? (PAYMENT_LABELS[order.payment_method] ?? order.payment_method) : undefined,
      tableNumber: order.table_number ?? undefined,
      serviceCharge,
      ...(rounding !== undefined ? { rounding } : {}),
    });
  }

  const filtered = orders.filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      (o.customer_name ?? "").toLowerCase().includes(q) ||
      (o.table_number ?? "").toLowerCase().includes(q)
    );
  });

  const totalRevenue = filtered.reduce((s, o) => s + o.total_amount, 0);

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Sales History</h1>
          <p className="text-sm text-zinc-400">{filtered.length} orders · RM {totalRevenue.toFixed(2)} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5">
          <span className="text-xs text-zinc-400">From</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="text-sm font-medium text-zinc-800 focus:outline-none" />
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5">
          <span className="text-xs text-zinc-400">To</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="text-sm font-medium text-zinc-800 focus:outline-none" />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search order #, customer, table…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Printer className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium">No orders found</p>
          <p className="text-xs mt-1">Try adjusting the date range or search</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => {
            const isOpen = expanded === order.id;
            return (
              <div key={order.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                {/* Header row */}
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                >
                  {/* Source badge */}
                  {order.source === "table" ? (
                    <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 shrink-0">
                      <LayoutGrid className="h-3 w-3" /> T{order.table_number}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 shrink-0">
                      <Monitor className="h-3 w-3" /> POS
                    </span>
                  )}

                  {/* Order number */}
                  <span className="font-mono text-sm font-semibold text-zinc-800 min-w-[100px]">{order.order_number}</span>

                  {/* Customer */}
                  <span className="text-sm text-zinc-500 flex-1 truncate">
                    {order.customer_name ?? <span className="italic">Walk-in</span>}
                  </span>

                  {/* Voucher badge */}
                  {order.voucher_code && (
                    <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 shrink-0">
                      <Ticket className="h-3 w-3" />{order.voucher_code}
                    </span>
                  )}

                  {/* Payment */}
                  {order.payment_method && (
                    <span className="flex items-center gap-1 text-xs text-zinc-500 shrink-0">
                      {PAYMENT_ICONS[order.payment_method]}
                      {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
                    </span>
                  )}

                  {/* Total */}
                  <span className="text-sm font-bold tabular-nums text-zinc-900 shrink-0">RM {order.total_amount.toFixed(2)}</span>

                  {/* Date */}
                  <span className="text-xs text-zinc-400 shrink-0 hidden sm:block">
                    {new Date(order.created_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </span>

                  {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />}
                </button>

                {/* Expanded items */}
                {isOpen && (
                  <div className="border-t border-zinc-100 px-4 py-3 bg-zinc-50">
                    <div className="space-y-1.5 mb-3">
                      {order.order_items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-zinc-700">{item.quantity}× {item.product_name}</span>
                          <span className="tabular-nums text-zinc-500">RM {item.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Voucher & discount summary */}
                    <div className="space-y-1 border-t border-dashed border-zinc-200 pt-2 mb-3 text-sm">
                      <div className="flex justify-between text-zinc-500">
                        <span>Subtotal</span>
                        <span>RM {order.subtotal.toFixed(2)}</span>
                      </div>
                      {order.voucher_code && (
                        <div className="flex items-center justify-between text-violet-600">
                          <span className="flex items-center gap-1">
                            <Ticket className="h-3.5 w-3.5" />
                            Voucher <span className="font-mono text-xs bg-violet-100 px-1.5 py-0.5 rounded">{order.voucher_code}</span>
                          </span>
                          <span className="font-medium">-RM {order.discount_amount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-zinc-900">
                        <span>Total</span>
                        <span>RM {order.total_amount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-200 pt-2">
                      <div className="text-xs text-zinc-400">
                        {new Date(order.created_at).toLocaleString("en-MY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => openReceipt(order)}>
                        <Printer className="h-3.5 w-3.5" /> Print Receipt
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Receipt dialog */}
      {receipt && (
        <ReceiptPrint
          open={!!receipt}
          onClose={() => setReceipt(null)}
          order={receipt.order}
          items={receipt.items}
        />
      )}
    </div>
  );
}
