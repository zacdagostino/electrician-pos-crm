import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-start justify-center gap-6 px-6 py-20">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Electrician POS + CRM</p>
        <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">
          Run the job, sell the parts, keep the team in sync.
        </h1>
        <p className="max-w-2xl text-lg text-slate-300">
          Multi-tenant POS + CRM foundation built for electrical contractors. Manage
          organizations, staff roles, and data isolation from day one.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-900"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
