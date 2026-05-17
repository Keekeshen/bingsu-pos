import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { computeVoucherDiscount, tableBillTotals } from "@/lib/voucher-utils";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type OrderRow = { id: string; order_number: string; subtotal: number; customer_id: string | null };

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return err("Unauthorized", 401);

    const adminAuth = createAdminClient();
    const { data: { user }, error: userError } = await adminAuth.auth.getUser(token);
    if (userError || !user) return err("Unauthorized", 401);

    const { data: adminProfile } = await adminAuth
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (adminProfile?.role !== "admin") return err("Forbidden: admin role required", 403);

    const admin = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await request.json().catch(() => null);
    if (!body) return err("Invalid JSON", 400);

    const tableNumber = String(body.table_number ?? "").trim();
    const paymentMethod = String(body.payment_method ?? "").trim();
    if (!tableNumber || !paymentMethod) {
      return err("Missing table_number or payment_method", 400);
    }

    // Only fetch PENDING orders (not yet paid) — served = already paid
    const { data: orders, error: fetchError } = await admin
      .from("orders")
      .select("id, order_number, subtotal, customer_id")
      .eq("table_number", tableNumber)
      .eq("source", "table")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("[table-checkout] fetch:", fetchError);
      return err("Failed to fetch orders", 500);
    }

    const list = orders as OrderRow[] | null;
    if (!list?.length) {
      return err("No active orders for this table", 404);
    }

    const basketSubtotal = +list.reduce((s, o) => s + (Number(o.subtotal) || 0), 0).toFixed(2);

    const voucherCodeRaw = body.voucher_code ? String(body.voucher_code).trim().toUpperCase() : "";
    let voucherDiscountApplied = 0;

    if (voucherCodeRaw) {
      const { data: voucher, error: vErr } = await admin
        .from("vouchers")
        .select("id, code, discount_type, discount_value, is_used, uses_remaining")
        .eq("code", voucherCodeRaw)
        .maybeSingle();

      if (vErr || !voucher) return err("Voucher not found", 404);
      if (voucher.is_used || voucher.uses_remaining <= 0) {
        return err("Voucher fully used", 400);
      }

      voucherDiscountApplied = computeVoucherDiscount(basketSubtotal, {
        discount_type: String(voucher.discount_type ?? ""),
        discount_value: Number(voucher.discount_value) || 0,
      });

      const clientClaims = +(Number(body.discount_amount) || 0).toFixed(2);
      if (Math.abs(clientClaims - voucherDiscountApplied) > 0.02) {
        return err("Voucher discount mismatch — remove and scan the voucher again", 400);
      }
    } else if (+(Number(body.discount_amount) || 0).toFixed(2) !== 0) {
      return err("Discount supplied without voucher", 400);
    }

    const totals = tableBillTotals(basketSubtotal, voucherDiscountApplied);

    const paid = paymentMethod === "cash"
      ? +(parseFloat(String(body.amount_paid ?? "")) || 0).toFixed(2)
      : totals.total;
    if (paymentMethod === "cash" && paid + 1e-6 < totals.total) {
      return err(`Minimum RM ${totals.total.toFixed(2)}`, 400);
    }

    const allocations: Record<string, number> = {};
    if (totals.voucherDiscountApplied <= 0) {
      list.forEach((o) => { allocations[o.id] = 0; });
    } else if (list.length === 1) {
      allocations[list[0].id] = totals.voucherDiscountApplied;
    } else {
      let allocated = 0;
      const D = totals.voucherDiscountApplied;
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        let part = 0;
        if (i === list.length - 1) {
          part = +(D - allocated).toFixed(2);
        } else {
          part = +(D * (Number(o.subtotal) || 0) / basketSubtotal).toFixed(2);
          allocated += part;
        }
        allocations[o.id] = Math.max(0, part);
      }
    }

    // Set to "served" = paid but awaiting food delivery. "completed" happens when admin marks delivered.
    for (const o of list) {
      const patch = {
        status: "served" as const,
        payment_method: paymentMethod,
        voucher_code: voucherCodeRaw ? voucherCodeRaw : null,
        discount_amount: +(allocations[o.id] ?? 0).toFixed(2),
      };
      const { error: updErr } = await admin.from("orders").update(patch).eq("id", o.id);
      if (updErr) {
        console.error("[table-checkout] update row:", updErr);
        return err("Failed to complete orders", 500);
      }
    }

    // Award loyalty points to customer (use explicitly provided customer_id or fall back to first order's customer)
    const explicitCustomerId = body.customer_id ? String(body.customer_id).trim() : null;
    const orderCustomerId = list.find(o => o.customer_id)?.customer_id ?? null;
    const rewardCustomerId = explicitCustomerId ?? orderCustomerId;

    let pointsEarned = 0;
    if (rewardCustomerId) {
      const { data: loyaltyRule } = await admin
        .from("loyalty_rules")
        .select("points_per_rm, min_spend")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      const pointsPerRm = loyaltyRule?.points_per_rm ?? 1;
      const meetsMinSpend = !loyaltyRule?.min_spend || totals.total >= loyaltyRule.min_spend;
      if (meetsMinSpend) {
        pointsEarned = Math.floor(totals.total * pointsPerRm);
        if (pointsEarned > 0) {
          const { data: profile } = await admin.from("profiles").select("loyalty_points").eq("id", rewardCustomerId).single();
          if (profile) {
            await admin.from("profiles").update({ loyalty_points: (profile.loyalty_points ?? 0) + pointsEarned }).eq("id", rewardCustomerId);
          }
        }
      }
    }

    if (voucherCodeRaw) {
      const { data: voucher } = await admin
        .from("vouchers")
        .select("id, uses_remaining, is_used")
        .eq("code", voucherCodeRaw)
        .maybeSingle();

      if (voucher) {
        const newUsesRemaining = voucher.uses_remaining - 1;
        const nowFullyUsed = newUsesRemaining <= 0;
        await admin
          .from("vouchers")
          .update({
            uses_remaining: newUsesRemaining,
            is_used: nowFullyUsed,
            ...(nowFullyUsed ? { used_at: new Date().toISOString() } : {}),
            used_in_order: `${list[0]?.order_number ?? ""}|table:${tableNumber}`,
          })
          .eq("id", voucher.id);
      }
    }

    return NextResponse.json({
      success: true,
      order_number: list[0].order_number,
      orders_paid: list.length,
      subtotal_before_discount: basketSubtotal,
      voucher_discount: totals.voucherDiscountApplied,
      subtotal_after_discount: totals.taxableSubtotal,
      service_charge: totals.serviceCharge,
      rounding_adjustment: totals.rounding,
      total: totals.total,
      points_earned: pointsEarned,
      customer_id: rewardCustomerId,
    });
  } catch (e) {
    console.error("[table-checkout] unexpected:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
