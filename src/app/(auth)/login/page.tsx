"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    const next = searchParams.get("next") ?? "";
    const isAdmin = profile?.role === "admin";

    if (isAdmin) {
      router.push(next.startsWith("/admin") ? next : "/admin/pos");
    } else {
      router.push(next && !next.startsWith("/admin") ? next : "/dashboard");
    }
    router.refresh();
  }

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-zinc-900 underline-offset-4 hover:underline">Create one</Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo.png"
            alt="Koori Dessert"
            width={110}
            height={110}
            className="rounded-2xl"
            priority
          />
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Welcome back</h1>
            <p className="text-sm text-zinc-500">Sign in to your account</p>
          </div>
        </div>

        <Suspense fallback={<div className="h-48 rounded-2xl border border-zinc-200 bg-white animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
