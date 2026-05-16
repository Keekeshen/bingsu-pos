"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, History, Gift, LogOut, Ticket, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const TAB_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Vouchers", href: "/vouchers", icon: Ticket },
  { label: "History", href: "/history", icon: History },
  { label: "Redeem", href: "/redeem", icon: Gift },
] as const;

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-50">
      <header
        className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <span className="text-base font-bold tracking-tight text-zinc-900">
          Koori Dessert
        </span>
        <div className="flex items-center gap-1">
          <Link href="/profile" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100">
            <UserCircle className="h-5 w-5" />
          </Link>
          <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out" className="text-zinc-500 hover:bg-red-50 hover:text-red-600">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom))" }}>
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-start justify-around border-t border-zinc-200 bg-white px-2 pt-2"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TAB_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} className={cn("flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-xs font-medium transition-colors", active ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600")}>
              <Icon className={cn("h-6 w-6 transition-transform", active && "scale-110")} strokeWidth={active ? 2.5 : 1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
