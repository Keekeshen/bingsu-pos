"use client";

import { useRef, forwardRef } from "react";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ── Business info ─────────────────────────────────────────────────────────
const BIZ_NAME         = "Bingsu Delight";
const BIZ_ADDRESS_1    = "57, Jalan SS 21/1a, Damansara Utama,";
const BIZ_ADDRESS_2    = "47400 Petaling Jaya, Selangor, Malaysia";
const BIZ_PHONE        = "";   // e.g. "+60112345678"
const BIZ_EMAIL        = "";   // e.g. "hello@bingsudelight.com"
const SERVICE_CHARGE   = 10;   // percent — set 0 to disable
// Replace with a short URL for best QR scanability (use bit.ly or g.page/r/...)
const REVIEW_URL       = "https://www.google.com/maps/search/?q=Bingsu+Delight+Damansara+Utama#lrd=0x31cc49a7b42d0e55:0x5e3d42d4420e8cac,3,,,,";
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

  const svc    = +(order.subtotal * SERVICE_CHARGE / 100).toFixed(2);
  const raw    = order.subtotal + svc;
  const rounded = +(Math.round(raw * 20) / 20 - raw).toFixed(2);
  const ptDisc  = +(order.subtotal - order.total_amount).toFixed(2);

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
            svc={svc}
            rounded={rounded}
            ptDisc={ptDisc}
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

type CP = {
  order: ReceiptOrder;
  items: ReceiptLineItem[];
  customerName?: string;
  svc: number;
  rounded: number;
  ptDisc: number;
};

const ReceiptContent = forwardRef<HTMLDivElement, CP>(
  function ReceiptContent({ order, items, customerName, svc, rounded, ptDisc }, ref) {
    const d = new Date(order.created_at);
    const dd   = String(d.getDate()).padStart(2, "0");
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh   = String(d.getHours()).padStart(2, "0");
    const min  = String(d.getMinutes()).padStart(2, "0");
    const dateStr = `${dd}/${mm}/${yyyy} ${hh}:${min}`;

    const totalQty   = items.reduce((s, i) => s + i.quantity, 0);
    const grandTotal = +(order.subtotal + svc + rounded - ptDisc).toFixed(2);
    const payment    = order.payment_method || "CASH";
    const invoiceNo  = order.order_number.replace(/\D/g, "").slice(-4).padStart(4, "0");
    const orderNum   = order.order_number.replace(/\D/g, "").slice(-2) || "1";

    return (
      <>
        <style>{`@media print{.rr{width:58mm;max-width:58mm;font-family:'Courier New',monospace;font-size:10px;color:#000;background:#fff;}}`}</style>
        <div ref={ref} className="rr mx-auto w-[230px] bg-white font-mono text-[10px] text-black">

          {/* ── Header ── */}
          <div className="text-center leading-snug">
            <p className="font-bold text-[13px]">{BIZ_NAME}</p>
            <p className="text-[9px]">{BIZ_ADDRESS_1}</p>
            <p className="text-[9px]">{BIZ_ADDRESS_2}</p>
            {BIZ_PHONE && <p className="text-[9px]">{BIZ_PHONE}</p>}
            {BIZ_EMAIL && <p className="text-[9px]">{BIZ_EMAIL}</p>}
          </div>

          <D />

          {/* ── Invoice + big ORDER number ── */}
          <div className="flex items-start justify-between">
            <div className="text-[9px] space-y-px">
              <p>Invoice no: {invoiceNo}</p>
              <p>Date: {dateStr}</p>
              <p>Cashier: {order.cashier || "Cashier"}</p>
              {order.table_number && <p>Table No: {order.table_number}</p>}
              {customerName && <p>Customer: {customerName}</p>}
              <p>Table Pax: 1</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold tracking-widest">ORDER</p>
              <p className="text-[34px] font-bold leading-none tabular-nums">{orderNum}</p>
            </div>
          </div>

          <D />

          {/* ── Column headers ── */}
          <div className="flex justify-between text-[9px] font-bold border-b border-black pb-0.5">
            <span>Qty  Item</span>
            <span>Price (MYR)</span>
          </div>

          {/* ── Line items ── */}
          <div className="space-y-1 py-1">
            {items.map((item) => (
              <div key={item.product_id} className="flex justify-between gap-1">
                <span className="flex-1 leading-tight break-words pr-1">
                  {item.quantity}  {item.name} ({item.unit_price.toFixed(2)}/ea)
                </span>
                <span className="tabular-nums flex-shrink-0">{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-black pt-1 space-y-px">
            <p>{totalQty}  Qty</p>
            <R l="Subtotal" v={order.subtotal.toFixed(2)} />
            {SERVICE_CHARGE > 0 && <R l={`SERVICE CHARGE (${SERVICE_CHARGE}%)`} v={svc.toFixed(2)} />}
            {ptDisc > 0 && <R l={`Points (${order.points_redeemed} pts)`} v={`-${ptDisc.toFixed(2)}`} />}
            {rounded !== 0 && <R l="Bill rounding" v={rounded.toFixed(2)} />}
          </div>

          <D />

          {/* ── Total ── */}
          <div className="flex justify-between font-bold text-[13px]">
            <span>Total (MYR)</span>
            <span className="tabular-nums">{grandTotal.toFixed(2)}</span>
          </div>
          <div className="space-y-px mt-0.5">
            <R l={payment} v={grandTotal.toFixed(2)} />
            <R l="Change" v="0.00" />
          </div>

          {order.points_earned > 0 && (
            <>
              <D />
              <p className="text-center text-[9px]">+{order.points_earned} loyalty points earned!</p>
            </>
          )}

          {/* ── Tax summary (only when service charge enabled) ── */}
          {SERVICE_CHARGE > 0 && (
            <>
              <D />
              <div className="text-[9px]">
                <div className="flex justify-between font-bold">
                  <span>Tax &amp; Charges summary</span>
                  <span className="flex gap-2"><span>Taxable</span><span>Amount</span></span>
                </div>
                <div className="flex justify-between">
                  <span>SERVICE CHARGE {SERVICE_CHARGE}%</span>
                  <span className="flex gap-2 tabular-nums">
                    <span>{order.subtotal.toFixed(2)}</span>
                    <span>{svc.toFixed(2)}</span>
                  </span>
                </div>
              </div>
            </>
          )}

          <D />

          {/* ── Footer ── */}
          <div className="text-center text-[9px] space-y-0.5">
            <p>Don&apos;t forget to rate us!</p>
            <p>Scan QR code to let us know how you</p>
            <p>enjoyed with us.</p>
            <p className="mt-0.5">Thank you for visiting us</p>
            <p>We hope to see you again soon!</p>
          </div>

          {/* ── Review QR ── */}
          <div className="flex justify-center mt-2 mb-1">
            <QRCodeSVG value={REVIEW_URL} size={80} level="L" />
          </div>

          <div className="text-center text-[8px] text-zinc-400 space-y-0.5">
            <p>This is an official receipt</p>
            <p>POWERED BY BINGSU DELIGHT POS</p>
          </div>

        </div>
      </>
    );
  }
);

function D() {
  return <hr className="my-1 border-t border-dashed border-zinc-400" />;
}
function R({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex justify-between gap-1">
      <span>{l}</span>
      <span className="tabular-nums flex-shrink-0">{v}</span>
    </div>
  );
}
