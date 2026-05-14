$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$dashboard = @"
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import LoyaltyCard from "@/components/client/LoyaltyCard";
import QRDisplay from "@/components/client/QRDisplay";

type Profile = { full_name: string; loyalty_points: number };

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPointsEarned, setTotalPointsEarned] = useState(0);
  const [nextThreshold, setNextThreshold] = useState(500);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      const uid = session.user.id;
      setUserId(uid);
      const [{ data: prof }, { data: orders }, { data: reward }] = await Promise.all([
        supabase.from("profiles").select("full_name, loyalty_points").eq("id", uid).single(),
        supabase.from("orders").select("id, points_earned").eq("customer_id", uid).eq("status", "completed"),
        supabase.from("rewards").select("points_cost").eq("is_active", true).order("points_cost", { ascending: true }).limit(1).single(),
      ]);
      if (!prof) { window.location.href = "/login"; return; }
      setProfile(prof);
      setTotalOrders(orders?.length ?? 0);
      setTotalPointsEarned((orders ?? []).reduce((s, o) => s + (o.points_earned ?? 0), 0));
      setNextThreshold(reward?.points_cost ?? 500);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" /></div>;
  if (!profile) return null;

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <LoyaltyCard fullName={profile.full_name} loyaltyPoints={profile.loyalty_points ?? 0} nextThreshold={nextThreshold} />
      <section className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Your Loyalty QR</p>
        <QRDisplay userId={userId} fullName={profile.full_name} />
        <p className="mt-1 text-center text-sm text-zinc-500">Show this QR to the cashier to earn points</p>
      </section>
      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Total Orders" value={totalOrders.toLocaleString()} emoji="??" />
        <StatCard label="Points Earned" value={totalPointsEarned.toLocaleString()} emoji="?" sub="all time" />
      </section>
    </div>
  );
}

function StatCard({ label, value, emoji, sub }: { label: string; value: string; emoji: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">{label}</p>
        <span className="text-lg">{emoji}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-zinc-900">{value}</p>
      {sub && <p className="text-[10px] text-zinc-400">{sub}</p>}
    </div>
  );
}
"@
[System.IO.File]::WriteAllText("src\app\(client)\dashboard\page.tsx", $dashboard, $utf8NoBom)

$history = @"
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
"@
[System.IO.File]::WriteAllText("src\app\(client)\history\page.tsx", $history, $utf8NoBom)

$redeem = @"
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RedeemClient from "@/components/client/RedeemClient";

type Reward = { id: string; name: string; description: string | null; points_cost: number; discount_rm: number };

export default function RedeemPage() {
  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      const [{ data: prof }, { data: rewardList }] = await Promise.all([
        supabase.from("profiles").select("loyalty_points").eq("id", session.user.id).single(),
        supabase.from("rewards").select("*").eq("is_active", true).order("points_cost"),
      ]);
      setPoints(prof?.loyalty_points ?? 0);
      setRewards(rewardList ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" /></div>;
  return <RedeemClient initialPoints={points} rewards={rewards} />;
}
"@
[System.IO.File]::WriteAllText("src\app\(client)\redeem\page.tsx", $redeem, $utf8NoBom)

Write-Host "All pages updated"
