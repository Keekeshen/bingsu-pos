"use client";

import { useState } from "react";
import { ChevronDown, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
};

export default function OrderAccordion({ orderNumber, date, totalAmount, subtotal, pointsEarned, status, statusVariant, items, voucherCode, discountAmount }: Props) {
  const [open, setOpen] = useState(false);
  const hasDiscount = !!voucherCode && !!discountAmount && discountAmount > 0;

  return (
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
                  <span className="text-zinc-600"><span className="font-medium text-zinc-800 mr-1.5">{item.quantity}×</span>{item.product_name}</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
