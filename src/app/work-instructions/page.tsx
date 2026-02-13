import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import WorkInstructionsList from "@/app/work-instructions/WorkInstructionsList";

export default async function WorkInstructionsPage() {
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const services = await db.service.findMany({
    where: { orgId },
    orderBy: { createdAt: "asc" },
  });
  const swis = await db.serviceSWI.findMany({ where: { orgId } });
  const swiByServiceId = new Map(
    swis.map((swi) => [
      swi.serviceId,
      {
        hasSwi: true,
        isDraft: Boolean((swi.content as { meta?: { isDraft?: boolean } })?.meta?.isDraft),
      },
    ])
  );

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="Work instructions"
      subtitle="Simple text instructions per service."
      breadcrumbs={[{ label: "Work instructions" }]}
    >
      <WorkInstructionsList
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
          price: service.price ? service.price.toFixed(2) : null,
          hasSwi: swiByServiceId.get(service.id)?.hasSwi ?? false,
          isDraft: swiByServiceId.get(service.id)?.isDraft ?? false,
        }))}
      />
    </AppShell>
  );
}
