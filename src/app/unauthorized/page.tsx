import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Access denied</p>
          <h1 className="mt-3 text-3xl font-semibold">You don&apos;t have permission</h1>
          <p className="mt-2 text-sm text-slate-300">
            Contact your org owner if you believe this is a mistake.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
