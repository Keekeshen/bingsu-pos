"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCheck, X, RefreshCw, Clock, ArrowLeft, Banknote, QrCode, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ReceiptPrint, { ReceiptOrder, ReceiptLineItem } from "@/components/admin/ReceiptPrint";

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  total_amount: number;
  created_at: string;
  order_items: OrderItem[];
};

type Props = {
  tableNumber: string;
  onClose: () => void;
  onOrdersUpdated: () => void;
};

const SERVICE_CHARGE_PCT = 10;

export default function TableOrderView({ tableNumber, onClose, onOrdersUpdated }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [view, setView] = useState<"orders" | "checkout">("orders");
  const [paymentType, setPaymentType] = useState<"cash" | "qr" | "card" | null>(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [charging, setCharging] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    order: ReceiptOrder;
    items: ReceiptLineItem[];
    paymentMethod: string;
    amountPaid: number;
    change: number;
    tableNumber: string;
    serviceCharge: number;
    rounding: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, status, subtotal, total_amount, created_at, order_items(id, product_name, quantity, unit_price, subtotal)")
      .eq("source", "table")
      .eq("table_number", tableNumber)
      .in("status", ["pending", "served"])
      .order("created_at", { ascending: true });
    if (error) { toast.error("Failed to load orders"); setLoading(false); return; }
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }, [tableNumber]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`table-orders-${tableNumber}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `table_number=eq.${tableNumber}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tableNumber, load]);

  const pending = orders.filter(o => o.status === "pending");
  const served = orders.filter(o => o.status === "served");
  const allItems = orders.flatMap(o => o.order_items);
  const subtotal = +allItems.reduce((s, i) => s + i.unit_price * i.quantity, 0).toFixed(2);
  const serviceCharge = +(subtotal * SERVICE_CHARGE_PCT / 100).toFixed(2);
  const rawTotal = +(subtotal + serviceCharge).toFixed(2);
  const rounded = Math.round(rawTotal * 20) / 20;
  const rounding = +(rounded - rawTotal).toFixed(2);
  const total = rounded;

  async function markServed(orderId: string) {
    setMarkingId(orderId);
    const supabase = createClient();
    const { error } = await supabase.from("orders").update({ status: "served" }).eq("id", orderId);
    setMarkingId(null);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Marked as served");
    load(); onOrdersUpdated();
  }

  async function markAllServed() {
    if (!pending.length) return;
    const supabase = createClient();
    const { error } = await supabase.from("orders").update({ status: "served" }).in("id", pending.map(o => o.id));
    if (error) { toast.error("Failed to update"); return; }
    toast.success("All orders marked as served");
    load(); onOrdersUpdated();
  }

  async function processPayment() {
    if (!paymentType) { toast.error("Select a payment method"); return; }
    const paid = paymentType === "cash" ? parseFloat(amountPaid) : total;
    if (paymentType === "cash" && (isNaN(paid) || paid < total)) {
      toast.error(`Minimum RM ${total.toFixed(2)}`); return;
    }
    setCharging(true);
    try {
      const res = await fetch("/api/table-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_number: tableNumber, payment_method: paymentType, amount_paid: paid }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Checkout failed"); return; }

      const receiptItems: ReceiptLineItem[] = allItems.map(i => ({
        product_id: i.id,
        name: i.product_name,
        unit_price: i.unit_price,
        quantity: i.quantity,
        subtotal: +(i.unit_price * i.quantity).toFixed(2),
      }));
      setReceiptData({
        order: { order_number: data.order_number, created_at: new Date().toISOString(), subtotal, total_amount: total, points_redeemed: 0, points_earned: 0 },
        items: receiptItems,
        paymentMethod: paymentType === "cash" ? "Cash" : paymentType === "qr" ? "QR Code" : "Card",
        amountPaid: paid,
        change: +(paid - total).toFixed(2),
        tableNumber,
        serviceCharge,
        rounding,
      });
      setReceiptOpen(true);
      toast.success("Payment processed!");
      onOrdersUpdated();
    } finally {
      setCharging(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-zinc-500">Loading…</div>;

  // ── Checkout view ──────────────────────────────────────────────────────────
  if (view === "checkout") {
    const paidNum = parseFloat(amountPaid);
    const change = paymentType === "cash" && !isNaN(paidNum) && paidNum >= total ? +(paidNum - total).toFixed(2) : null;
    const canCharge = !!paymentType && (paymentType !== "cash" || (!isNaN(paidNum) && paidNum >= total));

    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
          <button onClick={() => setView("orders")} className="rounded p-1 text-zinc-400 hover:bg-zinc-100">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Table {tableNumber} — Payment</h2>
            <p className="text-xs text-zinc-400">RM {total.toFixed(2)} due</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded p-1 text-zinc-400 hover:bg-zinc-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Order summary */}
          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Order Summary</p>
            <div className="space-y-1.5">
              {allItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-zinc-700">{item.quantity}× {item.product_name}</span>
                  <span className="tabular-nums text-zinc-600">RM {(item.unit_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-2" />
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-zinc-500"><span>Subtotal</span><span>RM {subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-zinc-500"><span>Service Charge ({SERVICE_CHARGE_PCT}%)</span><span>RM {serviceCharge.toFixed(2)}</span></div>
              {rounding !== 0 && <div className="flex justify-between text-sm text-zinc-500"><span>Rounding</span><span>RM {rounding.toFixed(2)}</span></div>}
              <div className="flex justify-between text-base font-bold text-zinc-900 pt-1"><span>Total</span><span>RM {total.toFixed(2)}</span></div>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {(["cash", "qr", "card"] as const).map(t => (
                <button key={t} onClick={() => setPaymentType(t)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 transition-all ${paymentType === t ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"}`}>
                  {t === "cash" ? <Banknote className="h-5 w-5" /> : t === "qr" ? <QrCode className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                  <span className="text-xs font-medium">{t === "cash" ? "Cash" : t === "qr" ? "QR Code" : "Card"}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash input */}
          {paymentType === "cash" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Amount Received (RM)</p>
              <input
                type="number" min={total} step="0.10" value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                placeholder={total.toFixed(2)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              {change !== null && (
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                  <span className="text-sm font-semibold text-emerald-700">Change</span>
                  <span className="text-lg font-bold text-emerald-700">RM {change.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 px-4 py-3">
          <Button className="w-full h-12 text-base font-semibold" disabled={!canCharge || charging} onClick={processPayment}>
            {charging ? "Processing…" : `Charge RM ${total.toFixed(2)}`}
          </Button>
        </div>

        {receiptData && (
          <ReceiptPrint
            open={receiptOpen}
            onClose={() => { setReceiptOpen(false); onClose(); }}
            order={receiptData.order}
            items={receiptData.items}
            paymentMethod={receiptData.paymentMethod}
            amountPaid={receiptData.amountPaid}
            change={receiptData.change}
            tableNumber={receiptData.tableNumber}
            serviceCharge={receiptData.serviceCharge}
            rounding={receiptData.rounding}
          />
        )}
      </div>
    );
  }

  // ── Orders view ────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">Table {tableNumber}</h2>
          <p className="text-xs text-zinc-400">{orders.length} round{orders.length !== 1 ? "s" : ""} · RM {subtotal.toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={load} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100"><RefreshCw className="h-3.5 w-3.5" /></button>
          <button onClick={onClose} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
            <Clock className="h-8 w-8 mb-2" />
            <p className="text-sm">No active orders.</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600">Kitchen — Preparing ({pending.length})</p>
                <div className="space-y-2">
                  {pending.map((order, idx) => (
                    <div key={order.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-amber-800">Round {idx + 1} · {order.order_number}</span>
                        <span className="text-xs text-amber-600">{new Date(order.created_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <ul className="space-y-1 mb-2">
                        {order.order_items.map(item => (
                          <li key={item.id} className="flex justify-between text-sm">
                            <span className="text-zinc-800">{item.quantity}× {item.product_name}</span>
                            <span className="tabular-nums text-zinc-500">RM {item.subtotal.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-semibold text-zinc-700">RM {order.total_amount.toFixed(2)}</span>
                        <Button size="sm" disabled={markingId === order.id} onClick={() => markServed(order.id)}
                          className="h-7 text-xs bg-zinc-900 hover:bg-zinc-700 text-white">
                          <CheckCheck className="mr-1 h-3 w-3" />
                          {markingId === order.id ? "Saving…" : "Served"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {served.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">Served — Awaiting Payment ({served.length})</p>
                <div className="space-y-2">
                  {served.map((order, idx) => (
                    <div key={order.id} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-emerald-700">Round {pending.length + idx + 1} · {order.order_number}</span>
                        <span className="text-xs text-emerald-500">{new Date(order.created_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <ul className="space-y-0.5">
                        {order.order_items.map(item => (
                          <li key={item.id} className="flex justify-between text-xs text-zinc-500">
                            <span>{item.quantity}× {item.product_name}</span>
                            <span className="tabular-nums">RM {item.subtotal.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-zinc-200 px-4 py-3 space-y-2">
        {pending.length > 0 && (
          <Button variant="outline" className="w-full h-10 text-sm" onClick={markAllServed}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark All as Served
          </Button>
        )}
        {served.length > 0 && (
          <Button className="w-full h-11 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setView("checkout")}>
            Process Payment · RM {total.toFixed(2)}
          </Button>
        )}
      </div>
    </div>
  );
}
