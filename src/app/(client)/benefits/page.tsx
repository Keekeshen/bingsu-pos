import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getTier, TIERS } from "@/components/client/LoyaltyCard";
import { ChevronLeft, Gift, Cake, Star, Check } from "lucide-react";

const TIER_BENEFITS = [
  {
    tier: "Bronze",
    memberReward: "5% OFF all purchases",
    birthday: ["1x Free Dessert Drink"],
    memberDay: "10% OFF on Member's Day",
    color: "from-amber-800 via-amber-700 to-stone-800",
    badge: "bg-amber-700/30 text-amber-100",
    icon: "🥉",
  },
  {
    tier: "Silver",
    memberReward: "10% OFF all purchases",
    birthday: ["1x Free Dessert Drink", "Small Birthday Gift"],
    memberDay: "12% OFF on Member's Day",
    color: "from-slate-500 via-slate-400 to-slate-600",
    badge: "bg-slate-400/30 text-slate-100",
    icon: "🥈",
  },
  {
    tier: "Gold",
    memberReward: "15% OFF all purchases",
    birthday: ["1x Free Dessert Drink", "Exclusive Merchandise"],
    memberDay: "15% OFF on Member's Day",
    color: "from-yellow-600 via-amber-500 to-yellow-700",
    badge: "bg-yellow-500/30 text-yellow-50",
    icon: "🥇",
  },
  {
    tier: "Platinum",
    memberReward: "20% OFF all purchases",
    birthday: ["1x Free Dessert Drink", "Premium Gift Set"],
    memberDay: "20% OFF on Member's Day",
    color: "from-violet-700 via-purple-600 to-indigo-800",
    badge: "bg-violet-500/30 text-violet-100",
    icon: "💎",
  },
];

export default async function BenefitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("loyalty_points").eq("id", user.id).single();
  const loyaltyPoints = profile?.loyalty_points ?? 0;
  const currentTier = getTier(loyaltyPoints);

  return (
    <div className="flex flex-col bg-zinc-50 min-h-screen pb-24">
      {/* Back header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-100 bg-white px-4 py-3">
        <Link href="/dashboard" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <p className="text-sm font-bold text-zinc-900">Member Benefits</p>
      </div>

      {/* Horizontal scrollable tier cards */}
      <div className="flex gap-3 overflow-x-auto px-4 py-5 scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
        {TIER_BENEFITS.map((b) => {
          const tierDef = TIERS.find(t => t.name === b.tier)!;
          const isCurrent = b.tier === currentTier.name;
          const isUnlocked = loyaltyPoints >= tierDef.min;
          return (
            <div
              key={b.tier}
              style={{ scrollSnapAlign: "start", minWidth: "72vw", maxWidth: "72vw" }}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${b.color} p-5 shadow-lg ${!isUnlocked ? "opacity-60" : ""}`}
            >
              <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
              {isCurrent && (
                <span className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${b.badge}`}>
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
              <div className="mt-3 space-y-1.5 text-xs text-white/80">
                <p>✦ {b.memberReward}</p>
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
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${unlocked ? "bg-amber-100" : "bg-zinc-100"}`}>
                    {b.icon}
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{b.tier}</p>
                  <p className={`text-sm font-bold ${unlocked ? "text-amber-700" : "text-zinc-400"}`}>{b.memberReward}</p>
                  {unlocked && <Check className="h-4 w-4 text-emerald-500" />}
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
                    <div className="mt-0.5 space-y-0.5">
                      {b.birthday.map((g, i) => (
                        <p key={i} className={`text-sm font-medium ${unlocked ? "text-pink-700" : "text-zinc-400"}`}>• {g}</p>
                      ))}
                    </div>
                  </div>
                  {unlocked && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                </div>
              );
            })}
          </div>
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
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${unlocked ? "bg-violet-100" : "bg-zinc-100"}`}>
                    {b.icon}
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{b.tier}</p>
                  <p className={`text-sm font-bold ${unlocked ? "text-violet-700" : "text-zinc-400"}`}>{b.memberDay}</p>
                  {unlocked && <Check className="h-4 w-4 text-emerald-500" />}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-zinc-400">Member&apos;s Day is on the 15th of every month. Present your member QR to enjoy the discount.</p>
        </section>
      </div>
    </div>
  );
}
