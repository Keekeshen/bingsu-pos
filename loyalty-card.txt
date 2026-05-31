"use client";

type Tier = { name: string; min: number; max: number; color: string; bg: string; badge: string };

const TIERS: Tier[] = [
  { name: "Bronze", min: 0,    max: 999,  color: "from-amber-900 via-amber-800 to-stone-900", bg: "bg-amber-900/20", badge: "bg-amber-800/60 text-amber-200" },
  { name: "Silver", min: 1000, max: 2999, color: "from-slate-600 via-slate-500 to-slate-800", bg: "bg-slate-500/20", badge: "bg-slate-600/60 text-slate-200" },
  { name: "Gold",   min: 3000, max: Infinity, color: "from-yellow-700 via-amber-500 to-yellow-800", bg: "bg-yellow-500/20", badge: "bg-yellow-600/60 text-yellow-100" },
];

function getTier(pts: number) { return TIERS.find(t => pts >= t.min && pts <= t.max) ?? TIERS[0]; }
function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }

type Props = { fullName: string; loyaltyPoints: number; nextThreshold: number; userId: string };

export default function LoyaltyCard({ fullName, loyaltyPoints, nextThreshold, userId }: Props) {
  const firstName = fullName.split(" ")[0];
  const tier = getTier(loyaltyPoints);
  const nextTier = TIERS[TIERS.indexOf(tier) + 1];
  const progress = nextTier ? Math.min((loyaltyPoints - tier.min) / (nextTier.min - tier.min), 1) : 1;
  const ptsToNext = nextTier ? Math.max(nextTier.min - loyaltyPoints, 0) : 0;
  const shortId = userId.slice(-8).toUpperCase();

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tier.color} px-6 py-6 text-white shadow-xl`}>
      {/* Background circles */}
      <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
      <div aria-hidden className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5" />
      <div aria-hidden className="pointer-events-none absolute right-16 bottom-0 h-24 w-24 rounded-full bg-white/5" />

      {/* Top row */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/60">{greeting()},</p>
          <p className="text-base font-bold text-white">{firstName} 👋</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${tier.badge}`}>
          ❄️ {tier.name}
        </span>
      </div>

      {/* Points */}
      <div className="mt-5">
        <p className="text-[10px] uppercase tracking-widest text-white/50">Loyalty Points</p>
        <p className="mt-1 text-5xl font-black tabular-nums leading-none">
          {loyaltyPoints.toLocaleString()}
          <span className="ml-2 text-lg font-semibold text-white/60">pts</span>
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-5 space-y-1.5">
        <div className="flex justify-between text-[11px] text-white/60">
          <span>{nextTier ? `Progress to ${nextTier.name}` : "Max tier reached 🎉"}</span>
          <span className="tabular-nums">{nextTier ? `${ptsToNext.toLocaleString()} pts to go` : "Gold Member"}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-white/80 transition-all duration-700 ease-out" style={{ width: `${progress * 100}%` }} />
        </div>
        {nextTier && (
          <div className="flex justify-between text-[10px] text-white/40">
            <span>{tier.name} ({tier.min.toLocaleString()})</span>
            <span>{nextTier.name} ({nextTier.min.toLocaleString()})</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">Koori Dessert</span>
        <span className="font-mono text-xs text-white/30">{shortId}</span>
      </div>
    </div>
  );
}
