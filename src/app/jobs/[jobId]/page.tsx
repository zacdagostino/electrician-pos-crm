import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import DeleteButton from "@/components/DeleteButton";
import AddressCard from "@/components/AddressCard";
import JobStatusDropdown from "@/components/JobStatusDropdown";
import CopyableField from "@/components/CopyableField";
import VariationQuotePanel from "@/components/VariationQuotePanel";
import JobQuotesPanel from "@/app/jobs/[jobId]/JobQuotesPanel";
import JobAssigneeSelect from "@/app/jobs/[jobId]/JobAssigneeSelect";
import JobChecklistPanel from "@/app/jobs/[jobId]/JobChecklistPanel";
import JobScheduleCard from "@/app/jobs/[jobId]/JobScheduleCard";

type JobPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function JobPage({ params }: JobPageProps) {
  const { jobId } = await params;
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const job = await db.job.findFirst({
    where: { id: jobId, orgId },
    include: {
      customer: true,
      assignedToMember: { include: { user: true } },
      tasks: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { completedBy: { include: { user: true } } },
      },
      quotes: { orderBy: { createdAt: "desc" }, include: { items: true } },
    },
  });

  const assignees = await db.orgMember.findMany({
    where: {
      orgId,
      status: "active",
      tradeRole: { in: ["electrician", "apprentice"] },
    },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  if (!job) {
    return (
      <AppShell
        userName={session.user?.name}
        orgName={org?.name ?? orgId}
        orgLogoUrl={org?.logoUrl ?? null}
        userRole={membership?.tradeRole ?? null}
        title="Job not found"
      >
        <p className="text-sm text-slate-400">This job no longer exists.</p>
      </AppShell>
    );
  }

  const ensureIsoString = (value: Date | string | null) =>
    value ? (value instanceof Date ? value.toISOString() : value) : null;

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title={job.title ?? ""}
      backLink={{ href: "/jobs", label: "Back to jobs" }}
      breadcrumbs={[
        { label: "Jobs", href: "/jobs" },
      ]}
    >
      <div className="space-y-6">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {job.title ?? "Job details"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <JobStatusDropdown jobId={job.id} status={job.status} />
            <JobAssigneeSelect
              jobId={job.id}
              assignedToMemberId={job.assignedToMemberId ?? null}
              assignees={assignees.map((member) => ({
                id: member.id,
                label: member.user?.name ?? member.user?.email ?? "Member",
                role: member.tradeRole,
              }))}
            />
            <VariationQuotePanel jobId={job.id} />
            <a
              href={`/jobs/${job.id}/swi`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Work instructions
            </a>
            <a
              href={`/pos?jobId=${job.id}`}
              className="inline-flex items-center justify-center rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
            >
              Open POS
            </a>
            <a
              href={`/jobs/${job.id}/edit`}
              className="inline-flex items-center justify-center rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
            >
              Edit job
            </a>
            <DeleteButton
              endpoint={`/api/jobs/${job.id}`}
              redirectTo="/jobs"
              label="Delete job"
              confirmText="Delete this job? This cannot be undone."
            />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Client</p>
              {job.customer ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  <a
                    href={`/clients/${job.customer.id}`}
                    className="hover:text-emerald-600 dark:hover:text-emerald-200"
                  >
                    {job.customerName}
                  </a>
                  <a
                    href={`/clients/${job.customer.id}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:text-emerald-600 hover:border-emerald-400/50 dark:border-slate-800 dark:text-slate-400 dark:hover:text-emerald-200"
                    aria-label="View client"
                    title="View client"
                  >
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
                  </a>
                </div>
              ) : (
                <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {job.customerName}
                </h2>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <CopyableField
                  label="Email"
                  value={job.customerEmail}
                  icon={
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h16v16H4z" />
                      <path d="m22 6-10 7L2 6" />
                    </svg>
                  }
                />
                <CopyableField
                  label="Phone"
                  value={job.customerPhone}
                  icon={
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.9 19.9 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.9 19.9 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9a16 16 0 0 0 7 7l.6-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
                    </svg>
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {(!job.assignedToMemberId || !job.scheduledStart) ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-700/80 dark:text-amber-100/80">
              Attention needed
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
              {!job.assignedToMemberId ? (
                <span className="rounded-full border border-amber-200 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100">
                  Assign electrician
                </span>
              ) : null}
              {!job.scheduledStart ? (
                <span className="rounded-full border border-amber-200 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100">
                  Schedule job
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-amber-700/80 dark:text-amber-100/80">
              This job will stay out of the schedule until it has an electrician and time set.
            </p>
          </section>
        ) : null}

        <JobScheduleCard
          jobId={job.id}
          scheduledStart={job.scheduledStart ? job.scheduledStart.toISOString() : null}
          scheduledEnd={job.scheduledEnd ? job.scheduledEnd.toISOString() : null}
          scheduledAllDay={job.scheduledAllDay}
          scheduledNotes={job.scheduledNotes ?? null}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
              Details
              <span className="text-[10px] transition-transform group-open:rotate-180">▼</span>
            </summary>
            {(() => {
              const scopeItems = job.quotes[0]?.items ?? [];
              return (
                <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800/70 dark:bg-slate-950/60">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                      Site address
                    </p>
                    <div className="mt-4">
                      <AddressCard
                        label={undefined}
                        line1={job.siteLine1}
                        line2={job.siteLine2}
                        suburb={job.siteSuburb}
                        state={job.siteState}
                        postcode={job.sitePostcode}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800/70 dark:bg-slate-950/60">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                        Scope of works
                      </p>
                      <span className="text-xs text-slate-400">
                        {scopeItems.length} item{scopeItems.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {scopeItems.length ? (
                      <div className="space-y-2">
                        {scopeItems.map((item, index) => (
                          <div
                            key={`${item.id}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-800/60 dark:bg-slate-950/80"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {item.name}
                              </p>
                              {item.description ? (
                                <p className="text-[11px] text-slate-500">
                                  {item.description}
                                </p>
                              ) : null}
                            </div>
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                              Qty {Number(item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No scope items yet.</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </details>
        </section>

        <JobChecklistPanel
          jobId={job.id}
          tasks={job.tasks.map((task) => ({
            id: task.id,
            name: task.name,
            description: task.description,
            status: task.status,
            completedAt: ensureIsoString(task.completedAt),
            completedByName:
              task.completedBy?.user?.name ?? task.completedBy?.user?.email ?? null,
          }))}
        />

        {job.quotes.length ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <header className="mb-4 text-xs uppercase tracking-[0.3em] text-slate-500">
              Quotes
            </header>
            <JobQuotesPanel
              quotes={job.quotes.map((quote) => ({
                id: quote.id,
                title: quote.title ?? null,
                status: quote.status,
                total: Number(quote.total ?? 0),
                createdAt: ensureIsoString(quote.createdAt) ?? new Date().toISOString(),
                sentAt: ensureIsoString(quote.sentAt),
                customerEmail: quote.customerEmail ?? null,
                customerName: quote.customerName,
                items: quote.items.map((item) => ({ id: item.id, name: item.name })),
              }))}
            />
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
