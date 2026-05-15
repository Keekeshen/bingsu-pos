"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCheck, X, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export default function TableOrderView({ tableNumber, onClose, onOrdersUpdated }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, status, subtotal, total_amount, created_at, order_items(id, product_name, quantity, unit_price, subtotal)")
      .eq("source", "table")
      .eq("table_number", tableNumber)
      .in("status", ["pending", "completed"])
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `table_number=eq.${tableNumber}`,
        },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tableNumber, load]);

  async function markComplete(orderId: string) {
    setCompleting(orderId);
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({ status: "completed" })
      .eq("id", orderId);
    setCompleting(null);
    if (error) { toast.error("Failed to update order"); return; }
    toast.success("Order marked as served");
    load();
    onOrdersUpdated();
  }

  async function closeTable() {
    if (!confirm(`Close all orders for Table ${tableNumber}? This marks all as completed.`)) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({ status: "completed" })
      .eq("source", "table")
      .eq("table_number", tableNumber)
      .eq("status", "pending");
    if (error) { toast.error("Failed to close table"); return; }
    toast.success(`Table ${tableNumber} closed`);
    load();
    onOrdersUpdated();
    onClose();
  }

  const pending = orders.filter((o) => o.status === "pending");
  const completed = orders.filter((o) => o.status === "completed");
  const grandTotal = orders.reduce((s, o) => s + o.total_amount, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">Table {tableNumber}</h2>
          <p className="text-xs text-zinc-400">
            {orders.length} order{orders.length !== 1 ? "s" : ""} &middot; RM {grandTotal.toFixed(2)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
            <Clock className="h-8 w-8 mb-2" />
            <p className="text-sm">No orders yet for this table.</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Pending ({pending.length})
                </p>
                <div className="space-y-2">
                  {pending.map((order, idx) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-amber-200 bg-amber-50 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-amber-800">
                          Round {idx + 1} &middot; {order.order_number}
                        </span>
                        <span className="text-xs text-amber-700">
                          {new Date(order.created_at).toLocaleTimeString("en-MY", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <ul className="space-y-1 mb-3">
                        {order.order_items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-zinc-800">
                              {item.quantity}x {item.product_name}
                            </span>
                            <span className="text-zinc-600 tabular-nums">
                              RM {item.subtotal.toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-700">
                          RM {order.total_amount.toFixed(2)}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => markComplete(order.id)}
                          disabled={completing === order.id}
                          className={cn(
                            "h-7 text-xs",
                            "bg-zinc-900 hover:bg-zinc-700 text-white"
                          )}
                        >
                          <CheckCheck className="mr-1 h-3 w-3" />
                          {completing === order.id ? "Saving..." : "Mark Served"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Served ({completed.length})
                </p>
                <div className="space-y-2">
                  {completed.map((order, idx) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 opacity-70"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-zinc-500">
                          Round {pending.length + idx + 1} &middot; {order.order_number}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {new Date(order.created_at).toLocaleTimeString("en-MY", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <ul className="space-y-0.5">
                        {order.order_items.map((item) => (
                          <li key={item.id} className="flex justify-between text-xs text-zinc-500">
                            <span>{item.quantity}x {item.product_name}</span>
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

      {orders.length > 0 && (
        <div className="border-t border-zinc-200 px-4 py-3 space-y-2">
          <div className="flex justify-between text-sm font-bold text-zinc-900">
            <span>Grand Total</span>
            <span>RM {grandTotal.toFixed(2)}</span>
          </div>
          {pending.length > 0 && (
            <Button
              variant="outline"
              className="w-full h-10 text-sm font-semibold border-green-300 text-green-700 hover:bg-green-50"
              onClick={closeTable}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Serve All &amp; Close Table
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
