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
  change?: number;
  tableNumber?: string;
  serviceCharge?: number;
  rounding?: number;
};

const REVIEW_URL = "http://bit.ly/4fms7qj";

const PAGE_STYLE = `
  @page { margin: 0; size: 58mm auto; }
  body { margin: 0; padding: 4mm; background: #fff; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #000; }
  * { box-sizing: border-box; }
`;

export default function ReceiptPrint({ open, onClose, order, items, customerName, paymentMethod, amountPaid, change, tableNumber, serviceCharge, rounding }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    pageStyle: PAGE_STYLE,
    documentTitle: `Receipt-${order.order_number}`,
  });

  const discount = +(order.subtotal - order.total_amount + (serviceCharge ?? 0) + (rounding ?? 0)).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-zinc-100 px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span aria-hidden>✅</span> {tableNumber ? `Table ${tableNumber} — Payment Done` : "Order Complete"}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[58vh] overflow-y-auto bg-zinc-50 px-6 py-4">
          <ReceiptContent
            ref={receiptRef}
            order={order}
            items={items}
            customerName={customerName}
            discount={discount}
            paymentMethod={paymentMethod}
            amountPaid={amountPaid}
            change={change}
            tableNumber={tableNumber}
            serviceCharge={serviceCharge}
            rounding={rounding}
          />
        </div>

        <div className="flex gap-2 border-t border-zinc-100 px-6 py-4">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => handlePrint()}>
            <Printer className="h-4 w-4" /> Print Receipt
          </Button>
          <Button className="flex-1" onClick={onClose}>{tableNumber ? "Done" : "New Order"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type ContentProps = {
  order: ReceiptOrder;
  items: ReceiptLineItem[];
  customerName?: string;
  discount: number;
  paymentMethod?: string;
  amountPaid?: number;
  change?: number;
  tableNumber?: string;
  serviceCharge?: number;
  rounding?: number;
};

const ReceiptContent = forwardRef<HTMLDivElement, ContentProps>(
  function ReceiptContent({ order, items, customerName, discount, paymentMethod, amountPaid, change, tableNumber, serviceCharge, rounding }, ref) {
    const dateStr = new Date(order.created_at).toLocaleString("en-MY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });

    return (
      <>
        <style>{`
          @media print {
            .receipt-root { width: 58mm; max-width: 58mm; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #000; background: #fff; }
            .receipt-divider { border: none; border-top: 1px dashed #000; margin: 4px 0; }
            .receipt-row { display: flex; justify-content: space-between; }
            .receipt-center { text-align: center; }
            .receipt-bold { font-weight: bold; }
            .receipt-small { font-size: 9px; }
          }
        `}</style>
        <div ref={ref} className="receipt-root mx-auto w-[220px] bg-white font-mono text-[10px] text-black">
          {/* Header */}
          <div className="receipt-center mb-1 text-center">
            <p className="receipt-bold font-bold" style={{ fontSize: "16px" }}>Koori Dessert</p>
            <p className="receipt-small text-[9px] text-zinc-500">57, Jalan SS 21/1a, Damansara Utama</p>
            <p className="receipt-small text-[9px] text-zinc-500">47400 Petaling Jaya, Selangor</p>
          </div>
          <Dashes />

          {/* Invoice info */}
          <div className="space-y-0.5">
            <Row label="Invoice" value={order.order_number} />
            <Row label="Date" value={dateStr} />
            {tableNumber && <Row label="Table" value={tableNumber} />}
            {customerName && <Row label="Customer" value={customerName} />}
          </div>
          <Dashes />

          {/* Items */}
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.product_id}>
                <p className="receipt-bold font-semibold leading-tight">{item.name}</p>
                <div className="receipt-row flex justify-between pl-2">
                  <span className="text-zinc-500">{item.quantity} x RM {item.unit_price.toFixed(2)}/ea</span>
                  <span className="tabular-nums">RM {item.subtotal.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          <Dashes />

          {/* Totals */}
          <div className="space-y-0.5">
            <Row label="Subtotal" value={`RM ${order.subtotal.toFixed(2)}`} />
            {(serviceCharge ?? 0) > 0 && <Row label="Service Charge (10%)" value={`RM ${(serviceCharge ?? 0).toFixed(2)}`} />}
            {(rounding ?? 0) !== 0 && <Row label="Bill Rounding" value={`RM ${(rounding ?? 0).toFixed(2)}`} />}
            {discount > 0 && <Row label={`Points redeemed (${order.points_redeemed} pts)`} value={`-RM ${discount.toFixed(2)}`} />}
            <div className="receipt-row receipt-bold flex justify-between font-bold pt-0.5">
              <span>TOTAL</span>
              <span className="tabular-nums">RM {order.total_amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment */}
          {(paymentMethod || amountPaid !== undefined) && (
            <>
              <Dashes />
              <div className="space-y-0.5">
                {paymentMethod && <Row label="Payment" value={paymentMethod} />}
                {amountPaid !== undefined && <Row label="Tendered" value={`RM ${amountPaid.toFixed(2)}`} />}
                {change !== undefined && change >= 0 && <Row label="Change" value={`RM ${change.toFixed(2)}`} />}
              </div>
            </>
          )}

          {/* Loyalty points */}
          {order.points_earned > 0 && (
            <>
              <Dashes />
              <div className="receipt-center text-center"><p>+{order.points_earned} loyalty points earned!</p></div>
            </>
          )}

          {/* Footer with QR code */}
          <Dashes />
          <div className="receipt-center mt-1 flex flex-col items-center text-center">
            <p className="text-[9px] text-zinc-500 mb-1">Thank you for visiting Koori Dessert!</p>
            <p className="text-[9px] text-zinc-500 mb-2">Leave us a Google review ❄️</p>
            <QRCodeSVG value={REVIEW_URL} size={64} level="M" />
            <p className="text-[8px] text-zinc-400 mt-1">bit.ly/4fms7qj</p>
          </div>
        </div>
      </>
    );
  }
);

function Dashes() { return <hr className="receipt-divider my-1 border-t border-dashed border-zinc-300" />; }
function Row({ label, value }: { label: string; value: string }) {
  return <div className="receipt-row flex justify-between gap-2"><span className="text-zinc-500">{label}</span><span className="tabular-nums text-right">{value}</span></div>;
}
