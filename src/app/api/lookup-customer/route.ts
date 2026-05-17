import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  // 1) Try exact phone match
  const byPhone = await admin
    .from("profiles")
    .select("id, full_name, loyalty_points, phone")
    .eq("phone", q)
    .maybeSingle();
  if (byPhone.data) return NextResponse.json({ customer: byPhone.data });

  // 2) Try UUID id match
  const uuidRe = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
  if (uuidRe.test(q)) {
    const byId = await admin
      .from("profiles")
      .select("id, full_name, loyalty_points, phone")
      .eq("id", q)
      .maybeSingle();
    if (byId.data) return NextResponse.json({ customer: byId.data });
  }

  // 3) Try partial name match
  const byName = await admin
    .from("profiles")
    .select("id, full_name, loyalty_points, phone")
    .ilike("full_name", `%${q}%`)
    .eq("role", "client")
    .limit(1)
    .maybeSingle();
  if (byName.data) return NextResponse.json({ customer: byName.data });

  return NextResponse.json({ error: "Customer not found" }, { status: 404 });
}