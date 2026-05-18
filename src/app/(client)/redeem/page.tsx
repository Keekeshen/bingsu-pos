export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RedeemClient from "@/components/client/RedeemClient";

export default async function RedeemPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: rewards }] = await Promise.all([
    supabase.from("profiles").select("loyalty_points, redeem_points").eq("id", user.id).single(),
    supabase.from("rewards").select("id, name, description, points_cost, discount_rm, image_url").eq("is_active", true).order("points_cost", { ascending: true }),
  ]);

  const redeemPoints = profile?.redeem_points ?? profile?.loyalty_points ?? 0;

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-bold text-zinc-900">Redeem Points</h1>
      <RedeemClient
        initialPoints={redeemPoints}
        rewards={rewards ?? []}
      />
    </div>
  );
}
