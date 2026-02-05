import AppShell from "@/components/AppShell";
import QuotesTabs from "@/components/QuotesTabs";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams?: Promise<{ highlight?: string; toast?: string; jobToast?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const quotes = await db.quote.findMany({
    where: { orgId, status: { not: "draft" } },
    orderBy: { createdAt: "desc" },
    include: {
      assignedToMember: { include: { user: true } },
      items: true,
      job: { select: { id: true, status: true } },
    },
  });

  const drafts = await db.quote.findMany({ where: { orgId, status: "draft" }, orderBy: { updatedAt: "desc" } });

  // Map to simple serializable shapes
  const activeQuoteByJobId = new Map<string, string>();
  quotes.forEach((quote) => {
    if (!quote.jobId) return;
    if (quote.status !== "accepted") return;
    if (!activeQuoteByJobId.has(quote.jobId)) {
      activeQuoteByJobId.set(quote.jobId, quote.id);
    }
  });

  const latestQuoteByJobId = new Map<string, string>();
  quotes.forEach((quote) => {
    if (!quote.jobId) return;
    if (!latestQuoteByJobId.has(quote.jobId)) {
      latestQuoteByJobId.set(quote.jobId, quote.id);
    }
  });

  const filteredQuotes = quotes.filter((quote) => {
    if (!quote.jobId) return true;
    return latestQuoteByJobId.get(quote.jobId) === quote.id;
  });

  const serialQuotes = filteredQuotes.map((q) => {
    const jobStatus = q.job?.status ?? null;
    const isActiveJobQuote =
      Boolean(q.jobId) &&
      q.status === "accepted" &&
      activeQuoteByJobId.get(q.jobId ?? "") === q.id &&
      jobStatus === "in_progress";

    return {
    id: q.id,
    customerName: q.customerName,
    customerId: q.customerId ?? null,
    siteLine1: q.siteLine1,
    siteLine2: q.siteLine2,
    siteSuburb: q.siteSuburb,
    siteState: q.siteState,
    sitePostcode: q.sitePostcode,
    assignedToName: q.assignedToMember?.user?.name ?? q.assignedToMember?.user?.email ?? null,
    assignedToRole: q.assignedToMember?.tradeRole ?? null,
    assignedToMemberId: q.assignedToMemberId ?? null,
    scopeItems: q.items.map((item) => item.name),
    status: q.status,
    total: Number(q.total),
    createdAt: q.createdAt.toISOString(),
    sentAt: q.sentAt ? q.sentAt.toISOString() : null,
    jobId: q.jobId ?? null,
    jobStatus,
    isActiveJobQuote,
    };
  });

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
      userRole={membership?.tradeRole ?? null}
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
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/quotes/template"
                className="inline-flex items-center justify-center rounded-lg border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
              >
                Template editor
              </a>
              <a
                href="/quotes/new"
                className="inline-flex items-center justify-center rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
              >
                New quote
              </a>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Quotes</p>
          </header>

          <QuotesTabs
            drafts={serialDrafts}
            quotes={serialQuotes}
            highlightQuoteId={resolvedSearchParams.highlight ?? null}
            toastMessage={
              resolvedSearchParams.toast === "updated"
                ? "Quote updated"
                : resolvedSearchParams.toast === "created"
                ? "Quote created"
                : null
            }
            jobToastMessage={
              resolvedSearchParams.jobToast === "updated"
                ? "Linked job scope updated."
                : null
            }
          />

        </section>
      </div>
    </AppShell>
  );
}
