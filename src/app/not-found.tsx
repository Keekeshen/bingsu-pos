import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
        <FileQuestion className="h-8 w-8 text-zinc-400" />
      </div>

      <div className="space-y-1.5">
        <p className="font-mono text-5xl font-extrabold text-zinc-200">404</p>
        <h1 className="text-xl font-bold text-zinc-900">Page not found</h1>
        <p className="max-w-sm text-sm text-zinc-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="outline">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
        <Button asChild>
          <Link href="/admin/pos">Go to POS</Link>
        </Button>
      </div>
    </div>
  );
}
