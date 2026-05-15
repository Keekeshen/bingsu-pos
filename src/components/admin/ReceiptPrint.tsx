"use client";

import { useRef, forwardRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ── Edit your business info here ──────────────────────────────────────────
const BIZ_NAME    = "Bingsu Delight";
const BIZ_REG     = "";               // e.g. "202501002958" or leave ""
const BIZ_ADDRESS = "";               // e.g. "No.55-1, Jalan PJS 11/9, Subang Jaya"
const BIZ_PHONE   = "";               // e.g. "+60112345678"
const BIZ_EMAIL   = "";               // e.g. "hello@bingsu.com"
const SERVICE_CHARGE_PCT = 0;         // set to 10 for 10% service charge
// ─────────────────────────────────────────────────────────────────────────

export type ReceiptOrder = {
  order_number: string;
  created_at: string;
  subtotal: number;
  total_amount: number;
  points_redeemed: number;
  points_earned: number;
  table_number?: string;
  payment_method?: string;
  cashier?: string;
};

export type ReceiptLineItem = {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  order: ReceiptOrder;
  items: ReceiptLineItem[];
  customerName?: string;
};

const PAGE_STYLE = `
  @page { margin: 0; size: 58mm auto; }
  body { margin: 0; padding: 3mm; background: #fff; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #000; }
  * { box-sizing: border-box; }
`;

export default function ReceiptPrint({ open, onClose, order, items, customerName }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    pageStyle: PAGE_STYLE,
    documentTitle: `Receipt-${order.order_number}`,
  });

  const serviceCharge = +(order.subtotal * SERVICE_CHARGE_PCT / 100).toFixed(2);
  const rawTotal = order.subtotal + serviceCharge;
  const rounded = +(Math.round(rawTotal * 20) / 20 - rawTotal).toFixed(2);
  const pointsDiscount = +(order.subtotal - order.total_amount).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-zinc-100 px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span aria-hidden>✅</span> Order Complete
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto bg-zinc-50 px-4 py-4">
          <ReceiptContent
            ref={receiptRef}
            order={order}
            items={items}
            customerName={customerName}
            serviceCharge={serviceCharge}
            billRounding={rounded}
            pointsDiscount={pointsDiscount}
          />
        </div>
        <div className="flex gap-2 border-t border-zinc-100 px-6 py-4">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => handlePrint()}>
            <Printer className="h-4 w-4" /> Print Receipt
          </Button>
          <Button className="flex-1" onClick={onClose}>New Order</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type ContentProps = {
  order: ReceiptOrder;
  items: ReceiptLineItem[];
  customerName?: string;
  serviceCharge: number;
  billRounding: number;
  pointsDiscount: number;
};

const ReceiptContent = forwardRef<HTMLDivElement, ContentProps>(
  function ReceiptContent({ order, items, customerName, serviceCharge, billRounding, pointsDiscount }, ref) {
    const date = new Date(order.created_at);
    const dateStr =
      date.toLocaleDateString("en-MY", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " " +
      date.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", hour12: false });

    const totalQty   = items.reduce((s, i) => s + i.quantity, 0);
    const grandTotal = +(order.subtotal + serviceCharge + billRounding - pointsDiscount).toFixed(2);
    const payment    = order.payment_method || "CASH";
    const invoiceNo  = order.order_number.replace(/\D/g, "").slice(-4).padStart(4, "0") || "0001";
    const orderNum   = order.order_number.replace(/[^0-9]/g, "").slice(-2) || "1";

    return (
      <>
        <style>{`@media print { .receipt-root { width:58mm; max-width:58mm; font-family:'Courier New',monospace; font-size:10px; color:#000; background:#fff; } }`}</style>
        <div ref={ref} className="receipt-root mx-auto w-[240px] bg-white font-mono text-[10px] text-black">

          {/* Header */}
          <div className="text-center leading-tight space-y-0.5">
            <p className="font-bold text-[14px]">{BIZ_NAME}</p>
            {BIZ_REG     && <p className="text-[9px]">REGISTRATION NO. {BIZ_REG}</p>}
            {BIZ_ADDRESS && <p className="text-[9px]">{BIZ_ADDRESS}</p>}
            {BIZ_PHONE   && <p className="text-[9px]">{BIZ_PHONE}</p>}
            {BIZ_EMAIL   && <p className="text-[9px]">{BIZ_EMAIL}</p>}
          </div>

          <Dashes />

          {/* Invoice info + big ORDER number side by side */}
          <div className="flex items-start justify-between">
            <div className="text-[9px] space-y-0.5">
              <p>Invoice no: {invoiceNo}</p>
              <p>Date: {dateStr}</p>
              <p>Cashier: {order.cashier || "Cashier"}</p>
              {order.table_number && <p>Table No: {order.table_number}</p>}
              {customerName && <p>Customer: {customerName}</p>}
              <p>Table Pax: 1</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold">ORDER</p>
              <p className="text-[32px] font-bold leading-none tabular-nums">{orderNum}</p>
            </div>
          </div>

          <Dashes />

          {/* Column header */}
          <div className="flex justify-between text-[9px] font-bold border-b border-black pb-0.5 mb-1">
            <span>Qty  Item</span>
            <span>Price (MYR)</span>
          </div>

          {/* Items */}
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.product_id} className="flex justify-between gap-1">
                <span className="flex-1 leading-tight">
                  {item.quantity}  {item.name} ({item.unit_price.toFixed(2)}/ea)
                </span>
                <span className="tabular-nums flex-shrink-0">{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-black mt-1 pt-1" />

          {/* Qty + Subtotals */}
          <div className="space-y-0.5">
            <p>{totalQty}  Qty</p>
            <Row label="Subtotal" value={order.subtotal.toFixed(2)} />
            {SERVICE_CHARGE_PCT > 0 && (
              <Row label={`SERVICE CHARGE (${SERVICE_CHARGE_PCT}%)`} value={serviceCharge.toFixed(2)} />
            )}
            {pointsDiscount > 0 && (
              <Row label={`Points (${order.points_redeemed} pts)`} value={`-${pointsDiscount.toFixed(2)}`} />
            )}
            {billRounding !== 0 && (
              <Row label="Bill rounding" value={billRounding.toFixed(2)} />
            )}
          </div>

          <Dashes />

          {/* Total */}
          <div className="flex justify-between font-bold text-[13px]">
            <span>Total (MYR)</span>
            <span className="tabular-nums">{grandTotal.toFixed(2)}</span>
          </div>
          <div className="space-y-0.5 mt-1">
            <Row label={payment} value={grandTotal.toFixed(2)} />
            <Row label="Change" value="0.00" />
          </div>

          {/* Loyalty points */}
          {order.points_earned > 0 && (
            <>
              <Dashes />
              <p className="text-center text-[9px]">+{order.points_earned} loyalty points earned!</p>
            </>
          )}

          {/* Service charge tax summary */}
          {SERVICE_CHARGE_PCT > 0 && (
            <>
              <Dashes />
              <div className="text-[9px] space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>Tax &amp; Charges summary</span>
                  <span className="flex gap-4"><span>Taxable</span><span>Amount</span></span>
                </div>
                <div className="flex justify-between">
                  <span>SERVICE CHARGE {SERVICE_CHARGE_PCT}%</span>
                  <span className="flex gap-4 tabular-nums">
                    <span>{order.subtotal.toFixed(2)}</span>
                    <span>{serviceCharge.toFixed(2)}</span>
                  </span>
                </div>
              </div>
            </>
          )}

          <Dashes />

          {/* Footer */}
          <div className="text-center text-[9px] space-y-0.5">
            <p>Don&apos;t forget to rate us!</p>
            <p>Thank you for visiting.</p>
            <p>We hope to see you again soon!</p>
            <p className="mt-1 text-[8px]">This is an official receipt</p>
            <p className="text-[8px]">POWERED BY BINGSU DELIGHT POS</p>
          </div>

        </div>
      </>
    );
  }
);

function Dashes() {
  return <hr className="my-1 border-t border-dashed border-zinc-400" />;
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
