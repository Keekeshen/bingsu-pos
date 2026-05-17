"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCheck, X, RefreshCw, Clock, ArrowLeft, Banknote, QrCode, CreditCard, Ticket, UserRound, UserSearch } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import ReceiptPrint, { ReceiptOrder, ReceiptLineItem } from "@/components/admin/ReceiptPrint";
import VoucherScanner from "@/components/admin/VoucherScanner";
import CustomerScanner, { ScannedCustomer } from "@/components/admin/CustomerScanner";
import { computeVoucherDiscount, tableBillTotals, TABLE_SERVICE_CHARGE_PCT } from "@/lib/voucher-utils";

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
  customer_id: string | null;
  order_items: OrderItem[];
};

type VoucherData = {
  id: string;
  code: string;
  label: string;
  discount_type: string;
  discount_value: number;
};

type LinkedCustomer = { id: string; full_name: string; loyalty_points: number; phone: string | null };

type Props = {
  tableNumber: string;
  onClose: () => void;
  onOrdersUpdated: () => void;
};

export default function TableOrderView({ tableNumber, onClose, onOrdersUpdated }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [view, setView] = useState<"orders" | "checkout">("checkout");
  const [paymentType, setPaymentType] = useState<"cash" | "qr" | "card" | null>(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [charging, setCharging] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [voucherInput, setVoucherInput] = useState("");
  const [voucher, setVoucher] = useState<VoucherData | null>(null);
  const [voucherBusy, setVoucherBusy] = useState(false);

  // manually-linked customer (for loyalty / receipt name)
  const [linkedCustomer, setLinkedCustomer] = useState<LinkedCustomer | null>(null);
  const [customerInput, setCustomerInput] = useState("");
  const [customerBusy, setCustomerBusy] = useState(false);

  // customers from signed-in orders
  const [orderCustomerNames, setOrderCustomerNames] = useState<string[]>([]);

  const [receiptData, setReceiptData] = useState<{
    order: ReceiptOrder;
    items: ReceiptLineItem[];
    guestLabel: string;
    tableBreakdown: { voucherDiscount: number; serviceCharge: number; rounding: number; payableTotal: number };
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, status, subtotal, total_amount, created_at, customer_id, order_items(id, product_name, quantity, unit_price, subtotal)")
      .eq("source", "table")
      .eq("table_number", tableNumber)
      .in("status", ["pending", "served"])   // pending=unpaid, served=paid pending delivery
      .order("created_at", { ascending: true });
    if (error) { toast.error("Failed to load orders"); setLoading(false); return; }

    const rows = (data ?? []) as Order[];
    setOrders(rows);

    // separately fetch names for signed-in orders (avoids RLS join issues)
    const customerIds = Array.from(new Set(rows.filter(o => o.customer_id).map(o => o.customer_id as string)));
    if (customerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", customerIds);
      if (profiles?.length) {
        const nameMap: Record<string, string> = {};
        profiles.forEach((p: { id: string; full_name: string }) => { nameMap[p.id] = p.full_name; });
        const names = Array.from(new Set(customerIds.map(id => nameMap[id]).filter(Boolean)));
        setOrderCustomerNames(names);
      }
    } else {
      setOrderCustomerNames([]);
    }

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
  const basketSubtotal = +allItems.reduce((s, i) => s + i.unit_price * i.quantity, 0).toFixed(2);
  const voucherDiscountRaw = voucher
    ? computeVoucherDiscount(basketSubtotal, { discount_type: voucher.discount_type, discount_value: voucher.discount_value })
    : 0;
  const bill = tableBillTotals(basketSubtotal, voucherDiscountRaw);
  const total = bill.total;

  // All known guest names (from orders + manually linked)
  const allGuestLabels = Array.from(new Set([
    ...orderCustomerNames,
    ...(linkedCustomer ? [linkedCustomer.full_name] : []),
  ]));

  async function lookupCustomer() {
    const q = customerInput.trim();
    if (!q) return;
    setCustomerBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, loyalty_points, phone")
      .or(`phone.eq.${q},id.eq.${q}`)
      .eq("role", "client")
      .single();
    setCustomerBusy(false);
    if (error || !data) { toast.error("Customer not found"); return; }
    setLinkedCustomer(data as LinkedCustomer);
    setCustomerInput("");
    toast.success(`Linked: ${data.full_name}`);
  }

  function onCustomerScanned(c: ScannedCustomer) {
    setLinkedCustomer({ id: c.id, full_name: c.full_name, loyalty_points: c.loyalty_points, phone: c.phone });
    toast.success(`Linked: ${c.full_name}`);
  }

  async function applyVoucherCode(code: string) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setVoucherBusy(true);
    try {
      const res = await fetch(`/api/voucher?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Invalid voucher"); return; }
      setVoucher(data.voucher);
      setVoucherInput(trimmed);
      toast.success(`Voucher applied: ${data.voucher.label}`);
    } finally {
      setVoucherBusy(false);
    }
  }

  function removeVoucher() { setVoucher(null); setVoucherInput(""); }

  async function markDelivered(orderId: string) {
    setMarkingId(orderId);
    const supabase = createClient();
    const { error } = await supabase.from("orders").update({ status: "completed" }).eq("id", orderId);
    setMarkingId(null);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Order delivered!");
    load(); onOrdersUpdated();
  }

  async function markAllDelivered() {
    if (!served.length) return;
    const supabase = createClient();
    const { error } = await supabase.from("orders").update({ status: "completed" }).in("id", served.map(o => o.id));
    if (error) { toast.error("Failed to update"); return; }
    toast.success("All orders delivered!");
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
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/table-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          table_number: tableNumber,
          payment_method: paymentType,
          amount_paid: paid,
          voucher_code: voucher?.code ?? null,
          discount_amount: voucherDiscountRaw,
          customer_id: linkedCustomer?.id ?? null,
        }),
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

      const guestLabel = allGuestLabels.length > 0 ? allGuestLabels.join(", ") : "Walk-in";

      setReceiptData({
        order: {
          order_number: data.order_number,
          created_at: new Date().toISOString(),
          subtotal: data.subtotal_before_discount,
          total_amount: data.total,
          points_redeemed: 0,
          points_earned: data.points_earned ?? 0,
        },
        items: receiptItems,
        guestLabel,
        tableBreakdown: {
          voucherDiscount: data.voucher_discount ?? 0,
          serviceCharge: data.service_charge ?? 0,
          rounding: data.rounding_adjustment ?? 0,
          payableTotal: data.total,
        },
      });
      setReceiptOpen(true);
      toast.success("Payment processed!");
      setVoucher(null);
      setVoucherInput("");
      onOrdersUpdated();
    } finally {
      setCharging(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-zinc-500">Loading…</div>;

  // ── Orders view (kitchen status + mark served) ─────────────────────────────
  if (view === "orders") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setView("checkout")} className="rounded p-1 text-zinc-400 hover:bg-zinc-100">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h2 className="text-sm font-bold text-zinc-900">Table {tableNumber} — Kitchen</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{orders.length} round{orders.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={load} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100"><RefreshCw className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={onClose} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100"><X className="h-3.5 w-3.5" /></button>
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
              {/* Pending payment – awaiting checkout */}
              {pending.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600">Pending Payment ({pending.length})</p>
                  <div className="space-y-2">
                    {pending.map((order, idx) => (
                      <div key={order.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-amber-800">Round {idx + 1} · {order.order_number}</span>
                          <span className="text-xs text-amber-600">{new Date(order.created_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <ul className="space-y-1">
                          {order.order_items.map(item => (
                            <li key={item.id} className="flex justify-between text-sm">
                              <span className="text-zinc-800">{item.quantity}x {item.product_name}</span>
                              <span className="tabular-nums text-zinc-500">RM {item.subtotal.toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Paid – awaiting delivery to table */}
              {served.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-600">Paid – Pending Serve ({served.length})</p>
                  <div className="space-y-2">
                    {served.map((order, idx) => (
                      <div key={order.id} className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-violet-700">Round {pending.length + idx + 1} · {order.order_number}</span>
                          <span className="text-xs text-violet-500">{new Date(order.created_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <ul className="space-y-0.5 mb-2">
                          {order.order_items.map(item => (
                            <li key={item.id} className="flex justify-between text-xs text-zinc-600">
                              <span>{item.quantity}x {item.product_name}</span>
                              <span className="tabular-nums">RM {item.subtotal.toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-semibold text-zinc-700">RM {order.total_amount.toFixed(2)}</span>
                          <Button size="sm" disabled={markingId === order.id} onClick={() => markDelivered(order.id)}
                            className="h-7 text-xs bg-violet-700 hover:bg-violet-800 text-white">
                            <CheckCheck className="mr-1 h-3 w-3" />
                            {markingId === order.id ? "Saving…" : "Delivered"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-zinc-200 px-4 py-3 space-y-2">
          {served.length > 0 && (
            <Button className="w-full h-10 text-sm bg-violet-700 hover:bg-violet-800 text-white" onClick={markAllDelivered}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark All as Delivered
            </Button>
          )}
          {pending.length > 0 && (
            <Button variant="outline" className="w-full h-10 text-sm" onClick={() => setView("checkout")}>
              Process Payment ({pending.length} round{pending.length !== 1 ? "s" : ""})
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Checkout / Payment view (default) ──────────────────────────────────────
  const paidNum = parseFloat(amountPaid);
  const change = paymentType === "cash" && !isNaN(paidNum) && paidNum >= total ? +(paidNum - total).toFixed(2) : null;
  const canCharge = !!paymentType && (paymentType !== "cash" || (!isNaN(paidNum) && paidNum >= total));

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-zinc-900">Table {tableNumber} — Payment</h2>
          {allGuestLabels.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <UserRound className="h-3 w-3 text-zinc-400 shrink-0" />
              {allGuestLabels.map(n => (
                <span key={n} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">{n}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={() => setView("orders")} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100" title="View kitchen orders">
            <Clock className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={load} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100"><RefreshCw className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={onClose} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Order summary */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
            <Clock className="h-8 w-8 mb-2" />
            <p className="text-sm">No active orders for this table.</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-zinc-200 bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Order Summary</p>
              <div className="space-y-1.5">
                {allItems.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="flex justify-between text-sm">
                    <span className="text-zinc-700">{item.quantity}x {item.product_name}</span>
                    <span className="tabular-nums text-zinc-600">RM {(item.unit_price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-2" />
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-zinc-500"><span>Subtotal</span><span className="tabular-nums">RM {basketSubtotal.toFixed(2)}</span></div>
                {voucherDiscountRaw > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600"><span>Voucher{voucher?.label ? ` (${voucher.label})` : ""}</span><span className="tabular-nums">-RM {voucherDiscountRaw.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between text-sm text-zinc-500"><span>After voucher</span><span className="tabular-nums">RM {bill.taxableSubtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-zinc-500"><span>Service charge ({TABLE_SERVICE_CHARGE_PCT}%)</span><span className="tabular-nums">RM {bill.serviceCharge.toFixed(2)}</span></div>
                {bill.rounding !== 0 && <div className="flex justify-between text-sm text-zinc-500"><span>Rounding</span><span className="tabular-nums">{bill.rounding >= 0 ? "+" : ""}RM {bill.rounding.toFixed(2)}</span></div>}
                <div className="flex justify-between text-base font-bold text-zinc-900 pt-1"><span>Total Due</span><span className="tabular-nums">RM {total.toFixed(2)}</span></div>
              </div>
              {pending.length > 0 && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <p className="text-xs text-amber-700">{pending.length} round{pending.length !== 1 ? "s" : ""} still preparing</p>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setView("orders")}>
                    <Clock className="mr-1 h-3 w-3" /> View
                  </Button>
                </div>
              )}
            </div>

            {/* Customer */}
            <div className="rounded-xl border border-zinc-200 bg-white p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Customer (optional)</p>
              {linkedCustomer ? (
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{linkedCustomer.full_name}</p>
                    <p className="text-xs text-zinc-400">{linkedCustomer.loyalty_points.toLocaleString()} pts{linkedCustomer.phone ? ` · ${linkedCustomer.phone}` : ""}</p>
                  </div>
                  <button type="button" onClick={() => setLinkedCustomer(null)} className="text-zinc-400 hover:text-zinc-700"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Phone or customer ID"
                    value={customerInput}
                    onChange={e => setCustomerInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && lookupCustomer()}
                    className="h-9 text-sm"
                  />
                  <Button size="sm" variant="outline" className="h-9 shrink-0 px-3" onClick={lookupCustomer} disabled={customerBusy || !customerInput.trim()}>
                    {customerBusy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" /> : <UserSearch className="h-4 w-4" />}
                  </Button>
                  <CustomerScanner onCustomerFound={onCustomerScanned} />
                </div>
              )}
            </div>

            {/* Voucher */}
            <div className="rounded-xl border border-zinc-200 bg-white p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Voucher</p>
              {voucher ? (
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 min-w-0 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <Ticket className="h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-emerald-800">{voucher.label}</p>
                      <p className="truncate font-mono text-[10px] text-emerald-600">{voucher.code}</p>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={removeVoucher}>Remove</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={voucherInput}
                    onChange={e => setVoucherInput(e.target.value.toUpperCase())}
                    placeholder="Voucher code"
                    className="h-9 text-xs"
                    onKeyDown={e => e.key === "Enter" && applyVoucherCode(voucherInput)}
                  />
                  <Button type="button" size="sm" className="h-9 shrink-0 px-3" variant="outline" disabled={voucherBusy} onClick={() => applyVoucherCode(voucherInput)}>Apply</Button>
                  <VoucherScanner onCodeScanned={applyVoucherCode} />
                </div>
              )}
            </div>

            {/* Payment method */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {(["cash", "qr", "card"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setPaymentType(t)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 transition-all ${paymentType === t ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"}`}>
                    {t === "cash" ? <Banknote className="h-5 w-5" /> : t === "qr" ? <QrCode className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                    <span className="text-xs font-medium">{t === "cash" ? "Cash" : t === "qr" ? "QR Code" : "Card"}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cash amount */}
            {paymentType === "cash" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Amount Received (RM)</p>
                <Input type="number" min={total} step="0.10" value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)} placeholder={total.toFixed(2)} className="text-xl font-bold" />
                {change !== null && (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <span className="text-sm font-semibold text-emerald-700">Change</span>
                    <span className="text-lg font-bold text-emerald-700">RM {change.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {orders.length > 0 && (
        <div className="border-t border-zinc-200 px-4 py-3">
          <Button className="w-full h-12 text-base font-semibold" disabled={!canCharge || charging} onClick={processPayment}>
            {charging ? "Processing…" : `Charge RM ${total.toFixed(2)}`}
          </Button>
        </div>
      )}

      {receiptData && (
        <ReceiptPrint
          open={receiptOpen}
          onClose={() => { setReceiptOpen(false); setReceiptData(null); onClose(); }}
          order={receiptData.order}
          items={receiptData.items}
          customerName={`Table ${tableNumber} · ${receiptData.guestLabel}`}
          tableBreakdown={receiptData.tableBreakdown}
        />
      )}
    </div>
  );
}
