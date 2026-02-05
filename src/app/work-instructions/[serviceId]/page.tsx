import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import ServiceSWIBuilder from "@/app/work-instructions/ServiceSWIBuilder";

type PageProps = {
  params: Promise<{ serviceId: string }>;
};

export default async function ServiceSWIPage({ params }: PageProps) {
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
  const content = (swi?.content as any) ?? null;

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title={`${service.name} SWI`}
      subtitle="Write plain text work instructions."
      backLink={{ href: "/work-instructions", label: "Back to work instructions" }}
      breadcrumbs={[
        { label: "Work instructions", href: "/work-instructions" },
        { label: service.name },
      ]}
    >
      <ServiceSWIBuilder
        serviceId={service.id}
        serviceName={service.name}
        initialContent={content ?? { meta: { jobName: service.name, classification: "", standards: "", equipment: "", parts: "", whoCanPerform: "" }, phases: [], steps: [] }}
      />
    </AppShell>
  );
}
