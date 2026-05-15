"use client";

import Link from "next/link";
import { getTier, TIERS } from "@/lib/tiers";
import { ChevronRight } from "lucide-react";

type Props = {
  fullName: string;
  loyaltyPoints: number;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function LoyaltyCard({ fullName, loyaltyPoints }: Props) {
  const firstName = fullName.split(" ")[0];
  const currentTier = getTier(loyaltyPoints);
  const currentTierIdx = TIERS.findIndex(t => t.name === currentTier.name);
  const nextTier = TIERS[currentTierIdx + 1] ?? null;

  const progressMin = currentTier.min;
  const progressMax = nextTier ? nextTier.min : currentTier.min;
  const progress = nextTier
    ? Math.min((loyaltyPoints - progressMin) / (progressMax - progressMin), 1)
    : 1;
  const pointsToNext = nextTier ? Math.max(nextTier.min - loyaltyPoints, 0) : 0;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${currentTier.gradient} px-6 py-7 text-white shadow-lg`}>
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
      <div aria-hidden className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />

      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-white/70">{greeting()}, {firstName}</p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${currentTier.badgeBg} ${currentTier.badgeText}`}>
          {currentTier.name}
        </span>
      </div>

      <div className="mt-3">
        <p className="text-xs uppercase tracking-widest text-white/50">Loyalty Points</p>
        <p className="mt-1 text-5xl font-extrabold tabular-nums leading-none tracking-tight">
          {loyaltyPoints.toLocaleString()}
          <span className="ml-1.5 text-xl font-semibold text-white/50">pts</span>
        </p>
      </div>

      <div className="mt-6 space-y-1.5">
        <div className="flex justify-between text-xs text-white/60">
          <span>{nextTier ? `Progress to ${nextTier.name}` : "Maximum tier reached"}</span>
          {nextTier && <span className="tabular-nums">{pointsToNext.toLocaleString()} pts to go</span>}
        </div>
        <div className={`h-2 w-full overflow-hidden rounded-full ${currentTier.trackBg}`}>
          <div className="h-full rounded-full bg-white/80 transition-all duration-700 ease-out" style={{ width: `${progress * 100}%` }} />
        </div>
        {nextTier && (
          <p className="text-right text-[10px] text-white/40">{loyaltyPoints.toLocaleString()} / {nextTier.min.toLocaleString()} pts</p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white/40 tracking-widest">*</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-white/40">Koori Dessert</span>
        </div>
        <Link href="/benefits" className="flex items-center gap-0.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/25 transition-colors">
          View Benefits <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
