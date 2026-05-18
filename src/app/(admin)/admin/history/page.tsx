"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Search, Printer, ChevronDown, ChevronUp,
  Banknote, QrCode, CreditCard, Monitor, LayoutGrid, Ticket,
  CheckCircle2, Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReceiptPrint, { type ReceiptOrder, type ReceiptLineItem } from "@/components/admin/ReceiptPrint";

const SERVICE_CHARGE_PCT = 6;

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
  points_earned: number;
  payment_method: string | null;
  voucher_code: string | null;
  discount_amount: number;
  customer_name: string | null;
  order_items: OrderItem[];
};

type ReceiptState = {
  order: ReceiptOrder;
  items: ReceiptLineItem[];
  customerName?: string;
  paymentMethod?: string;
  tableNumber?: string;
  serviceCharge?: number;
  tableBreakdown?: {
    voucherDiscount: number;
    serviceCharge: number;
    rounding: number;
    payableTotal: number;
  };
};

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-3.5 w-3.5" />,
  qr: <QrCode className="h-3.5 w-3.5" />,
  card: <CreditCard className="h-3.5 w-3.5" />,
};
const PAYMENT_LABELS: Record<string, string> = { cash: "Cash", qr: "QR Code", card: "Card" };

function toLocalDate(d: Date) { return d.toLocaleDateString("en-CA"); }

export default function SalesHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(() => toLocalDate(new Date()));
  const [toDate, setToDate] = useState(() => toLocalDate(new Date()));
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "served">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptState | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const from = new Date(fromDate + "T00:00:00").toISOString();
    const to   = new Date(toDate   + "T23:59:59").toISOString();

    let query = supabase
      .from("orders")
      .select(`
        id, order_number, created_at, status, source, table_number,
        subtotal, total_amount, points_redeemed, points_earned,
        payment_method, voucher_code, discount_amount,
        profiles!customer_id(full_name),
        order_items(id, product_name, unit_price, quantity, subtotal)
      `)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false });

    if (statusFilter === "all") {
      query = query.in("status", ["served", "completed"]);
    } else {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) { toast.error("Failed to load orders"); setLoading(false); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = (data ?? []).map((o: any) => ({
      ...o,
      customer_name: Array.isArray(o.profiles)
        ? (o.profiles[0]?.full_name ?? null)
        : (o.profiles?.full_name ?? null),
      order_items:     o.order_items ?? [],
      discount_amount: o.discount_amount ?? 0,
      points_earned:   o.points_earned  ?? 0,
    }));

    setOrders(mapped);
    setLoading(false);
  }, [fromDate, toDate, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  function openReceipt(order: Order) {
    const isTable = order.source === "table";
    const svc     = isTable ? +(order.subtotal * (SERVICE_CHARGE_PCT / 100)).toFixed(2) : 0;
    const rounding = isTable
      ? +(order.total_amount - (order.subtotal - order.discount_amount) - svc).toFixed(2)
      : 0;

    const items: ReceiptLineItem[] = order.order_items.map(i => ({
      product_id: i.id,
      name:       i.product_name,
      unit_price: i.unit_price,
      quantity:   i.quantity,
      subtotal:   i.subtotal,
    }));

    const receiptOrder: ReceiptOrder = {
      order_number:    order.order_number,
      created_at:      order.created_at,
      subtotal:        order.subtotal,
      total_amount:    order.total_amount,
      points_redeemed: order.points_redeemed ?? 0,
      points_earned:   order.points_earned   ?? 0,
    };

    if (isTable) {
      setReceipt({
        order: receiptOrder,
        items,
        customerName:  order.customer_name ?? undefined,
        paymentMethod: order.payment_method
          ? (PAYMENT_LABELS[order.payment_method] ?? order.payment_method)
          : undefined,
        tableNumber: order.table_number ?? undefined,
        tableBreakdown: {
          voucherDiscount: order.discount_amount ?? 0,
          serviceCharge:   svc,
          rounding,
          payableTotal:    order.total_amount,
        },
      });
    } else {
      const posServiceCharge = +(
        order.total_amount - (order.subtotal - order.discount_amount)
      ).toFixed(2);
      setReceipt({
        order: receiptOrder,
        items,
        customerName:  order.customer_name ?? undefined,
        paymentMethod: order.payment_method
          ? (PAYMENT_LABELS[order.payment_method] ?? order.payment_method)
          : undefined,
        serviceCharge: posServiceCharge > 0 ? posServiceCharge : 0,
      });
    }
  }

  const filtered = orders.filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      (o.customer_name ?? "").toLowerCase().includes(q) ||
      (o.table_number  ?? "").toLowerCase().includes(q) ||
      (o.voucher_code  ?? "").toLowerCase().includes(q)
    );
  });

  const totalRevenue = filtered.reduce((s, o) => s + o.total_amount, 0);

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Sales History</h1>
          <p className="text-sm text-zinc-400">
            {filtered.length} order{filtered.length !== 1 ? "s" : ""} &middot; RM {totalRevenue.toFixed(2)} revenue
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchOrders} className="h-8 gap-1.5 text-xs">
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5">
          <span className="text-xs text-zinc-400">From</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="text-sm font-medium text-zinc-800 focus:outline-none" />
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5">
          <span className="text-xs text-zinc-400">To</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="text-sm font-medium text-zinc-800 focus:outline-none" />
        </div>

        <div className="flex overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {(["all", "completed", "served"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === s
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:bg-zinc-50"
              )}>
              {s === "all" ? "All Paid" : s === "completed" ? "Delivered" : "Pending Serve"}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search order #, customer, table, voucher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Printer className="mb-3 h-10 w-10" />
          <p className="text-sm font-medium">No orders found</p>
          <p className="mt-1 text-xs">Try adjusting the date range or search</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => {
            const isOpen  = expanded === order.id;
            const isTable = order.source === "table";
            return (
              <div key={order.id}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">

                {/* Row header */}
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                >
                  {/* Source badge */}
                  {isTable ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      <LayoutGrid className="h-3 w-3" /> T{order.table_number}
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      <Monitor className="h-3 w-3" /> POS
                    </span>
                  )}

                  {/* Status icon */}
                  {order.status === "completed"
                    ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    : <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400" />}

                  {/* Order number */}
                  <span className="min-w-[110px] font-mono text-sm font-semibold text-zinc-800">
                    {order.order_number}
                  </span>

                  {/* Customer */}
                  <span className="flex-1 truncate text-sm text-zinc-500">
                    {order.customer_name ?? (
                      <span className="italic text-zinc-400">Walk-in</span>
                    )}
                  </span>

                  {/* Voucher */}
                  {order.voucher_code && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                      <Ticket className="h-3 w-3" />{order.voucher_code}
                    </span>
                  )}

                  {/* Payment */}
                  {order.payment_method && (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-zinc-500">
                      {PAYMENT_ICONS[order.payment_method]}
                      <span className="hidden sm:inline">
                        {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
                      </span>
                    </span>
                  )}

                  {/* Total */}
                  <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-900">
                    RM {order.total_amount.toFixed(2)}
                  </span>

                  {/* Time */}
                  <span className="hidden shrink-0 text-xs text-zinc-400 sm:block">
                    {new Date(order.created_at).toLocaleTimeString("en-MY", {
                      hour: "2-digit", minute: "2-digit", hour12: true,
                      timeZone: "Asia/Kuala_Lumpur",
                    })}
                  </span>

                  {isOpen
                    ? <ChevronUp   className="h-4 w-4 shrink-0 text-zinc-400" />
                    : <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />}
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3">
                    {/* Items */}
                    <div className="mb-3 space-y-1">
                      {order.order_items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-zinc-700">
                            {item.quantity}&times; {item.product_name}
                          </span>
                          <span className="tabular-nums text-zinc-500">
                            RM {item.subtotal.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Totals breakdown */}
                    <div className="mb-3 space-y-0.5 border-t border-dashed border-zinc-200 pt-2 text-sm">
                      <div className="flex justify-between text-zinc-500">
                        <span>Subtotal</span>
                        <span>RM {order.subtotal.toFixed(2)}</span>
                      </div>
                      {order.discount_amount > 0 && (
                        <div className="flex items-center justify-between text-violet-600">
                          <span className="flex items-center gap-1">
                            <Ticket className="h-3.5 w-3.5" />
                            {order.voucher_code
                              ? <>Voucher <span className="rounded bg-violet-100 px-1.5 py-0.5 font-mono text-xs">{order.voucher_code}</span></>
                              : "Discount"}
                          </span>
                          <span>-RM {order.discount_amount.toFixed(2)}</span>
                        </div>
                      )}
                      {isTable && (
                        <div className="flex justify-between text-zinc-500">
                          <span>Service charge ({SERVICE_CHARGE_PCT}%)</span>
                          <span>RM {(order.subtotal * (SERVICE_CHARGE_PCT / 100)).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="mt-1 flex justify-between border-t border-zinc-200 pt-1 font-semibold text-zinc-900">
                        <span>Total</span>
                        <span>RM {order.total_amount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Footer: meta + reprint */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-2">
                      <div className="space-y-0.5 text-xs text-zinc-400">
                        <p>
                          {new Date(order.created_at).toLocaleString("en-MY", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit", hour12: true,
                            timeZone: "Asia/Kuala_Lumpur",
                          })}
                        </p>
                        {order.points_earned > 0 && (
                          <p className="font-medium text-emerald-600">
                            +{order.points_earned} pts earned
                          </p>
                        )}
                        {order.status === "served" && (
                          <p className="flex items-center gap-1 font-medium text-amber-500">
                            <Clock className="h-3 w-3" /> Paid &middot; pending food delivery
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1.5"
                        onClick={() => openReceipt(order)}>
                        <Printer className="h-3.5 w-3.5" /> Reprint Receipt
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
          customerName={receipt.customerName}
          paymentMethod={receipt.paymentMethod}
          tableNumber={receipt.tableNumber}
          serviceCharge={receipt.serviceCharge}
          tableBreakdown={receipt.tableBreakdown}
        />
      )}
    </div>
  );
}