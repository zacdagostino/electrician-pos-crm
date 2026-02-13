import Link from "next/link";
import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import ServiceSWIRunView from "@/app/work-instructions/ServiceSWIRunView";

type PageProps = {
  params: Promise<{ serviceId: string }>;
};

type SWIContent = {
  meta: {
    jobName: string;
    classification: string;
    standards: string;
    equipment: string;
    parts: string;
    whoCanPerform: "licensed" | "apprentice" | "apprentice-supervised" | "";
    isDraft?: boolean;
  };
  phases: Array<{ id: string; title: string; description?: string; locked?: boolean }>;
  steps: Array<{
    id: string;
    phaseId: string;
    title: string;
    whatToDo: string[];
    why: string;
    ppe: string[];
    tools: string[];
    parts: string[];
    tests: string[];
    hazards: string[];
    photoRequired: string;
    gate: boolean;
    stopAndThink: boolean;
    caution: string;
    who: "licensed" | "apprentice" | "apprentice-supervised" | "any";
    notes: string;
  }>;
};

export default async function ServiceSWIRunPage({ params }: PageProps) {
  const { serviceId } = await params;
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const service = await db.service.findFirst({ where: { id: serviceId, orgId } });

  if (!service) {
    return (
      <AppShell
        userName={session.user?.name}
        orgName={org?.name ?? orgId}
        orgLogoUrl={org?.logoUrl ?? null}
        userRole={membership?.tradeRole ?? null}
        title="Service not found"
      >
        <p className="text-sm text-slate-500">This service no longer exists.</p>
      </AppShell>
    );
  }

  const swi = await db.serviceSWI.findFirst({ where: { orgId, serviceId } });
  const content = (swi?.content as SWIContent | null) ?? null;

  if (!content) {
    return (
      <AppShell
        userName={session.user?.name}
        orgName={org?.name ?? orgId}
        orgLogoUrl={org?.logoUrl ?? null}
        userRole={membership?.tradeRole ?? null}
        title={`${service.name} SWI Run`}
        subtitle="Field checklist view"
        backLink={{ href: "/work-instructions", label: "Back to work instructions" }}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No SWI has been created for this service yet.
          </p>
          <Link
            href={`/work-instructions/${service.id}`}
            className="mt-4 inline-flex rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-950"
          >
            Open editor
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title={`${service.name} SWI Run`}
      subtitle="Field checklist view"
      backLink={{ href: "/work-instructions", label: "Back to work instructions" }}
      breadcrumbs={[
        { label: "Work instructions", href: "/work-instructions" },
        { label: `${service.name} Run` },
      ]}
    >
      <ServiceSWIRunView serviceId={service.id} serviceName={service.name} content={content} />
    </AppShell>
  );
}
