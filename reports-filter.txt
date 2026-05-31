"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

type Props = { defaultFrom: string; defaultTo: string };

export default function ReportsFilter({ defaultFrom, defaultTo }: Props) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const router = useRouter();

  function apply() {
    router.push(`/admin/reports?from=${from}&to=${to}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5">
        <span className="text-xs text-zinc-400">From</span>
        <input
          type="date"
          value={from}
          onChange={e => setFrom(e.target.value)}
          className="text-sm font-medium text-zinc-800 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5">
        <span className="text-xs text-zinc-400">To</span>
        <input
          type="date"
          value={to}
          onChange={e => setTo(e.target.value)}
          className="text-sm font-medium text-zinc-800 focus:outline-none"
        />
      </div>
      <Button size="sm" onClick={apply} className="gap-1.5 h-9">
        <Search className="h-3.5 w-3.5" /> Apply
      </Button>
    </div>
  );
}
