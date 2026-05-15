import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoyaltyCard from "@/components/client/LoyaltyCard";
import QRDisplay from "@/components/client/QRDisplay";
import MemberPerks from "@/components/client/MemberPerks";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: orderStats }, { data: rewards }] = await Promise.all([
    supabase.from("profiles").select("full_name, loyalty_points, birthday").eq("id", user.id).single(),
    supabase.from("orders").select("id").eq("customer_id", user.id).eq("status", "completed"),
    supabase.from("rewards").select("id, name, description, points_cost, discount_rm").eq("is_active", true).order("points_cost", { ascending: true }),
  ]);

  if (!profile) redirect("/login");

  const loyaltyPoints = profile.loyalty_points ?? 0;
  const totalOrders = orderStats?.length ?? 0;

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      {/* Membership card */}
      <LoyaltyCard
        fullName={profile.full_name}
        loyaltyPoints={loyaltyPoints}
        nextThreshold={1000}
        userId={user.id}
      />

      {/* QR code */}
      <section className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Your Member QR</p>
        <QRDisplay userId={user.id} fullName={profile.full_name} />
        <p className="text-center text-xs text-zinc-400">Show this to the cashier to earn or redeem points</p>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">Total Orders</p>
            <span className="text-lg">🧾</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-zinc-900">{totalOrders.toLocaleString()}</p>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">Current Points</p>
            <span className="text-lg">⭐</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-zinc-900">{loyaltyPoints.toLocaleString()}</p>
        </div>
      </div>

      {/* Member perks: birthday, member day, rewards */}
      <MemberPerks
        birthday={profile.birthday ?? null}
        loyaltyPoints={loyaltyPoints}
        rewards={rewards ?? []}
      />
    </div>
  );
}
