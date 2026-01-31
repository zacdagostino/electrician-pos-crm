import AppShell from "@/components/AppShell";
import QuotesTabs from "@/components/QuotesTabs";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";

export default async function QuotesPage() {
  const { session, orgId } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const quotes = await db.quote.findMany({
    where: { orgId, status: { not: "draft" } },
    orderBy: { createdAt: "desc" },
  });

  const drafts = await db.quote.findMany({ where: { orgId, status: "draft" }, orderBy: { updatedAt: "desc" } });

  // Map to simple serializable shapes
  const serialQuotes = quotes.map((q) => ({
    id: q.id,
    customerName: q.customerName,
    siteLine1: q.siteLine1,
    status: q.status,
    total: Number(q.total),
    createdAt: q.createdAt.toISOString(),
  }));

  const serialDrafts = drafts.map((q) => ({
    id: q.id,
    customerName: q.customerName,
    siteLine1: q.siteLine1,
    total: Number(q.total ?? 0),
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt?.toISOString() ?? null,
  }));

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      title="Quotes"
      subtitle="Create, review, and send professional quotes."
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Quote maker</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-100">
                Build quotes from your pricing profile
              </h2>
              <p className="text-sm text-slate-400">
                Fixed services, add-ons, and labour combine into clear totals.
              </p>
            </div>
            <a
              href="/quotes/new"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
            >
              New quote
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Quotes</p>
          </header>

          <QuotesTabs drafts={serialDrafts} quotes={serialQuotes} />

        </section>
      </div>
    </AppShell>
  );
}
