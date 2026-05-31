"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TIERS, getTier } from "@/lib/tiers";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

type Props = { fullName: string; loyaltyPoints: number; userId: string };

export default function LoyaltyCard({ fullName, loyaltyPoints, userId }: Props) {
  const firstName = fullName.split(" ")[0];
  const tier = getTier(loyaltyPoints);
  const nextTier = TIERS[TIERS.indexOf(tier) + 1];
  const progress = nextTier
    ? Math.min((loyaltyPoints - tier.min) / (nextTier.min - tier.min), 1)
    : 1;
  const ptsToNext = nextTier ? Math.max(nextTier.min - loyaltyPoints, 0) : 0;
  const shortId = userId.slice(-8).toUpperCase();

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tier.gradient} shadow-xl`}>
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/5" />
      <div aria-hidden className="pointer-events-none absolute -bottom-8 right-16 h-36 w-36 rounded-full bg-white/5" />
      <div aria-hidden className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-white/5" />

      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs text-white/50 font-medium">{greeting()}</p>
            <p className="text-base font-bold text-white">{firstName} 👋</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${tier.badgeBg} ${tier.badgeText}`}>
            MY TIER
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-black text-white leading-tight">❄️ {tier.name}</p>
            <p className="text-xs text-white/50 mt-0.5 font-mono">{shortId}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black tabular-nums text-white leading-none">{loyaltyPoints.toLocaleString()}</p>
            <p className="text-xs text-white/50">points</p>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <div className={`h-2 w-full overflow-hidden rounded-full ${tier.trackBg}`}>
            <div className="h-full rounded-full bg-white/80 transition-all duration-700" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="text-[11px] text-white/50">
            {nextTier ? `${ptsToNext.toLocaleString()} pts to ${nextTier.name}` : "✨ Highest tier achieved!"}
          </p>
        </div>
      </div>

      <Link
        href="/benefits"
        className="flex items-center justify-end gap-1 border-t border-white/10 px-6 py-3 text-xs font-semibold text-white/70 hover:text-white transition-colors"
      >
        View My Benefits <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
