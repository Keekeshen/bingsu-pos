import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import OrderAccordion from "@/components/client/OrderAccordion";

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
  created_at: string;
  subtotal: number;
  total_amount: number;
  points_earned: number | null;
  status: string;
  voucher_code: string | null;
  discount_amount: number;
  order_items: OrderItem[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed": return "default";
    case "pending": return "secondary";
    case "cancelled": return "destructive";
    default: return "outline";
  }
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orders } = await supabase
    .from("orders")
    .select(`id, order_number, created_at, subtotal, total_amount, points_earned, status, voucher_code, discount_amount, order_items ( id, product_name, quantity, unit_price, subtotal )`)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const typedOrders = (orders ?? []) as Order[];

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-bold text-zinc-900">Order History</h1>
      {typedOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <span className="text-4xl">🧾</span>
          <p className="text-sm font-medium text-zinc-700">No orders yet</p>
          <p className="text-xs text-zinc-400">Your purchases will appear here after your first visit</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {typedOrders.map((order) => (
            <li key={order.id}>
              <OrderAccordion
                orderId={order.id}
                orderNumber={order.order_number}
                date={formatDate(order.created_at)}
                subtotal={order.subtotal}
                totalAmount={order.total_amount}
                pointsEarned={order.points_earned ?? 0}
                status={order.status}
                statusVariant={statusVariant(order.status)}
                items={order.order_items}
                voucherCode={order.voucher_code}
                discountAmount={order.discount_amount}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
