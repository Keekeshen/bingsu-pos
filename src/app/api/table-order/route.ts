import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type OrderItem = {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
};

type Body = {
  table_number: string;
  items: OrderItem[];
  note?: string;
};

function err(msg: string, status: number) {
  return NextResponse.json({ error: msg }, { status });
}

function validate(body: unknown): body is Body {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (typeof b.table_number !== "string" || !b.table_number.trim()) return false;
  if (!Array.isArray(b.items) || b.items.length === 0) return false;
  for (const item of b.items as unknown[]) {
    if (!item || typeof item !== "object") return false;
    const i = item as Record<string, unknown>;
    if (
      typeof i.product_id !== "string" ||
      typeof i.product_name !== "string" ||
      typeof i.unit_price !== "number" || i.unit_price < 0 ||
      typeof i.quantity !== "number" || i.quantity < 1 || !Number.isInteger(i.quantity)
    ) return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return err("Invalid JSON", 400); }
    if (!validate(body)) return err("Invalid request body", 400);

    const { table_number, items, note } = body;
    const admin = createAdminClient();
    const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const orderNumber = `T${table_number.trim()}-${Date.now()}`;

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        order_number: orderNumber,
        table_number: table_number.trim(),
        source: "table",
        status: "pending",
        subtotal: +subtotal.toFixed(2),
        total_amount: +subtotal.toFixed(2),
        customer_id: null,
        points_redeemed: 0,
        note: note?.trim() || null,
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      console.error("[table-order] insert:", orderError);
      return err("Failed to create order", 500);
    }

    const orderItems = items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      product_name: i.product_name,
      unit_price: i.unit_price,
      quantity: i.quantity,
      subtotal: +(i.unit_price * i.quantity).toFixed(2),
    }));

    const { error: itemsError } = await admin.from("order_items").insert(orderItems);
    if (itemsError) {
      await admin.from("orders").delete().eq("id", order.id);
      console.error("[table-order] items:", itemsError);
      return err("Failed to save items", 500);
    }

    return NextResponse.json(
      { order_id: order.id, order_number: order.order_number },
      { status: 201 }
    );
  } catch (e) {
    console.error("[table-order] unexpected:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
