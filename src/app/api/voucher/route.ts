import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const admin = createAdminClient();
  const { data: voucher, error } = await admin
    .from("vouchers")
    .select("id, code, label, discount_type, discount_value, description, is_used, type, max_uses, uses_remaining")
    .eq("code", code)
    .single();

  if (error || !voucher) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
  if (voucher.is_used || voucher.uses_remaining <= 0) {
    return NextResponse.json({ error: "Voucher fully used" }, { status: 400 });
  }

  return NextResponse.json({ voucher });
}

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await request.json().catch(() => null);
    if (!body?.code || !body?.order_number) {
      return NextResponse.json({ error: "Missing code or order_number" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: voucher, error: fetchErr } = await admin
      .from("vouchers")
      .select("id, is_used, uses_remaining")
      .eq("code", String(body.code).toUpperCase())
      .single();

    if (fetchErr || !voucher) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    if (voucher.is_used || voucher.uses_remaining <= 0) {
      return NextResponse.json({ error: "Voucher fully used" }, { status: 400 });
    }

    const newUsesRemaining = voucher.uses_remaining - 1;
    const nowFullyUsed = newUsesRemaining <= 0;

    const { error: updateErr } = await admin
      .from("vouchers")
      .update({
        uses_remaining: newUsesRemaining,
        is_used: nowFullyUsed,
        ...(nowFullyUsed ? { used_at: new Date().toISOString() } : {}),
        used_in_order: String(body.order_number),
      })
      .eq("id", voucher.id);

    if (updateErr) return NextResponse.json({ error: "Failed to update voucher" }, { status: 500 });
    return NextResponse.json({ success: true, uses_remaining: newUsesRemaining });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
