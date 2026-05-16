import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const tableNumber = String(body.table_number ?? "").trim();
    const paymentMethod = String(body.payment_method ?? "").trim();
    if (!tableNumber || !paymentMethod) {
      return NextResponse.json({ error: "Missing table_number or payment_method" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: orders, error: fetchError } = await admin
      .from("orders")
      .select("id, order_number")
      .eq("table_number", tableNumber)
      .eq("source", "table")
      .in("status", ["pending", "served"]);

    if (fetchError) {
      console.error("[table-checkout] fetch:", fetchError);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: "No active orders for this table" }, { status: 404 });
    }

    const ids = orders.map((o: { id: string }) => o.id);
    const { error: updateError } = await admin
      .from("orders")
      .update({ status: "completed", payment_method: paymentMethod })
      .in("id", ids);

    if (updateError) {
      console.error("[table-checkout] update:", updateError);
      return NextResponse.json({ error: "Failed to complete orders" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      order_number: orders[0].order_number,
      orders_completed: ids.length,
    });
  } catch (e) {
    console.error("[table-checkout] unexpected:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
