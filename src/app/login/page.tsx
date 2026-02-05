"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      notify({ tone: "error", title: "Sign in failed", message: "Invalid email or password." });
      return;
    }

    window.location.href = "/dashboard";
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Welcome back</p>
          <h1 className="mt-3 text-3xl font-semibold">Sign in</h1>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
          <span className="h-px flex-1 bg-slate-800" />
          or
          <span className="h-px flex-1 bg-slate-800" />
        </div>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100"
        >
          Continue with Google
        </button>
        <p className="text-sm text-slate-400">
          Need an account?{" "}
          <Link href="/signup" className="text-emerald-300">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
