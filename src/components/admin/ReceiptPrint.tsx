"use client";

import { useRef, forwardRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ReceiptOrder = {
  order_number: string;
  created_at: string;
  subtotal: number;
  total_amount: number;
  points_redeemed: number;
  points_earned: number;
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
  paymentMethod?: string;
  amountPaid?: number;
  tableNumber?: string;
  tableBreakdown?: {
    voucherDiscount: number;
    serviceCharge: number;
    rounding: number;
    payableTotal: number;
  };
};

const PAGE_STYLE = `
  @page { margin: 0; size: 58mm auto; }
  body { margin: 0; padding: 4mm; background: #fff; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #000; }
  * { box-sizing: border-box; }
`;

const FEEDBACK_URL = "https://bit.ly/4eNKmF7";

export default function ReceiptPrint({ open, onClose, order, items, customerName, paymentMethod, amountPaid, tableNumber, tableBreakdown }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    pageStyle: PAGE_STYLE,
    documentTitle: `Receipt-${order.order_number}`,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-zinc-100 px-6 pb-4 pt-6">
          <DialogTitle className="text-base">OK - Order Complete</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto bg-zinc-50 px-6 py-4">
          <ReceiptContent ref={receiptRef} order={order} items={items} customerName={customerName} paymentMethod={paymentMethod} amountPaid={amountPaid} tableNumber={tableNumber} tableBreakdown={tableBreakdown} />
        </div>
        <div className="flex gap-2 border-t border-zinc-100 px-6 py-4">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => handlePrint()}>
            <Printer className="h-4 w-4" />Print Receipt
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
  paymentMethod?: string;
  amountPaid?: number;
  tableNumber?: string;
  tableBreakdown?: Props["tableBreakdown"];
};

const ReceiptContent = forwardRef<HTMLDivElement, ContentProps>(
  function ReceiptContent({ order, items, customerName, paymentMethod, amountPaid, tableNumber, tableBreakdown }, ref) {
    const dateStr = new Date(order.created_at).toLocaleString("en-MY", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const total = tableBreakdown ? tableBreakdown.payableTotal : order.total_amount;
    const paid = amountPaid ?? total;
    const change = paymentMethod?.toLowerCase() === "cash" ? +(paid - total).toFixed(2) : 0;
    const taxableBase = tableBreakdown
      ? +(tableBreakdown.payableTotal - tableBreakdown.serviceCharge - tableBreakdown.rounding).toFixed(2)
      : order.subtotal;
    const parts = order.order_number.split("-");
    const invoiceSeq = parts[parts.length - 1] ?? order.order_number;

    return (
      <div ref={ref} className="mx-auto w-[240px] bg-white font-mono text-[10px] text-black">
        <div className="mb-1 text-center">
          <p style={{ fontSize: "22px", fontWeight: "bold", letterSpacing: "-0.5px", lineHeight: 1.2 }}>Koori Dessert</p>
          <p className="text-[9px] text-zinc-500 mt-0.5">57, Jalan SS 21/1a, Damansara Utama,</p>
          <p className="text-[9px] text-zinc-500">47400 Petaling Jaya, Selangor, Malaysia</p>
        </div>
        <Dashes />

        <div className="flex justify-between items-start mb-1">
          <div className="space-y-0.5">
            <p><span className="text-zinc-500">Invoice no:</span> {order.order_number}</p>
            <p><span className="text-zinc-500">Date:</span> {dateStr}</p>
            <p><span className="text-zinc-500">Cashier:</span> Cashier</p>
            {tableNumber && <p><span className="text-zinc-500">Table:</span> {tableNumber}</p>}
            {customerName && <p><span className="text-zinc-500">Customer:</span> {customerName}</p>}
          </div>
          <div className="text-right">
            <p className="text-[8px] text-zinc-400 leading-none">ORDER</p>
            <p className="text-[18px] font-bold leading-none">{invoiceSeq}</p>
          </div>
        </div>
        <Dashes />

        <div className="flex justify-between font-bold text-[9px] mb-0.5">
          <span>Qty  Item</span><span>Price (MYR)</span>
        </div>
        <Dashes />
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.product_id}>
              <div className="flex justify-between">
                <span>{item.quantity}  {item.name} ({item.unit_price.toFixed(2)}/ea)</span>
                <span className="tabular-nums">{item.subtotal.toFixed(2)}</span>
              </div>
              <p className="pl-2 text-[9px] text-zinc-400">{item.quantity} Qty</p>
            </div>
          ))}
        </div>
        <Dashes />

        <div className="space-y-0.5">
          <Row label="Subtotal" value={order.subtotal.toFixed(2)} />
          {tableBreakdown ? (
            <>
              {tableBreakdown.voucherDiscount > 0 && <Row label="Voucher discount" value={`-${tableBreakdown.voucherDiscount.toFixed(2)}`} />}
              <Row label="SERVICE CHARGE (10%)" value={tableBreakdown.serviceCharge.toFixed(2)} />
              {tableBreakdown.rounding !== 0 && <Row label="Bill rounding" value={`${tableBreakdown.rounding >= 0 ? "+" : ""}${tableBreakdown.rounding.toFixed(2)}`} />}
            </>
          ) : (
            order.points_redeemed > 0
              ? <Row label={`Points redeemed (${order.points_redeemed} pts)`} value={`-${(order.subtotal - order.total_amount).toFixed(2)}`} />
              : null
          )}
          <Dashes />
          <div className="flex justify-between font-bold">
            <span>Total (MYR)</span>
            <span className="tabular-nums">{total.toFixed(2)}</span>
          </div>
        </div>

        {paymentMethod && (
          <>
            <div className="mt-1 space-y-0.5">
              <Row label={paymentMethod.toUpperCase()} value={paid.toFixed(2)} />
              {paymentMethod.toLowerCase() === "cash" && <Row label="Change" value={change.toFixed(2)} />}
            </div>
            <Dashes />
          </>
        )}

        {tableBreakdown && tableBreakdown.serviceCharge > 0 && (
          <>
            <div className="flex justify-between font-bold text-[9px] mb-0.5">
              <span>Tax &amp; Charges summary</span><span>Taxable Amount</span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span>SERVICE CHARGE 10%</span>
              <span className="tabular-nums">{taxableBase.toFixed(2)}  {tableBreakdown.serviceCharge.toFixed(2)}</span>
            </div>
            <Dashes />
          </>
        )}

        {order.points_earned > 0 && (
          <>
            <div className="text-center"><p>[+] {order.points_earned} loyalty points earned</p></div>
            <Dashes />
          </>
        )}

        <div className="mt-1 text-center text-[9px] leading-snug text-zinc-500">
          <p>Scan QR to rate us and let us know</p>
          <p>how you enjoyed your visit!</p>
        </div>
        <div className="my-2 flex justify-center">
          <QRCodeSVG value={FEEDBACK_URL} size={72} />
        </div>
        <div className="text-center text-[9px] text-zinc-400">
          <p>Thank you for visiting Koori Dessert!</p>
          <p>We hope to see you again soon.</p>
        </div>
        <Dashes />
        <div className="mt-1 text-center text-[8px] text-zinc-400">
          <p>This is an official receipt</p>
          <p className="font-bold">POWERED BY KOORI POS</p>
        </div>
      </div>
    );
  }
);

function Dashes() {
  return <hr className="my-1 border-t border-dashed border-zinc-300" />;
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-zinc-500">{label}</span>
      <span className="tabular-nums text-right">{value}</span>
    </div>
  );
}