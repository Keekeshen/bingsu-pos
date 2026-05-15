import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: products, error } = await admin
      .from("products")
      .select("id, name, description, price, category, image_url")
      .eq("is_available", true)
      .order("category")
      .order("name");

    if (error) {
      console.error("[menu]", error);
      return NextResponse.json({ error: "Failed to load menu" }, { status: 500 });
    }

    return NextResponse.json({ products: (products ?? []).map(p => ({ ...p, price: parseFloat(String(p.price)) })), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[menu] unexpected:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
