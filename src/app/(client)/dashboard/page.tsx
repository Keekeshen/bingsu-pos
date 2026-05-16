import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoyaltyCard from "@/components/client/LoyaltyCard";
import QRDisplay from "@/components/client/QRDisplay";
import { ShoppingBag, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";


export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: orderStats }] = await Promise.all([
    supabase.from("profiles").select("full_name, loyalty_points").eq("id", user.id).single(),
    supabase.from("orders").select("id, points_earned").eq("customer_id", user.id).eq("status", "completed"),
  ]);

  if (!profile) redirect("/login");

  const totalOrders = orderStats?.length ?? 0;
  const totalPointsEarned = (orderStats ?? []).reduce((sum, o) => sum + (o.points_earned ?? 0), 0);

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <LoyaltyCard fullName={profile.full_name} loyaltyPoints={profile.loyalty_points ?? 0} />

      <section className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Your Loyalty QR</p>
        <QRDisplay userId={user.id} fullName={profile.full_name} />
        <p className="mt-1 text-center text-sm text-zinc-500">Show this QR to the cashier to earn points</p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Total Orders" value={totalOrders.toLocaleString()} icon={ShoppingBag} />
        <StatCard label="Points Earned" value={totalPointsEarned.toLocaleString()} icon={Star} sub="all time" />
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string; icon: LucideIcon; sub?: string; }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-zinc-400" />
      </div>
      <p className="text-2xl font-bold tabular-nums text-zinc-900">{value}</p>
      {sub && <p className="text-[10px] text-zinc-400">{sub}</p>}
    </div>
  );
}
