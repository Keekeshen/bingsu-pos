$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$content = @"
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
type OrderItemInput = {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
};
type CheckoutBody = {
  items: OrderItemInput[];
  customer_id?: string | null;
  points_redeemed?: number;
};
function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
function validateBody(body: unknown): body is CheckoutBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.items) || b.items.length === 0) return false;
  for (const item of b.items as unknown[]) {
    if (!item || typeof item !== "object") return false;
    const i = item as Record<string, unknown>;
    if (typeof i.product_id !== "string" || typeof i.product_name !== "string" || typeof i.unit_price !== "number" || i.unit_price < 0 || typeof i.quantity !== "number" || i.quantity < 1 || !Number.isInteger(i.quantity)) return false;
  }
  if (b.points_redeemed !== undefined && (typeof b.points_redeemed !== "number" || b.points_redeemed < 0 || !Number.isInteger(b.points_redeemed))) return false;
  return true;
}
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return err("Invalid JSON body", 400); }
    if (!validateBody(body)) return err("Invalid request body", 400);
    const { items, customer_id = null, points_redeemed = 0 } = body;
    const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim();
    if (!token) return err("Unauthorized", 401);
    const admin = createAdminClient();
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) return err("Unauthorized", 401);
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return err("Forbidden: admin role required", 403);
    const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    let pointsPerRm = 1;
    const { data: loyaltyRule } = await admin.from("loyalty_rules").select("points_per_rm, min_spend").eq("is_active", true).order("created_at", { ascending: false }).limit(1).single();
    if (loyaltyRule?.points_per_rm) pointsPerRm = loyaltyRule.points_per_rm;
    const POINT_VALUE_RM = 0.01;
    const pointsDiscountAmount = +(points_redeemed * POINT_VALUE_RM).toFixed(2);
    const totalAmount = +(subtotal - pointsDiscountAmount).toFixed(2);
    if (totalAmount < 0) return err("points_redeemed exceeds order value", 400);
    let customerProfile: { loyalty_points: number } | null = null;
    if (customer_id) {
      const { data: cp, error: cpError } = await admin.from("profiles").select("loyalty_points").eq("id", customer_id).single();
      if (cpError || !cp) return err("Customer not found", 400);
      customerProfile = cp;
      if (points_redeemed > cp.loyalty_points) return err(`Customer only has `${cp.loyalty_points} points available`, 400);
    } else if (points_redeemed > 0) {
      return err("Cannot redeem points without a customer_id", 400);
    }
    const orderNumber = `BNG-`${Date.now()}`;
    const { data: order, error: orderError } = await admin.from("orders").insert({ order_number: orderNumber, admin_id: user.id, customer_id, subtotal, points_redeemed, total_amount: totalAmount, status: "completed" }).select("id, order_number, created_at").single();
    if (orderError || !order) { console.error("[checkout] order insert error:", orderError); return err("Failed to create order", 500); }
    const orderItems = items.map((item) => ({ order_id: order.id, product_id: item.product_id, product_name: item.product_name, unit_price: item.unit_price, quantity: item.quantity, subtotal: +(item.unit_price * item.quantity).toFixed(2) }));
    const { error: itemsError } = await admin.from("order_items").insert(orderItems);
    if (itemsError) { await admin.from("orders").delete().eq("id", order.id); return err("Failed to save order items", 500); }
    let pointsEarned = 0;
    if (customer_id && customerProfile) {
      const meetsMinSpend = !loyaltyRule?.min_spend || totalAmount >= loyaltyRule.min_spend;
      if (meetsMinSpend) pointsEarned = Math.floor(totalAmount * pointsPerRm);
      const netDelta = pointsEarned - points_redeemed;
      await admin.from("profiles").update({ loyalty_points: Math.max(0, customerProfile.loyalty_points + netDelta) }).eq("id", customer_id);
    }
    return NextResponse.json({ order_id: order.id, order_number: order.order_number, created_at: order.created_at, subtotal, points_redeemed, total_amount: totalAmount, points_earned: pointsEarned }, { status: 201 });
  } catch (e) {
    console.error("[checkout] unexpected error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
"@
[System.IO.File]::WriteAllText("src\app\api\checkout\route.ts", $content, $utf8NoBom)
Write-Host "Done"
