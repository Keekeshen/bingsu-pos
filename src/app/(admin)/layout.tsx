"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart, BarChart2, Gift, Package, LogOut, LayoutGrid, Printer, Unplug, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PrinterProvider, usePrinter } from "@/components/admin/PrinterProvider";

const NAV_ITEMS = [
  { label: "POS",      href: "/admin/pos",      icon: ShoppingCart  },
  { label: "Tables",   href: "/admin/tables",   icon: LayoutGrid    },
  { label: "History",  href: "/admin/history",  icon: ClipboardList },
  { label: "Reports",  href: "/admin/reports",  icon: BarChart2     },
  { label: "Loyalty",  href: "/admin/loyalty",  icon: Gift          },
  { label: "Products", href: "/admin/products", icon: Package       },
] as const;

function PrinterBtn({ type }: { type: "counter" | "kitchen" }) {
  const { counter, kitchen } = usePrinter();
  const p = type === "counter" ? counter : kitchen;
  const label = type === "counter" ? "Counter Printer" : "Kitchen Printer";
  const color = type === "counter" ? "emerald" : "orange";
  return (
    <Button
      variant="ghost"
      onClick={p.connected ? p.disconnect : p.connect}
      disabled={p.connecting}
      title={p.connected ? `${label} connected — click to disconnect` : `Connect ${label}`}
      className={cn(
        "flex h-10 w-full items-center justify-start gap-3 rounded-lg px-3",
        "text-xs font-medium",
        p.connected
          ? color === "emerald"
            ? "text-emerald-600 hover:bg-emerald-50"
            : "text-orange-500 hover:bg-orange-50"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      )}
    >
      {p.connected ? <Printer className="h-4 w-4 flex-shrink-0" /> : <Unplug className="h-4 w-4 flex-shrink-0" />}
      <span className="hidden md:block">
        {p.connecting ? "Connecting…" : p.connected ? `${label} ON` : label}
      </span>
    </Button>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <PrinterProvider>
      <div className="flex h-screen overflow-hidden bg-zinc-100">
        <aside className="flex w-16 flex-shrink-0 flex-col border-r border-zinc-200 bg-white md:w-52">
          <div className="flex h-16 items-center justify-center border-b border-zinc-200 md:justify-start md:px-5">
            <span className="hidden text-lg font-bold text-zinc-900 md:block">Koori POS</span>
            <span className="block text-lg font-bold text-zinc-900 md:hidden">K</span>
          </div>

          <nav className="flex flex-1 flex-col gap-1 p-2">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link key={href} href={href} title={label}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                    active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="hidden md:block">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-zinc-200 p-2 space-y-0.5">
            <PrinterBtn type="counter" />
            <PrinterBtn type="kitchen" />
            <Button variant="ghost" onClick={handleSignOut} title="Sign out"
              className="flex h-10 w-full items-center justify-start gap-3 rounded-lg px-3 text-xs font-medium text-zinc-600 hover:bg-red-50 hover:text-red-600">
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span className="hidden md:block">Sign out</span>
            </Button>
          </div>
        </aside>

        <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </PrinterProvider>
  );
}