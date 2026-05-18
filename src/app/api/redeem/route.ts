import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function generateCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(request: NextRequest) {
  try {
    let reward_id: string | undefined;
    try {
      const body = await request.json();
      reward_id = typeof body?.reward_id === "string" ? body.reward_id : undefined;
    } catch { return err("Invalid JSON body", 400); }

    if (!reward_id) return err("reward_id is required", 400);

    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return err("Unauthorized", 401);

    const { data: profile } = await sessionClient.from("profiles").select("role, loyalty_points, redeem_points").eq("id", user.id).single();
    if (!profile) return err("Profile not found", 404);
    if (profile.role !== "client") return err("Forbidden", 403);

    const spendable = profile.redeem_points ?? profile.loyalty_points ?? 0;

    const admin = createAdminClient();
    const { data: reward, error: rewardError } = await admin.from("rewards").select("id, name, points_cost, discount_rm, is_active").eq("id", reward_id).single();
    if (rewardError || !reward) return err("Reward not found", 404);
    if (!reward.is_active) return err("This reward is no longer available", 409);
    if (spendable < reward.points_cost) return err(`Insufficient points. You have ${spendable} pts but need ${reward.points_cost} pts.`, 422);

    const redemptionCode = generateCode();
    const { data: redemption, error: redemptionError } = await admin
      .from("reward_redemptions")
      .insert({ profile_id: user.id, reward_id: reward.id, points_spent: reward.points_cost, discount_rm: reward.discount_rm, redemption_code: redemptionCode, status: "pending" })
      .select("id, redemption_code")
      .single();

    if (redemptionError || !redemption) { console.error("[redeem] insert error:", redemptionError); return err("Failed to create redemption", 500); }

    // Deduct from redeem_points only — loyalty_points stays intact for tier tracking
    const newRedeemBalance = spendable - reward.points_cost;
    const { error: pointsError } = await admin.from("profiles").update({ redeem_points: newRedeemBalance }).eq("id", user.id);

    if (pointsError) {
      await admin.from("reward_redemptions").delete().eq("id", redemption.id);
      console.error("[redeem] points deduction error:", pointsError);
      return err("Failed to deduct points — please try again", 500);
    }

    return NextResponse.json({ redemption_code: redemption.redemption_code, reward_name: reward.name, discount_rm: reward.discount_rm, points_spent: reward.points_cost, new_balance: newRedeemBalance }, { status: 201 });
  } catch (e) {
    console.error("[redeem] unexpected error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
