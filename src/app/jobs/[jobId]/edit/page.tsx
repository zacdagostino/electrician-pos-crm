import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import JobEditForm from "./JobEditForm";

type JobEditPageProps = {
  params: { jobId: string };
};

export default async function JobEditPage({ params }: JobEditPageProps) {
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const job = await db.job.findFirst({
    where: { id: params.jobId, orgId },
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

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="Edit job"
      subtitle={job.title ?? "Update job details"}
      backLink={{ href: `/jobs/${job.id}`, label: "Back to job" }}
      breadcrumbs={[
        { label: "Jobs", href: "/jobs" },
        { label: job.title ?? "Job details", href: `/jobs/${job.id}` },
        { label: "Edit" },
      ]}
    >
      <JobEditForm
        job={{
          id: job.id,
          title: job.title,
          status: job.status,
          assignedToMemberId: job.assignedToMemberId ?? null,
          customerName: job.customerName ?? "",
          customerEmail: job.customerEmail,
          customerPhone: job.customerPhone,
          siteLine1: job.siteLine1 ?? "",
          siteLine2: job.siteLine2,
          siteSuburb: job.siteSuburb,
          siteState: job.siteState,
          sitePostcode: job.sitePostcode,
          notes: job.notes,
        }}
        assignees={assignees.map((member) => ({
          value: member.id,
          label: member.user?.name ?? member.user?.email ?? "Member",
        }))}
      />
    </AppShell>
  );
}
