import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getTier, TIERS, TIER_BENEFITS } from "@/lib/tiers";
import { ChevronLeft, Gift, Cake, Star, Check, Minus } from "lucide-react";

export default async function BenefitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("loyalty_points").eq("id", user.id).single();
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
                  {b.memberReward
                    ? <p>✦ {b.memberReward} (member reward)</p>
                    : <p className="text-white/40">✦ No member reward</p>}
                  {b.birthday.map((g, i) => <p key={i}>✦ {g} (birthday)</p>)}
                  <p>✦ {b.memberDay}</p>
                </div>
                {!isUnlocked && (
                  <div className="mt-3 rounded-xl bg-white/10 px-3 py-1.5 text-center">
                    <p className="text-[11px] text-white/70">{(tierDef.min - loyaltyPoints).toLocaleString()} pts to unlock</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Member Rewards */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-amber-500" />
            <h2 className="text-base font-black text-zinc-900">Member Rewards</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {TIER_BENEFITS.map(b => {
              const tierDef = TIERS.find(t => t.name === b.tier)!;
              const unlocked = loyaltyPoints >= tierDef.min;
              return (
                <div key={b.tier} className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center ${unlocked ? "border-amber-100 bg-amber-50" : "border-zinc-100 bg-zinc-50 opacity-50"}`}>
                  <span className="text-2xl">{b.icon}</span>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{b.tier}</p>
                  {b.memberReward
                    ? <p className={`text-sm font-bold leading-tight ${unlocked ? "text-amber-700" : "text-zinc-400"}`}>{b.memberReward}</p>
                    : <span className="flex items-center gap-1 text-xs text-zinc-400"><Minus className="h-3 w-3" /> None</span>}
                  {unlocked && b.memberReward && <Check className="h-4 w-4 text-emerald-500" />}
                </div>
              );
            })}
          </div>
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
              return (
                <div key={b.tier} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${unlocked ? "border-pink-100 bg-pink-50" : "border-zinc-100 bg-zinc-50 opacity-50"}`}>
                  <span className="text-2xl shrink-0">{b.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">{b.tier}</p>
                    {b.birthday.map((g, i) => (
                      <p key={i} className={`text-sm font-medium mt-0.5 ${unlocked ? "text-pink-700" : "text-zinc-400"}`}>• {g}</p>
                    ))}
                  </div>
                  {unlocked && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-zinc-400 text-center">Show your member QR to cashier in your birthday month.</p>
        </section>

        {/* Member's Day */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Gift className="h-4 w-4 text-violet-500" />
            <h2 className="text-base font-black text-zinc-900">Member&apos;s Day</h2>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-600">Every 15th</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {TIER_BENEFITS.map(b => {
              const tierDef = TIERS.find(t => t.name === b.tier)!;
              const unlocked = loyaltyPoints >= tierDef.min;
              return (
                <div key={b.tier} className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center ${unlocked ? "border-violet-100 bg-violet-50" : "border-zinc-100 bg-zinc-50 opacity-50"}`}>
                  <span className="text-2xl">{b.icon}</span>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{b.tier}</p>
                  <p className={`text-sm font-bold leading-tight ${unlocked ? "text-violet-700" : "text-zinc-400"}`}>{b.memberDay}</p>
                  {unlocked && <Check className="h-4 w-4 text-emerald-500" />}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-zinc-400">Present your member QR on the 15th of every month to enjoy the discount.</p>
        </section>

        {/* Welcome vouchers info */}
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-800 mb-1">🎁 Welcome Vouchers</p>
          <p className="text-xs text-emerald-700">Every new member receives:</p>
          <ul className="mt-2 space-y-1 text-xs text-emerald-700">
            <li>• 1× Free Drink voucher</li>
            <li>• 10× RM5 OFF discount vouchers</li>
          </ul>
          <p className="mt-2 text-xs text-emerald-600">Check your vouchers in the <strong>Vouchers</strong> tab.</p>
        </section>
      </div>
    </div>
  );
}
