import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import DeleteButton from "@/components/DeleteButton";
import QuoteActions from "@/app/quotes/[quoteId]/QuoteActions";
import QuoteAddressCard from "@/app/quotes/[quoteId]/QuoteAddressCard";
import RevertQuoteButton from "@/app/quotes/[quoteId]/RevertQuoteButton";
import QuoteSendStatus from "@/app/quotes/[quoteId]/QuoteSendStatus";
import Link from "next/link";

type QuotePageProps = {
  params: Promise<{ quoteId: string }>;
};

const formatMoney = (value: unknown) =>
  value != null ? `$${Number(value).toFixed(2)}` : "—";

const buildChangeSummary = (
  previous: { status?: string | null; title?: string | null; total?: unknown; items?: { name: string }[] },
  next: { status?: string | null; title?: string | null; total?: unknown; items?: { name: string }[] }
) => {
  const changes: string[] = [];
  if (previous.status !== next.status) {
    changes.push(`Status: ${previous.status ?? "—"} → ${next.status ?? "—"}`);
  }
  if ((previous.title ?? "") !== (next.title ?? "")) {
    changes.push(`Title: ${previous.title ?? "Untitled"} → ${next.title ?? "Untitled"}`);
  }
  if (Number(previous.total ?? 0) !== Number(next.total ?? 0)) {
    changes.push(`Total: ${formatMoney(previous.total)} → ${formatMoney(next.total)}`);
  }

  const prevItems = previous.items?.map((item) => item.name) ?? [];
  const nextItems = next.items?.map((item) => item.name) ?? [];
  const prevSet = new Set(prevItems);
  const nextSet = new Set(nextItems);
  const added = nextItems.filter((name) => !prevSet.has(name));
  const removed = prevItems.filter((name) => !nextSet.has(name));
  if (added.length || removed.length) {
    const parts: string[] = [];
    if (added.length) {
      parts.push(`+ ${added.slice(0, 3).join(", ")}${added.length > 3 ? "…" : ""}`);
    }
    if (removed.length) {
      parts.push(`- ${removed.slice(0, 3).join(", ")}${removed.length > 3 ? "…" : ""}`);
    }
    changes.push(`Scope: ${parts.join(" | ")}`);
  }

  if (!changes.length) {
    changes.push("No visible changes (metadata update)");
  }

  return changes;
};

export default async function QuotePage({ params }: QuotePageProps) {
  const { quoteId } = await params;
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const quote = await db.quote.findFirst({
    where: { id: quoteId, orgId },
    include: {
      items: true,
      history: {
        include: { items: true, changedByMember: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
      },
      job: {
        select: {
          id: true,
          status: true,
          title: true,
        },
      },
    },
  });

  if (!quote) {
    return (
      <AppShell
        userName={session.user?.name}
        orgName={org?.name ?? orgId}
        orgLogoUrl={org?.logoUrl ?? null}
        userRole={membership?.tradeRole ?? null}
        title="Quote not found"
      >
        <p className="text-sm text-slate-400">This quote no longer exists.</p>
      </AppShell>
    );
  }

  const latestAccepted = quote.jobId
    ? await db.quote.findFirst({
        where: { orgId, jobId: quote.jobId, status: "accepted" },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const isActiveJobQuote =
    Boolean(quote.jobId) &&
    quote.status === "accepted" &&
    latestAccepted?.id === quote.id &&
    quote.job?.status === "in_progress";
  const isOldJobQuote =
    Boolean(quote.jobId) && quote.status === "accepted" && latestAccepted?.id !== quote.id;

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title={`Quote for ${quote.customerName}`}
      backLink={{ href: "/quotes", label: "Back to quotes" }}
      breadcrumbs={[
        { label: "Quotes", href: "/quotes" },
        { label: quote.customerName },
      ]}
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Quote</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-100">
                {quote.customerId ? (
                  <Link
                    href={`/clients/${quote.customerId}`}
                    className="inline-flex items-center gap-2 hover:text-emerald-200"
                  >
                    {quote.customerName}
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-800 text-slate-400 transition hover:text-emerald-200 hover:border-emerald-400/50">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 7h10v10" />
                        <path d="M7 17 17 7" />
                      </svg>
                    </span>
                  </Link>
                ) : (
                  quote.customerName
                )}
              </h2>
              {isOldJobQuote ? (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                  Old version
                </span>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-2">
              <QuoteActions quoteId={quote.id} status={quote.status} />
              {isActiveJobQuote && quote.jobId ? (
                <Link
                  href={`/jobs/${quote.jobId}`}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Active job
                </Link>
              ) : null}
              <QuoteSendStatus
                quoteId={quote.id}
                customerEmail={quote.customerEmail}
                customerName={quote.customerName}
                sentAt={quote.sentAt ? quote.sentAt.toISOString() : null}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                    Customer info
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-100">
                    {quote.customerId ? (
                      <Link href={`/clients/${quote.customerId}`} className="hover:text-emerald-200">
                        {quote.customerName}
                      </Link>
                    ) : (
                      quote.customerName
                    )}
                  </h3>
                  {quote.customerEmail ? (
                    <p className="mt-1 text-xs text-slate-400">{quote.customerEmail}</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">No email on file</p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <QuoteAddressCard
                  siteLine1={quote.siteLine1}
                  siteLine2={quote.siteLine2}
                  siteSuburb={quote.siteSuburb}
                  siteState={quote.siteState}
                  sitePostcode={quote.sitePostcode}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
                    Scope of works
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {quote.items.length} item{quote.items.length === 1 ? "" : "s"} in scope
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-slate-500 dark:border-slate-700/60 dark:bg-slate-950/50 dark:text-slate-300">
                  Work list
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {quote.items.length ? (
                  quote.items.map((item) => (
                    <div
                      key={item.id}
                      className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-900/70"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {item.name}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {item.description}
                            </p>
                          ) : null}
                          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-slate-500 dark:border-slate-700/60 dark:bg-slate-950 dark:text-slate-300">
                            Qty {Number(item.quantity)}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {Number(item.quantity)} × ${Number(item.unitPrice).toFixed(2)}
                          </p>
                          <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                            ${Number(item.lineTotal).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                    No scope items yet.
                  </div>
                )}
              </div>
              <div className="mt-6 grid gap-2 text-xs sm:ml-auto sm:max-w-xs">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    ${Number(quote.subtotal).toFixed(2)}
                  </span>
                </div>
                {quote.travelSurchargeApplied && Number(quote.travelSurchargeAmount) > 0 ? (
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                    <span>Call out fee</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      ${Number(quote.travelSurchargeAmount).toFixed(2)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                  <span>GST</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    ${Number(quote.gstAmount).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-100">
                  <span>Total</span>
                  <span>${Number(quote.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {quote.customerId ? (
              <a
                href={`/clients/${quote.customerId}`}
                className="inline-flex items-center justify-center rounded-lg border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
              >
                View client
              </a>
            ) : null}
            {quote.jobId ? (
              <a
                href={`/jobs/${quote.jobId}`}
                className="inline-flex items-center justify-center rounded-lg border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
              >
                Go to job
              </a>
            ) : null}
            <a
              href={`/api/quotes/${quote.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
            >
              View PDF
            </a>
            <a
              href={`/quotes/${quote.id}/edit`}
              className="inline-flex items-center justify-center rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
            >
              Edit quote
            </a>
            <DeleteButton
              endpoint={`/api/quotes/${quote.id}`}
              redirectTo="/quotes"
              label="Delete quote"
              confirmText="Delete this quote? This cannot be undone."
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <header className="mb-4 text-xs uppercase tracking-[0.3em] text-slate-500">
            Quote edit history
          </header>
          {quote.history.length ? (
            <div className="relative">
              <div className="absolute left-4 top-0 h-full w-px bg-slate-800" />
              <div className="space-y-6">
                {quote.history.map((entry, index) => {
                  const newer = index === 0 ? quote : quote.history[index - 1];
                  const changes = buildChangeSummary(entry, newer);
                  const changedBy =
                    entry.changedByMember?.user?.name ??
                    entry.changedByMember?.user?.email ??
                    "Unknown";

                  return (
                    <div key={entry.id} className="relative pl-10">
                      <span className="absolute left-2 top-6 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 ring-2 ring-emerald-400/70">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      </span>
                      <div className="mb-3 space-y-1 text-xs text-slate-400">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                          Changed {entry.createdAt.toLocaleString()} by {changedBy}
                        </p>
                        {changes.map((change) => (
                          <p key={change}>{change}</p>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="mt-1 text-sm font-semibold text-slate-100">
                              {entry.title ?? "Quote update"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-slate-700/60 bg-slate-950 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-slate-300">
                              Old version
                            </span>
                            <RevertQuoteButton quoteId={quote.id} historyId={entry.id} />
                          </div>
                        </div>

                      <div className="mt-4 grid gap-4 text-xs text-slate-300 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                            Subtotal
                          </p>
                          <p className="mt-1 text-base font-semibold text-slate-100">
                            ${Number(entry.subtotal).toFixed(2)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">GST</p>
                          <p className="mt-1 text-base font-semibold text-slate-100">
                            ${Number(entry.gstAmount).toFixed(2)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                            Total
                          </p>
                          <p className="mt-1 text-base font-semibold text-slate-100">
                            ${Number(entry.total).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                          Items
                        </p>
                        {entry.items.length ? (
                          <ul className="mt-2 space-y-1 text-xs text-slate-300">
                            {entry.items.map((item) => (
                              <li key={item.id} className="flex items-center justify-between gap-2">
                                <span className="truncate">{item.name}</span>
                                <span className="text-slate-400">
                                  {Number(item.quantity)} × ${Number(item.unitPrice).toFixed(2)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">No items captured.</p>
                        )}
                      </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No edits yet.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
