"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import OrderAccordion from "@/components/client/OrderAccordion";

type Order = { id: string; order_number: string; created_at: string; total_amount: number; points_earned: number; status: string; order_items: { id: string; product_name: string; quantity: number; unit_price: number; subtotal: number }[] };

export default function HistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("orders").select("*, order_items(*)").eq("customer_id", user.id).order("created_at", { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

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
      ) : (
        orders.map(order => <OrderAccordion key={order.id} order={order} items={order.order_items} />)
      )}
    </div>
  );
}