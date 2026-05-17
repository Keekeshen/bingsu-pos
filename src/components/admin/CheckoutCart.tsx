"use client";

import { useState, useRef } from "react";
import { Minus, Plus, Trash2, UserSearch, X, Banknote, QrCode, CreditCard, Ticket } from "lucide-react";
import { toast } from "sonner";
import type { CartItem } from "@/lib/hooks/useCart";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReceiptPrint, { type ReceiptOrder, type ReceiptLineItem } from "@/components/admin/ReceiptPrint";
import CustomerScanner, { type ScannedCustomer } from "@/components/admin/CustomerScanner";
import VoucherScanner from "@/components/admin/VoucherScanner";

type Customer = { id: string; full_name: string; phone: string | null; loyalty_points: number };
type VoucherData = { id: string; code: string; label: string; discount_type: string; discount_value: number; description: string | null; type: string };

type PendingReceipt = {
  tableNumber?: string;
  order: ReceiptOrder;
  items: ReceiptLineItem[];
  customerName?: string;
  paymentMethod: string;
  amountPaid: number;
  change: number;
};

type Props = {
  items: CartItem[];
  subtotal: number;
  total: number;
  itemCount: number;
  onUpdateQuantity: (product_id: string, quantity: number) => void;
  onRemoveItem: (product_id: string) => void;
  onClearCart: () => void;
};

const PAYMENT_OPTIONS = [
  { id: "cash" as const, label: "Cash", icon: Banknote },
  { id: "qr" as const, label: "QR Code", icon: QrCode },
  { id: "card" as const, label: "Card", icon: CreditCard },
];

export default function CheckoutCart({ items, subtotal, total, onUpdateQuantity, onRemoveItem, onClearCart }: Props) {
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [charging, setCharging] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "qr" | "card" | null>(null);
  const [amountReceived, setAmountReceived] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucher, setVoucher] = useState<VoucherData | null>(null);
  const [lookingUpVoucher, setLookingUpVoucher] = useState(false);
  const [pending, setPending] = useState<PendingReceipt | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const voucherDiscount = voucher
    ? voucher.discount_type === "fixed"
      ? Math.min(voucher.discount_value, total)
      : voucher.discount_type === "percentage"
        ? +(total * voucher.discount_value / 100).toFixed(2)
        : 0
    : 0;
  const isFreeItem = voucher?.discount_type === "free_item";
  const discountedTotal = Math.max(0, +(total - voucherDiscount).toFixed(2));

  const receivedNum = parseFloat(amountReceived);
  const change = paymentType === "cash" && !isNaN(receivedNum) && receivedNum >= discountedTotal
    ? +(receivedNum - discountedTotal).toFixed(2)
    : null;

  const canCharge = !!paymentType && items.length > 0 &&
    (paymentType !== "cash" || (!isNaN(receivedNum) && receivedNum >= discountedTotal));

  async function lookupCustomer() {
    const query = phone.trim();
    if (!query) return;
    setLookingUp(true);
    setCustomer(null);
    try {
      const res = await fetch(`/api/lookup-customer?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Customer not found"); return; }
      setCustomer(data.customer);
    } finally {
      setLookingUp(false);
    }
  }

  async function applyVoucherCode(code: string) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLookingUpVoucher(true);
    try {
      const res = await fetch(`/api/voucher?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Invalid voucher"); return; }
      setVoucher(data.voucher);
      setVoucherCode(trimmed);
      toast.success(`Voucher applied: ${data.voucher.label}`);
    } finally {
      setLookingUpVoucher(false);
    }
  }

  function applyVoucher() { applyVoucherCode(voucherCode); }

  function removeVoucher() { setVoucher(null); setVoucherCode(""); }

  async function handleCharge() {
    if (!canCharge) return;
    setCharging(true);

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map(({ product_id, name, price, quantity }) => ({ product_id, product_name: name, unit_price: price, quantity })),
        customer_id: customer?.id ?? null,
        points_redeemed: 0,
        payment_method: paymentType,
        voucher_code: voucher?.code ?? null,
        discount_amount: voucherDiscount,
        table_number: tableNumber.trim() || null,
      }),
    });

    setCharging(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body?.error ?? "Checkout failed");
      return;
    }

    const data: { order_id: string; order_number: string; created_at: string; subtotal: number; points_redeemed: number; total_amount: number; points_earned: number } = await res.json();

    if (voucher?.code) {
      await fetch("/api/voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucher.code, order_number: data.order_number }),
      });
    }

    const paid = paymentType === "cash" ? receivedNum : discountedTotal;
    setPending({
      order: {
        order_number: data.order_number, created_at: data.created_at,
        subtotal: data.subtotal, total_amount: data.total_amount,
        points_redeemed: data.points_redeemed, points_earned: data.points_earned,
      },
      items: items.map(i => ({ product_id: i.product_id, name: i.name, unit_price: i.price, quantity: i.quantity, subtotal: +(i.price * i.quantity).toFixed(2) })),
      customerName: customer?.full_name,
      tableNumber: tableNumber.trim() || undefined,
      paymentMethod: paymentType === "cash" ? "Cash" : paymentType === "qr" ? "QR Code" : "Card",
      amountPaid: paid,
      change: paymentType === "cash" ? +(paid - discountedTotal).toFixed(2) : 0,
    });

    onClearCart();
    setCustomer(null);
    setPhone("");
    setPaymentType(null);
    setAmountReceived("");
    setVoucher(null);
    setVoucherCode("");
  }

  return (
    <>
      <div className="flex h-full flex-col bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">
            Order
            {items.length > 0 && (
              <span className="ml-1.5 rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white">
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </h2>
          {items.length > 0 && (
            <button onClick={onClearCart} className="text-xs text-zinc-400 transition-colors hover:text-red-500">Clear all</button>
          )}
        </div>

        <ScrollArea className="flex-1 px-4">
          {items.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-zinc-300">
              <ShoppingBagIcon />
              <span className="text-xs">Cart is empty</span>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 py-2">
              {items.map((item) => (
                <CartRow key={item.product_id} item={item} onUpdate={(q) => onUpdateQuantity(item.product_id, q)} onRemove={() => onRemoveItem(item.product_id)} />
              ))}
            </ul>
          )}
        </ScrollArea>

        {/* Table Number */}
        <div className="space-y-2 border-t border-zinc-200 px-4 py-3">
          <p className="text-xs font-medium text-zinc-500">Table No. (optional)</p>
          <input
            type="text"
            placeholder="e.g. 3"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="h-9 w-full rounded-md border border-zinc-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        {/* Customer */}
        <div className="space-y-2 border-t border-zinc-200 px-4 py-3">
          <p className="text-xs font-medium text-zinc-500">Customer (optional)</p>
          {customer ? (
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <div>
                <p className="text-sm font-medium leading-tight text-zinc-900">{customer.full_name}</p>
                <p className="text-xs text-zinc-400">{customer.loyalty_points.toLocaleString()} pts{customer.phone && ` · ${customer.phone}`}</p>
              </div>
              <button onClick={() => { setCustomer(null); setPhone(""); phoneRef.current?.focus(); }} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input ref={phoneRef} placeholder="Phone or customer ID" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookupCustomer()} className="h-9 text-sm" />
              <Button size="sm" variant="outline" onClick={lookupCustomer} disabled={lookingUp || !phone.trim()} className="h-9 shrink-0 px-3">
                {lookingUp ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" /> : <UserSearch className="h-4 w-4" />}
              </Button>
              <CustomerScanner onCustomerFound={(c: ScannedCustomer) => setCustomer({ id: c.id, full_name: c.full_name, phone: c.phone, loyalty_points: c.loyalty_points })} />
            </div>
          )}
        </div>

        {/* Voucher */}
        <div className="space-y-2 border-t border-zinc-200 px-4 py-3">
          <p className="text-xs font-medium text-zinc-500">Voucher (optional)</p>
          {voucher ? (
            <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isFreeItem ? "border-pink-200 bg-pink-50" : "border-violet-200 bg-violet-50"}`}>
              <div className="flex items-center gap-2">
                <Ticket className={`h-4 w-4 ${isFreeItem ? "text-pink-500" : "text-violet-500"}`} />
                <div>
                  <p className={`text-sm font-semibold ${isFreeItem ? "text-pink-700" : "text-violet-700"}`}>{voucher.label}</p>
                  <p className="text-xs text-zinc-500">{isFreeItem ? "Free item — inform customer" : `-RM${voucherDiscount.toFixed(2)} discount`}</p>
                </div>
              </div>
              <button onClick={removeVoucher}><X className="h-4 w-4 text-zinc-400" /></button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Voucher code or scan QR"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && applyVoucher()}
                className="h-9 text-sm font-mono tracking-wider"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={applyVoucher}
                disabled={lookingUpVoucher || !voucherCode.trim()}
                className="h-9 shrink-0 px-2 text-xs"
              >
                {lookingUpVoucher ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" /> : "Apply"}
              </Button>
              <VoucherScanner onCodeScanned={(code) => applyVoucherCode(code)} />
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-zinc-200 px-4 py-4">
          {/* Payment type */}
          {items.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-zinc-500">Payment Method</p>
              <div className="grid grid-cols-3 gap-1.5">
                {PAYMENT_OPTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => { setPaymentType(id); setAmountReceived(""); }}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border-2 py-2 text-xs font-medium transition-all",
                      paymentType === id ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cash amount input */}
          {paymentType === "cash" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">Amount Received (RM)</p>
              <input
                type="number"
                min={discountedTotal}
                step="0.10"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder={discountedTotal.toFixed(2)}
                autoFocus
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              {change !== null && (
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                  <span className="text-sm font-semibold text-emerald-700">Change</span>
                  <span className="text-lg font-bold text-emerald-700">RM {change.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>Subtotal</span>
              <span>RM {subtotal.toFixed(2)}</span>
            </div>
            {voucherDiscount > 0 && (
              <div className="flex justify-between text-violet-600 font-medium">
                <span>Voucher ({voucher?.label})</span>
                <span>-RM {voucherDiscount.toFixed(2)}</span>
              </div>
            )}
            {isFreeItem && (
              <div className="text-xs text-pink-600 font-medium">🎁 Free item — confirm with customer</div>
            )}
            <Separator />
            <div className="flex justify-between pt-1 text-base font-bold text-zinc-900">
              <span>Total</span>
              <span>RM {discountedTotal.toFixed(2)}</span>
            </div>
          </div>

          <Button
            className="h-12 w-full text-base font-semibold"
            disabled={!canCharge || charging}
            onClick={handleCharge}
          >
            {charging ? "Processing…" : `Charge RM ${discountedTotal.toFixed(2)}`}
          </Button>
        </div>
      </div>

      {pending && (
        <ReceiptPrint
          open={!!pending}
          onClose={() => setPending(null)}
          order={pending.order}
          items={pending.items}
          customerName={pending.customerName}
          paymentMethod={pending.paymentMethod}
          amountPaid={pending.amountPaid}
        />
      )}
    </>
  );
}

function CartRow({ item, onUpdate, onRemove }: { item: CartItem; onUpdate: (qty: number) => void; onRemove: () => void }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-800">{item.name}</p>
        <p className="text-xs text-zinc-400">RM {item.price.toFixed(2)} each</p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onUpdate(item.quantity - 1)} className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50">
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-6 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
        <button onClick={() => onUpdate(item.quantity + 1)} className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50">
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <span className="w-16 text-right text-sm font-semibold tabular-nums text-zinc-900">RM {(item.price * item.quantity).toFixed(2)}</span>
      <button onClick={onRemove} className="text-zinc-300 transition-colors hover:text-red-500">
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function ShoppingBagIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
