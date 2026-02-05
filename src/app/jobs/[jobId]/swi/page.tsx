import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import JobSWIRun from "@/app/jobs/[jobId]/swi/JobSWIRun";

type JobSWIPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function JobSWIPage({ params }: JobSWIPageProps) {
  const { jobId } = await params;
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const job = await db.job.findFirst({
    where: { id: jobId, orgId },
    include: { customer: true },
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

  const swi = await db.jobSWI.findFirst({ where: { orgId, jobId } });
  const services = await db.service.findMany({
    where: { orgId, swi: { isNot: null } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="Work instructions"
      subtitle={job.title ?? job.customerName}
      backLink={{ href: `/jobs/${job.id}`, label: "Back to job" }}
      breadcrumbs={[
        { label: "Jobs", href: "/jobs" },
        { label: job.title ?? "Job", href: `/jobs/${job.id}` },
        { label: "Work instructions" },
      ]}
    >
      <JobSWIRun
        jobId={job.id}
        existing={(swi?.content as any) ?? null}
        serviceOptions={services.map((service) => ({ id: service.id, name: service.name }))}
      />
    </AppShell>
  );
}
