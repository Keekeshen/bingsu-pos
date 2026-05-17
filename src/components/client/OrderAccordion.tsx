"use client";

import { useState, useRef } from "react";
import { ChevronDown, Ticket, FileText, Printer, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OrderItem = { id: string; product_name: string; quantity: number; unit_price: number; subtotal: number; };
type Props = {
  orderId: string;
  orderNumber: string;
  date: string;
  totalAmount: number;
  subtotal: number;
  pointsEarned: number;
  status: string;
  statusVariant: "default" | "secondary" | "destructive" | "outline";
  items: OrderItem[];
  voucherCode?: string | null;
  discountAmount?: number;
  paymentMethod?: string | null;
  tableNumber?: string | null;
  source?: string | null;
};

function InvoiceModal({ open, onClose, orderNumber, date, items, subtotal, discountAmount, voucherCode, totalAmount, pointsEarned, paymentMethod, tableNumber, source }: {
  open: boolean; onClose: () => void;
  orderNumber: string; date: string; items: OrderItem[];
  subtotal: number; discountAmount?: number; voucherCode?: string | null;
  totalAmount: number; pointsEarned: number; paymentMethod?: string | null;
  tableNumber?: string | null; source?: string | null;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const hasDiscount = !!voucherCode && !!discountAmount && discountAmount > 0;

  function handlePrint() {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>E-Invoice ${orderNumber}</title>
      <style>body{font-family:monospace;padding:20px;font-size:12px;max-width:320px;margin:auto;}
      h2{text-align:center;font-size:14px;margin:0 0 4px;}
      .center{text-align:center;} .line{border-top:1px dashed #999;margin:8px 0;}
      .row{display:flex;justify-content:space-between;} .bold{font-weight:bold;}
      .small{font-size:11px;color:#666;}</style></head>
      <body>${printContents}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-600" />
            <span className="text-sm font-semibold text-zinc-800">E-Invoice</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handlePrint} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
              <Printer className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          <div ref={printRef}>
            <div className="mb-4 text-center">
              <p className="text-base font-bold tracking-tight text-zinc-900">Koori Dessert</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Thank you for your visit!</p>
            </div>

            <div className="border-t border-dashed border-zinc-200 my-3" />

            <div className="space-y-0.5 text-xs text-zinc-500 mb-3">
              <div className="flex justify-between">
                <span>Order</span>
                <span className="font-mono font-semibold text-zinc-800">{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date</span>
                <span className="text-zinc-700">{date}</span>
              </div>
              {source === "table" && tableNumber && (
                <div className="flex justify-between">
                  <span>Table</span>
                  <span className="text-zinc-700">{tableNumber}</span>
                </div>
              )}
              {paymentMethod && (
                <div className="flex justify-between">
                  <span>Payment</span>
                  <span className="capitalize text-zinc-700">{paymentMethod.replace(/_/g, " ")}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-zinc-200 my-3" />

            <ul className="space-y-1.5 mb-3">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span className="text-zinc-700">
                    <span className="font-medium text-zinc-900 mr-1">{item.quantity}x</span>{item.product_name}
                  </span>
                  <span className="tabular-nums text-zinc-700 font-medium">RM {item.subtotal.toFixed(2)}</span>
                </li>
              ))}
            </ul>

            <div className="border-t border-dashed border-zinc-200 my-3" />

            <div className="space-y-1 text-xs">
              {hasDiscount ? (
                <>
                  <div className="flex justify-between text-zinc-500">
                    <span>Subtotal</span>
                    <span className="tabular-nums">RM {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-violet-600">
                    <span className="flex items-center gap-1">
                      <Ticket className="h-3 w-3" />
                      Voucher ({voucherCode})
                    </span>
                    <span className="tabular-nums font-medium">-RM {discountAmount!.toFixed(2)}</span>
                  </div>
                </>
              ) : null}
              <div className="flex justify-between font-bold text-sm text-zinc-900 pt-1 border-t border-zinc-100">
                <span>Total</span>
                <span className="tabular-nums">RM {totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {pointsEarned > 0 && (
              <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700">
                +{pointsEarned} loyalty points earned
              </div>
            )}

            <div className="mt-4 text-center text-[11px] text-zinc-400">
              Koori Dessert · Powered by Koori POS
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderAccordion({ orderNumber, date, totalAmount, subtotal, pointsEarned, status, statusVariant, items, voucherCode, discountAmount, paymentMethod, tableNumber, source }: Props) {
  const [open, setOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const hasDiscount = !!voucherCode && !!discountAmount && discountAmount > 0;

  return (
    <>
      <InvoiceModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        orderNumber={orderNumber}
        date={date}
        items={items}
        subtotal={subtotal}
        discountAmount={discountAmount}
        voucherCode={voucherCode}
        totalAmount={totalAmount}
        pointsEarned={pointsEarned}
        paymentMethod={paymentMethod}
        tableNumber={tableNumber}
        source={source}
      />

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-4 text-left" aria-expanded={open}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold text-zinc-800">{orderNumber}</span>
              <Badge variant={statusVariant} className="capitalize text-[10px] px-1.5 py-0">{status}</Badge>
              {voucherCode && (
                <span className="flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                  <Ticket className="h-2.5 w-2.5" />{voucherCode}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-zinc-400">{date}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold tabular-nums text-zinc-900">RM {totalAmount.toFixed(2)}</p>
            {pointsEarned > 0 && <p className="text-[10px] font-medium text-emerald-600 tabular-nums">+{pointsEarned} pts</p>}
          </div>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200", open && "rotate-180")} />
        </button>

        <div className={cn("grid transition-all duration-200 ease-in-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="overflow-hidden">
            <div className="border-t border-zinc-100 px-4 pb-4 pt-3">
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600"><span className="font-medium text-zinc-800 mr-1.5">{item.quantity}x</span>{item.product_name}</span>
                    <span className="tabular-nums text-zinc-700 font-medium">RM {item.subtotal.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-1 border-t border-zinc-100 pt-2 text-xs">
                {hasDiscount && (
                  <>
                    <div className="flex justify-between text-zinc-400">
                      <span>Subtotal</span>
                      <span className="tabular-nums">RM {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-violet-600">
                      <span className="flex items-center gap-1">
                        <Ticket className="h-3 w-3" />
                        Voucher <span className="font-mono bg-violet-100 px-1 rounded">{voucherCode}</span>
                      </span>
                      <span className="tabular-nums font-medium">-RM {discountAmount!.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-zinc-500 font-medium">
                  <span>{items.length} item{items.length !== 1 ? "s" : ""} · Total</span>
                  <span className="tabular-nums text-zinc-700">RM {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full h-8 text-xs gap-1.5 text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                onClick={(e) => { e.stopPropagation(); setInvoiceOpen(true); }}
              >
                <FileText className="h-3.5 w-3.5" />
                View E-Invoice
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
