"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LoyaltyCard from "@/components/client/LoyaltyCard";
import QRDisplay from "@/components/client/QRDisplay";

type Profile = { full_name: string; loyalty_points: number };

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPointsEarned, setTotalPointsEarned] = useState(0);
  const [nextThreshold, setNextThreshold] = useState(500);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      const [{ data: prof }, { data: orders }, { data: reward }] = await Promise.all([
        supabase.from("profiles").select("full_name, loyalty_points").eq("id", user.id).single(),
        supabase.from("orders").select("id, points_earned").eq("customer_id", user.id).eq("status", "completed"),
        supabase.from("rewards").select("points_cost").eq("is_active", true).order("points_cost", { ascending: true }).limit(1).single(),
      ]);
      if (!prof) { router.push("/login"); return; }
      setProfile(prof);
      setTotalOrders(orders?.length ?? 0);
      setTotalPointsEarned((orders ?? []).reduce((s, o) => s + (o.points_earned ?? 0), 0));
      setNextThreshold(reward?.points_cost ?? 500);
      setLoading(false);
    }
    load();
  }, [router]);

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
        <StatCard label="Total Orders" value={totalOrders.toLocaleString()} emoji="Receipt" />
        <StatCard label="Points Earned" value={totalPointsEarned.toLocaleString()} emoji="Star" sub="all time" />
      </section>
    </div>
  );
}

function StatCard({ label, value, emoji, sub }: { label: string; value: string; emoji: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">{label}</p>
        <span className="text-sm font-medium text-zinc-400">{emoji}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-zinc-900">{value}</p>
      {sub && <p className="text-[10px] text-zinc-400">{sub}</p>}
    </div>
  );
}