import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
type OrderItemInput = { product_id: string; product_name: string; unit_price: number; quantity: number; };
type CheckoutBody = { items: OrderItemInput[]; customer_id?: string | null; points_redeemed?: number; };
function err(m: string, s: number) { return NextResponse.json({ error: m }, { status: s }); }
function validateBody(body: unknown): body is CheckoutBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.items) || b.items.length === 0) return false;
  for (const item of b.items as unknown[]) {
    if (!item || typeof item !== "object") return false;
    const i = item as Record<string, unknown>;
    if (typeof i.product_id !== "string" || typeof i.product_name !== "string" || typeof i.unit_price !== "number" || i.unit_price < 0 || typeof i.quantity !== "number" || i.quantity < 1 || !Number.isInteger(i.quantity)) return false;
  }
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
    if (profile?.role !== "admin") return err("Forbidden", 403);
    const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    let pointsPerRm = 1;
    const { data: rule } = await admin.from("loyalty_rules").select("points_per_rm, min_spend").eq("is_active", true).order("created_at", { ascending: false }).limit(1).single();
    if (rule?.points_per_rm) pointsPerRm = rule.points_per_rm;
    const totalAmount = +(subtotal - +(points_redeemed * 0.01).toFixed(2)).toFixed(2);
    if (totalAmount < 0) return err("points_redeemed exceeds order value", 400);
    let customerProfile: { loyalty_points: number } | null = null;
    if (customer_id) {
      const { data: cp, error: cpErr } = await admin.from("profiles").select("loyalty_points").eq("id", customer_id).single();
      if (cpErr || !cp) return err("Customer not found", 400);
      customerProfile = cp;
      if (points_redeemed > cp.loyalty_points) return err("Insufficient customer points", 400);
    }
    const orderNumber = "BNG-" + Date.now();
    const { data: order, error: oErr } = await admin.from("orders").insert({ order_number: orderNumber, admin_id: user.id, customer_id, subtotal, points_redeemed, total_amount: totalAmount, status: "completed" }).select("id, order_number, created_at").single();
    if (oErr || !order) return err("Failed to create order", 500);
    const orderItems = items.map((i) => ({ order_id: order.id, product_id: i.product_id, product_name: i.product_name, unit_price: i.unit_price, quantity: i.quantity, subtotal: +(i.unit_price * i.quantity).toFixed(2) }));
    const { error: iErr } = await admin.from("order_items").insert(orderItems);
    if (iErr) { await admin.from("orders").delete().eq("id", order.id); return err("Failed to save items", 500); }
    let pointsEarned = 0;
    if (customer_id && customerProfile) {
      const meetsMin = !rule?.min_spend || totalAmount >= rule.min_spend;
      if (meetsMin) pointsEarned = Math.floor(totalAmount * pointsPerRm);
      await admin.from("profiles").update({ loyalty_points: Math.max(0, customerProfile.loyalty_points + pointsEarned - points_redeemed) }).eq("id", customer_id);
    }
    return NextResponse.json({ order_id: order.id, order_number: order.order_number, created_at: order.created_at, subtotal, points_redeemed, total_amount: totalAmount, points_earned: pointsEarned }, { status: 201 });
  } catch (e) {
    console.error("[checkout]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}