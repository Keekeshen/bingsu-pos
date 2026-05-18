"use client";

import { useRef, forwardRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePrinter } from "@/components/admin/PrinterProvider";
import { buildReceiptBytes, buildKitchenOrderBytes } from "@/lib/thermal-print";

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
  discountPct?: number;
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
  tierDiscount?: number;
  tierLabel?: string;
  serviceCharge?: number;
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

export default function ReceiptPrint({ open, onClose, order, items, customerName, paymentMethod, amountPaid, tableNumber, tierDiscount, tierLabel, serviceCharge, tableBreakdown }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { counter, kitchen } = usePrinter();

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    pageStyle: PAGE_STYLE,
    documentTitle: "Receipt-" + order.order_number,
  });

  const dateStr = new Date(order.created_at).toLocaleString("en-MY", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "Asia/Kuala_Lumpur",
  });

  const total = tableBreakdown ? tableBreakdown.payableTotal : order.total_amount;

  async function handleThermalReceipt() {
    const bytes = buildReceiptBytes({
      orderNumber: order.order_number,
      date: dateStr,
      tableNumber,
      customerName,
      items: items.map(i => ({ name: i.name, qty: i.quantity, unitPrice: i.unit_price, subtotal: i.subtotal, discountPct: i.discountPct })),
      subtotal: order.subtotal,
      tierDiscount,
      tierLabel,
      voucherDiscount: tableBreakdown?.voucherDiscount,
      serviceCharge: tableBreakdown?.serviceCharge ?? serviceCharge,
      rounding: tableBreakdown?.rounding,
      total,
      paymentMethod,
      amountPaid,
      pointsEarned: order.points_earned,
    });
    await counter.print(bytes);
  }

  async function handleKitchenPrint() {
    const bytes = buildKitchenOrderBytes({
      orderNumber: order.order_number,
      date: dateStr,
      tableNumber,
      items: items.map(i => ({ name: i.name, qty: i.quantity })),
    });
    await kitchen.print(bytes);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-zinc-100 px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2 text-base">
            Order Complete
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[58vh] overflow-y-auto bg-zinc-50 px-6 py-4">
          <ReceiptContent
            ref={receiptRef}
            order={order}
            items={items}
            customerName={customerName}
            paymentMethod={paymentMethod}
            amountPaid={amountPaid}
            tableNumber={tableNumber}
            tierDiscount={tierDiscount}
            tierLabel={tierLabel}
            serviceCharge={serviceCharge}
            tableBreakdown={tableBreakdown}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 px-6 pt-3 pb-1">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleThermalReceipt}
            disabled={!counter.connected}>
            <Printer className="h-3.5 w-3.5" />
            {counter.connected ? "Print Receipt" : "Counter Disconnected"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleKitchenPrint}
            disabled={!kitchen.connected}>
            <UtensilsCrossed className="h-3.5 w-3.5" />
            {kitchen.connected ? "Print Kitchen" : "Kitchen Disconnected"}
          </Button>
        </div>
        <div className="flex gap-2 border-t border-zinc-100 px-6 py-3">
          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => handlePrint()}>
            <Printer className="h-4 w-4" />Browser Print
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
  tierDiscount?: number;
  tierLabel?: string;
  serviceCharge?: number;
  tableBreakdown?: Props["tableBreakdown"];
};

const ReceiptContent = forwardRef<HTMLDivElement, ContentProps>(
  function ReceiptContent({ order, items, customerName, paymentMethod, amountPaid, tableNumber, tierDiscount, tierLabel, serviceCharge, tableBreakdown }, ref) {
    const dateStr = new Date(order.created_at).toLocaleString("en-MY", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
      timeZone: "Asia/Kuala_Lumpur",
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
      <>
        <style>{`
          @media print {
            .receipt-root { width: 58mm; max-width: 58mm; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #000; background: #fff; }
            .receipt-divider { border: none; border-top: 1px dashed #000; margin: 4px 0; }
            .receipt-row { display: flex; justify-content: space-between; }
            .receipt-center { text-align: center; }
            .receipt-bold { font-weight: bold; }
            .receipt-small { font-size: 9px; }
            .col-header { display: flex; justify-content: space-between; font-weight: bold; }
          }
        `}</style>
        <div ref={ref} className="receipt-root mx-auto w-[240px] bg-white font-mono text-[10px] text-black">

          <div className="receipt-center mb-1 text-center leading-tight">
            <p style={{ fontSize: "22px", fontWeight: "bold" }}>Koori Dessert</p>
            <p className="text-[9px] text-zinc-500">SSM : 003834965-W</p>
            <p className="text-[9px] text-zinc-500">57, Jln SS 21/1a, Damansara Utama,</p>
            <p className="text-[9px] text-zinc-500">47400 Petaling Jaya, Selangor</p>
          </div>
          <Dashes />

          <div className="receipt-row flex justify-between items-start mb-1">
            <div className="space-y-0.5">
              <p><span className="text-zinc-500">Invoice no:</span> {order.order_number}</p>
              <p><span className="text-zinc-500">Date:</span> {dateStr}</p>
              <p><span className="text-zinc-500">Cashier:</span> Cashier</p>
              {tableNumber && <p><span className="text-zinc-500">Table:</span> {tableNumber}</p>}
              {customerName && <p><span className="text-zinc-500">Customer:</span> {customerName}</p>}
            </div>
            <div className="text-right">
              <p className="text-[8px] text-zinc-400 leading-none">ORDER</p>
              <p className="receipt-bold text-[18px] font-bold leading-none">{invoiceSeq}</p>
            </div>
          </div>
          <Dashes />

          <div className="col-header flex justify-between font-bold text-[9px] mb-0.5">
            <span>Qty  Item</span>
            <span>Price (MYR)</span>
          </div>
          <Dashes />
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item.product_id}>
                <div className="receipt-row flex justify-between">
                  <span>{item.quantity}x {item.name} ({item.unit_price.toFixed(2)}/ea{item.discountPct ? ` -${item.discountPct}%` : ""})</span>
                  <span className="tabular-nums">{item.subtotal.toFixed(2)}</span>
                </div>
                <p className="text-zinc-400 pl-2 text-[9px]">{item.quantity} Qty{item.discountPct ? ` · ${item.discountPct}% off` : ""}</p>
              </div>
            ))}
          </div>
          <Dashes />

          <div className="space-y-0.5">
            <Row label="Subtotal" value={order.subtotal.toFixed(2)} />
            {tableBreakdown ? (
              <>
                {tableBreakdown.voucherDiscount > 0 && (
                  <Row label="Voucher discount" value={"-" + tableBreakdown.voucherDiscount.toFixed(2)} />
                )}
                <Row label="SERVICE CHARGE (6%)" value={tableBreakdown.serviceCharge.toFixed(2)} />
                {tableBreakdown.rounding !== 0 && (
                  <Row label="Bill rounding" value={(tableBreakdown.rounding >= 0 ? "+" : "") + tableBreakdown.rounding.toFixed(2)} />
                )}
              </>
            ) : (
              <>
                {tierDiscount && tierDiscount > 0 && (
                  <Row label={"Member discount (" + (tierLabel ?? "") + ")"} value={"-" + tierDiscount.toFixed(2)} />
                )}
                {order.points_redeemed > 0 && (
                  <Row label={"Points redeemed (" + order.points_redeemed + " pts)"} value={"-" + (order.subtotal - order.total_amount).toFixed(2)} />
                )}
                {serviceCharge && serviceCharge > 0 && (
                  <Row label="Service charge (6%)" value={serviceCharge.toFixed(2)} />
                )}
              </>
            )}
            <Dashes />
            <div className="receipt-row receipt-bold flex justify-between font-bold">
              <span>Total (MYR)</span>
              <span className="tabular-nums">{total.toFixed(2)}</span>
            </div>
          </div>

          {paymentMethod && (
            <>
              <div className="mt-1 space-y-0.5">
                <Row label={paymentMethod.toUpperCase()} value={paid.toFixed(2)} />
                {paymentMethod.toLowerCase() === "cash" && (
                  <Row label="Change" value={change.toFixed(2)} />
                )}
              </div>
              <Dashes />
            </>
          )}

          {tableBreakdown && tableBreakdown.serviceCharge > 0 && (
            <>
              <div className="col-header flex justify-between font-bold text-[9px] mb-0.5">
                <span>Tax &amp; Charges summary</span>
                <span>Taxable Amount</span>
              </div>
              <div className="receipt-row flex justify-between text-[9px]">
                <span>SERVICE CHARGE 6%</span>
                <span className="tabular-nums">{taxableBase.toFixed(2)}  {tableBreakdown.serviceCharge.toFixed(2)}</span>
              </div>
              <Dashes />
            </>
          )}

          {order.points_earned > 0 && (
            <>
              <div className="receipt-center text-center">
                <p>[+] {order.points_earned} loyalty points earned</p>
              </div>
              <Dashes />
            </>
          )}

          <div className="receipt-center receipt-small mt-1 text-center text-[9px] leading-snug text-zinc-500">
            <p>Thank you for visiting us!</p>
            <p>We hope to see you again soon.</p>
          </div>
          <Dashes />
          <div className="receipt-center mt-1 text-center text-[8px] text-zinc-400">
            <p>** OFFICIAL RECEIPT **</p>
            <p className="font-bold">POWERED BY KOORI POS</p>
          </div>
        </div>
      </>
    );
  }
);

function Dashes() { return <hr className="receipt-divider my-1 border-t border-dashed border-zinc-300" />; }
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="receipt-row flex justify-between gap-2">
      <span className="text-zinc-500">{label}</span>
      <span className="tabular-nums text-right">{value}</span>
    </div>
  );
}