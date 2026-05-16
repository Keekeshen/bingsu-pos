import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

function todayMY(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("birthday")
    .eq("id", user.id)
    .single();

  if (!profile?.birthday) {
    return NextResponse.json({ issued: false, reason: "no_birthday" });
  }

  const today = todayMY();
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  const [, bMonth, bDay] = profile.birthday.split("-").map(Number);

  if (todayMonth !== bMonth || todayDay !== bDay) {
    return NextResponse.json({ issued: false, reason: "not_birthday" });
  }

  const yearStart = `${todayYear}-01-01`;
  const yearEnd = `${todayYear}-12-31`;
  const { data: existing } = await admin
    .from("vouchers")
    .select("id")
    .eq("customer_id", user.id)
    .eq("type", "birthday_drink")
    .gte("created_at", yearStart)
    .lte("created_at", yearEnd + "T23:59:59")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ issued: false, reason: "already_issued" });
  }

  const expiresAt = `${today}T23:59:59+08:00`;
  const code = `BDAY-${user.id.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const { data: voucher, error } = await admin
    .from("vouchers")
    .insert({
      customer_id: user.id,
      code,
      type: "birthday_drink",
      label: "Birthday Free Drink",
      description: "Happy Birthday! Enjoy a free drink on us. Valid today only. One drink per redemption.",
      discount_type: "free_item",
      discount_value: 0,
      is_used: false,
      max_uses: 1,
      uses_remaining: 1,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error("Birthday voucher insert error:", error);
    return NextResponse.json({ error: "Failed to issue voucher" }, { status: 500 });
  }

  return NextResponse.json({ issued: true, voucher });
}