import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getTier, TIERS, TIER_BENEFITS } from "@/lib/tiers";
import { ChevronLeft, Cake, Star, Check, Tag, RefreshCw, ShieldCheck } from "lucide-react";

export default async function BenefitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("loyalty_points")
    .eq("id", user.id)
    .single();
  const loyaltyPoints = profile?.loyalty_points ?? 0;
  const currentTier = getTier(loyaltyPoints);

  return (
    <div className="flex flex-col bg-zinc-50 min-h-screen pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-100 bg-white px-4 py-3">
        <Link href="/dashboard" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <p className="text-sm font-bold text-zinc-900">Member Benefits</p>
        <span className="ml-auto rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
          {currentTier.name}
        </span>
      </div>

      {/* Horizontal scrollable tier cards */}
      <div className="overflow-x-auto px-4 py-5">
        <div className="flex gap-3" style={{ width: "max-content" }}>
          {TIER_BENEFITS.map((b) => {
            const tierDef = TIERS.find(t => t.name === b.tier)!;
            const isCurrent = b.tier === currentTier.name;
            const isUnlocked = loyaltyPoints >= tierDef.min;
            return (
              <div
                key={b.tier}
                style={{ width: "68vw", maxWidth: "260px" }}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tierDef.gradient} p-5 shadow-lg flex-shrink-0 ${!isUnlocked ? "opacity-55" : ""}`}
              >
                <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
                {isCurrent && (
                  <span className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tierDef.badgeBg} ${tierDef.badgeText}`}>
                    Current
                  </span>
                )}
                <p className="text-2xl mb-1">{b.icon}</p>
                <p className="text-xl font-black text-white">{b.tier}</p>
                <p className="text-xs text-white/60 mt-0.5">
                  {tierDef.max === Infinity
                    ? `${tierDef.min.toLocaleString()}+ pts`
                    : `${tierDef.min.toLocaleString()} – ${tierDef.max.toLocaleString()} pts`}
                </p>
                <div className="mt-3 space-y-1 text-xs text-white/80">
                  {tierDef.orderDiscount > 0
                    ? <p>+ {tierDef.orderDiscount}% off every order</p>
                    : <p className="text-white/40">+ No order discount</p>}
                  {b.monthlyRewards.length > 0
                    ? b.monthlyRewards.map((r, i) => <p key={i}>+ {r} (monthly)</p>)
                    : <p className="text-white/40">+ No monthly reward</p>}
                  {b.birthday.length > 0
                    ? b.birthday.map((g, i) => <p key={i}>+ {g} (birthday)</p>)
                    : <p className="text-white/40">+ No birthday gift</p>}
                </div>
                {tierDef.maintenanceOrdersPerYear > 0 && (
                  <div className="mt-3 rounded-xl bg-white/10 px-3 py-1.5 text-center">
                    <p className="text-[11px] text-white/70">Maintain: {tierDef.maintenanceOrdersPerYear} orders/year</p>
                  </div>
                )}
                {!isUnlocked && (
                  <div className="mt-2 rounded-xl bg-white/10 px-3 py-1.5 text-center">
                    <p className="text-[11px] text-white/70">{(tierDef.min - loyaltyPoints).toLocaleString()} pts to unlock</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 space-y-6">

        {/* Member Discount */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4 text-emerald-500" />
            <h2 className="text-base font-black text-zinc-900">Order Discount</h2>
            <span className="ml-auto text-xs text-zinc-400">Auto-applied at checkout</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {TIERS.map(tier => {
              const unlocked = loyaltyPoints >= tier.min;
              const isCurrent = tier.name === currentTier.name;
              return (
                <div
                  key={tier.name}
                  className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-center transition-all
                    ${isCurrent ? "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-400/40" : unlocked ? "border-emerald-100 bg-emerald-50/50" : "border-zinc-100 bg-zinc-50 opacity-45"}`}
                >
                  {isCurrent && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      Your Tier
                    </span>
                  )}
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mt-1">{tier.name}</p>
                  {tier.orderDiscount > 0
                    ? <p className={`text-2xl font-black ${unlocked ? "text-emerald-600" : "text-zinc-300"}`}>{tier.orderDiscount}%</p>
                    : <p className="text-2xl font-black text-zinc-300">—</p>}
                  <p className={`text-[11px] ${unlocked ? "text-emerald-700" : "text-zinc-400"}`}>
                    {tier.orderDiscount > 0 ? "off every order" : "No discount"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Monthly Rewards */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="h-4 w-4 text-violet-500" />
            <h2 className="text-base font-black text-zinc-900">Monthly Rewards</h2>
            <span className="ml-auto text-xs text-zinc-400">Resets 1st of every month</span>
          </div>
          <div className="space-y-2">
            {TIER_BENEFITS.map(b => {
              const tierDef = TIERS.find(t => t.name === b.tier)!;
              const unlocked = loyaltyPoints >= tierDef.min;
              const isCurrent = b.tier === currentTier.name;
              return (
                <div key={b.tier} className={`flex items-center gap-3 rounded-2xl border px-4 py-3
                  ${isCurrent ? "border-violet-200 bg-violet-50" : unlocked ? "border-violet-100 bg-violet-50/50" : "border-zinc-100 bg-zinc-50 opacity-50"}`}>
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black
                    ${unlocked ? "bg-violet-200 text-violet-800" : "bg-zinc-200 text-zinc-400"}`}>{b.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">{b.tier}</p>
                    {b.monthlyRewards.length > 0
                      ? b.monthlyRewards.map((r, i) => (
                          <p key={i} className={`text-sm font-medium mt-0.5 ${unlocked ? "text-violet-700" : "text-zinc-400"}`}>• {r}</p>
                        ))
                      : <p className="text-sm text-zinc-400 mt-0.5">— No monthly reward</p>}
                  </div>
                  {isCurrent && b.monthlyRewards.length > 0 && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-zinc-400 text-center">Vouchers are auto-issued to your account on the 1st of each month.</p>
        </section>

        {/* Birthday Gifts */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Cake className="h-4 w-4 text-pink-500" />
            <h2 className="text-base font-black text-zinc-900">Birthday Gifts</h2>
          </div>
          <div className="space-y-2">
            {TIER_BENEFITS.map(b => {
              const tierDef = TIERS.find(t => t.name === b.tier)!;
              const unlocked = loyaltyPoints >= tierDef.min;
              const isCurrent = b.tier === currentTier.name;
              return (
                <div key={b.tier} className={`flex items-center gap-3 rounded-2xl border px-4 py-3
                  ${isCurrent ? "border-pink-200 bg-pink-50" : unlocked ? "border-pink-100 bg-pink-50/50" : "border-zinc-100 bg-zinc-50 opacity-50"}`}>
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black
                    ${unlocked ? "bg-pink-200 text-pink-800" : "bg-zinc-200 text-zinc-400"}`}>{b.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">{b.tier}</p>
                    {b.birthday.length > 0
                      ? b.birthday.map((g, i) => (
                          <p key={i} className={`text-sm font-medium mt-0.5 ${unlocked ? "text-pink-700" : "text-zinc-400"}`}>• {g}</p>
                        ))
                      : <p className="text-sm text-zinc-400 mt-0.5">— No birthday gift</p>}
                  </div>
                  {isCurrent && b.birthday.length > 0 && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-zinc-400 text-center">Set your birthday in Profile. Vouchers are valid on your birthday only.</p>
        </section>

        {/* Tier Maintenance */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            <h2 className="text-base font-black text-zinc-900">Tier Maintenance</h2>
            <span className="ml-auto text-xs text-zinc-400">Evaluated every 12 months</span>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 space-y-3">
            <p className="text-xs text-amber-800">To keep your tier, you need to place the following number of orders within any rolling 12-month window:</p>
            <div className="space-y-2">
              {TIERS.filter(t => t.maintenanceOrdersPerYear > 0).map(tier => {
                const isCurrent = tier.name === currentTier.name;
                return (
                  <div key={tier.name} className={`flex items-center justify-between rounded-xl px-3 py-2
                    ${isCurrent ? "bg-amber-200/60 font-semibold" : "bg-white/60"}`}>
                    <span className="text-sm text-amber-900">{tier.name}</span>
                    <span className="text-sm font-bold text-amber-700">{tier.maintenanceOrdersPerYear} orders / year</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-amber-700">If you fall below the requirement, you drop to the next lower tier at your annual review.</p>
          </div>
        </section>

        {/* Welcome vouchers info */}
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-800 mb-1">Welcome Vouchers</p>
          <p className="text-xs text-emerald-700">Every new member receives:</p>
          <ul className="mt-2 space-y-1 text-xs text-emerald-700">
            <li>• 1x Free Drink voucher (no expiry)</li>
            <li>• 1x RM5 OFF voucher with 10 uses (valid 3 months)</li>
          </ul>
          <p className="mt-2 text-xs text-emerald-600">Check your vouchers in the <strong>Vouchers</strong> tab.</p>
        </section>

      </div>
    </div>
  );
}
