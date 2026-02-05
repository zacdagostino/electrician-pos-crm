import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import JobScheduleCalendar from "@/app/jobs/schedule/JobScheduleCalendar";

export default async function JobSchedulePage() {
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });

  const jobs = await db.job.findMany({
    where: { orgId },
    include: {
      assignedToMember: { include: { user: true } },
      tasks: { select: { name: true }, orderBy: { sortOrder: "asc" } },
      quotes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { items: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
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

  const serialJobs = jobs.map((job) => ({
    id: job.id,
    title: job.title ?? null,
    customerName: job.customerName,
    status: job.status,
    assignedToMemberId: job.assignedToMemberId ?? null,
    assignedToName:
      job.assignedToMember?.user?.name ??
      job.assignedToMember?.user?.email ??
      null,
    scopeItems:
      job.quotes[0]?.items?.length
        ? job.quotes[0].items.map((item) => item.name)
        : job.tasks.map((task) => task.name),
    scheduledStart: job.scheduledStart ? job.scheduledStart.toISOString() : null,
    scheduledEnd: job.scheduledEnd ? job.scheduledEnd.toISOString() : null,
    scheduledAllDay: job.scheduledAllDay,
    scheduledNotes: job.scheduledNotes ?? null,
    siteLine1: job.siteLine1,
    siteSuburb: job.siteSuburb ?? null,
    siteState: job.siteState ?? null,
    sitePostcode: job.sitePostcode ?? null,
  }));

  const serialAssignees = assignees.map((member) => ({
    id: member.id,
    label: member.user?.name ?? member.user?.email ?? "Member",
    role: member.tradeRole,
  }));

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="Schedule"
      subtitle="Plan jobs, drag and drop changes, and keep the day moving."
    >
      <JobScheduleCalendar jobs={serialJobs} assignees={serialAssignees} />
    </AppShell>
  );
}
