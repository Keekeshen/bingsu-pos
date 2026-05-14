"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import OrderAccordion from "@/components/client/OrderAccordion";

type OrderItem = { id: string; product_name: string; quantity: number; unit_price: number; subtotal: number };
type Order = { id: string; order_number: string; created_at: string; total_amount: number; points_earned: number; status: string; order_items: OrderItem[] };

export default function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      const { data } = await supabase.from("orders").select("*, order_items(*)").eq("customer_id", session.user.id).order("created_at", { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" /></div>;

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-bold text-zinc-900">Order History</h1>
      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-4xl">??</p>
          <p className="font-medium text-zinc-700">No orders yet</p>
          <p className="text-sm text-zinc-500">Your order history will appear here</p>
        </div>
      ) : orders.map(order => (
        <OrderAccordion key={order.id} orderId={order.id} orderNumber={order.order_number} date={new Date(order.created_at).toLocaleString()} totalAmount={order.total_amount} pointsEarned={order.points_earned} status={order.status} statusVariant={order.status === "completed" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"} items={order.order_items} />
      ))}
    </div>
  );
}