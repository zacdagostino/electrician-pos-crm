import AppShell from "@/components/AppShell";
import JobsTable from "@/components/JobsTable";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";

export default async function JobsPage() {
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const jobs = await db.job.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      assignedToMember: { include: { user: true } },
      quotes: { orderBy: { createdAt: "desc" }, include: { items: true } },
    },
  });

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="Jobs"
      subtitle="Track jobs created from accepted quotes."
    >
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <JobsTable
          jobs={jobs.map((job) => ({
            id: job.id,
            title: job.title ?? null,
            siteLine1: job.siteLine1,
            siteLine2: job.siteLine2 ?? null,
            siteSuburb: job.siteSuburb ?? null,
            siteState: job.siteState ?? null,
            sitePostcode: job.sitePostcode ?? null,
            customerId: job.customer?.id ?? null,
            customerName: job.customer?.name ?? null,
            assignedToMemberId: job.assignedToMemberId ?? null,
            assignedToName:
              job.assignedToMember?.user?.name ??
              job.assignedToMember?.user?.email ??
              null,
            status: job.status,
            total: job.total != null ? `$${Number(job.total).toFixed(2)}` : null,
            createdDate: job.createdAt.toISOString().slice(0, 10),
            scopeItems: job.quotes[0]?.items?.map((item) => item.name) ?? [],
            quoteCount: job.quotes.length,
            scheduledStart: job.scheduledStart ? job.scheduledStart.toISOString() : null,
          }))}
        />
      </div>
    </AppShell>
  );
}
