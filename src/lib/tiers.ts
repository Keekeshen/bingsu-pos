export type Tier = {
  name: string;
  min: number;
  max: number;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  trackBg: string;
  orderDiscount: number;       // % off every order at POS
  maintenanceOrdersPerYear: number; // orders needed per 12 months to keep tier (0 = no requirement)
};

export const TIERS: Tier[] = [
  { name: "Bronze",   min: 0,   max: 99,       orderDiscount: 0,  maintenanceOrdersPerYear: 0,  gradient: "from-amber-800 via-amber-700 to-stone-800",      badgeBg: "bg-amber-900/50",  badgeText: "text-amber-100",  trackBg: "bg-white/15" },
  { name: "Silver",   min: 100, max: 299,      orderDiscount: 10, maintenanceOrdersPerYear: 10, gradient: "from-slate-500 via-slate-400 to-slate-600",      badgeBg: "bg-slate-600/50",  badgeText: "text-slate-100",  trackBg: "bg-white/15" },
  { name: "Gold",     min: 300, max: 799,      orderDiscount: 12, maintenanceOrdersPerYear: 25, gradient: "from-yellow-600 via-amber-500 to-yellow-700",    badgeBg: "bg-yellow-700/50", badgeText: "text-yellow-50",  trackBg: "bg-white/15" },
  { name: "Platinum", min: 800, max: Infinity, orderDiscount: 15, maintenanceOrdersPerYear: 40, gradient: "from-violet-700 via-purple-600 to-indigo-800",   badgeBg: "bg-violet-800/50", badgeText: "text-violet-100", trackBg: "bg-white/15" },
];

export function getTier(pts: number): Tier {
  return TIERS.find(t => pts >= t.min && pts <= t.max) ?? TIERS[0];
}

export type TierBenefit = {
  tier: string;
  icon: string;
  /** Vouchers auto-issued every 1st of month */
  monthlyRewards: string[];
  /** Vouchers auto-issued on birthday */
  birthday: string[];
};

export const TIER_BENEFITS: TierBenefit[] = [
  { tier: "Bronze",   icon: "B", monthlyRewards: [],                                         birthday: [] },
  { tier: "Silver",   icon: "S", monthlyRewards: ["50% OFF Bingsu x1"],                      birthday: ["1x Free Drink"] },
  { tier: "Gold",     icon: "G", monthlyRewards: ["50% OFF Bingsu x1", "1x Free Drink"],     birthday: ["50% OFF Bingsu x1", "1x Free Drink"] },
  { tier: "Platinum", icon: "P", monthlyRewards: ["Free Bingsu x1"],                         birthday: ["Free Bingsu x1"] },
];
