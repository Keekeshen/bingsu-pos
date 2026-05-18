export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RedeemClient from "@/components/client/RedeemClient";

export default async function RedeemPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: rewards }, { data: pendingRedemptions }] = await Promise.all([
    supabase.from("profiles").select("loyalty_points, redeem_points").eq("id", user.id).single(),
    supabase.from("rewards").select("id, name, description, points_cost, discount_rm, image_url").eq("is_active", true).order("points_cost", { ascending: true }),
    supabase.from("reward_redemptions")
      .select("id, redemption_code, discount_rm, created_at, rewards(name)")
      .eq("profile_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const redeemPoints = profile?.redeem_points ?? profile?.loyalty_points ?? 0;

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-bold text-zinc-900">Redeem Points</h1>
      <RedeemClient
        initialRedeemPoints={redeemPoints}
        rewards={rewards ?? []}
        initialPendingRedemptions={(pendingRedemptions ?? []).map((r) => {
          const rw = r.rewards as unknown;
          const rewardName = Array.isArray(rw)
            ? ((rw[0] as { name?: string })?.name ?? "Reward")
            : ((rw as { name?: string } | null)?.name ?? "Reward");
          return {
            id: r.id,
            redemption_code: r.redemption_code,
            discount_rm: r.discount_rm,
            reward_name: rewardName,
            created_at: r.created_at,
          };
        })}
      />
    </div>
  );
}
