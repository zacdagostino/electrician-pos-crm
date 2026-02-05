"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      notify({
        tone: "error",
        title: "Signup failed",
        message: payload.error || "Unable to create account.",
      });
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      notify({
        tone: "warning",
        title: "Sign in required",
        message: "Account created. Please sign in.",
      });
      return;
    }

    window.location.href = "/onboarding";
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Get started</p>
          <h1 className="mt-3 text-3xl font-semibold">Create account</h1>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
            />
          </label>
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
              minLength={8}
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>
        <p className="text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-300">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
