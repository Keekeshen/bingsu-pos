import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateOrderNumber } from "@/lib/order-number";

const TABLE_SLUG_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function err(msg: string, status: number) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any;
    try {
      body = await request.json();
    } catch {
      return err("Invalid JSON", 400);
    }

    const tableSlugRaw = typeof body.table_slug === "string" ? body.table_slug.trim() : "";
    if (!tableSlugRaw || !TABLE_SLUG_RE.test(tableSlugRaw)) {
      return err("Missing or invalid table_slug", 400);
    }

    const rawItems = body.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return err("Missing items", 400);
    }

    type Item = { product_id: string; product_name: string; unit_price: number; quantity: number; };
    const items: Item[] = rawItems.map((i: unknown) => {
      const x = i as Record<string, unknown>;
      return {
        product_id: String(x.product_id ?? ""),
        product_name: String(x.product_name ?? "Unknown"),
        unit_price: Math.max(0, Number(x.unit_price) || 0),
        quantity: Math.max(1, Math.round(Number(x.quantity) || 1)),
      };
    }).filter((i) => i.product_id && i.unit_price > 0);

    if (items.length === 0) return err("No valid items", 400);

    const customerId = body.customer_id ? String(body.customer_id) : null;
    const admin = createAdminClient();

    const { data: tableRow } = await admin
      .from("tables")
      .select("table_number")
      .eq("id", tableSlugRaw)
      .maybeSingle();

    if (!tableRow?.table_number) return err("Table not found", 404);

    const tableNumber = String(tableRow.table_number);

    const subtotal = +items.reduce((s, i) => s + i.unit_price * i.quantity, 0).toFixed(2);
    const orderNumber = await generateOrderNumber();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        order_number: orderNumber,
        table_number: tableNumber,
        source: "table",
        status: "pending",
        subtotal,
        total_amount: subtotal,
        customer_id: customerId,
        points_redeemed: 0,
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
