import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import ClientEditForm from "./ClientEditForm";

type ClientEditPageProps = {
  params: { clientId: string };
};

export default async function ClientEditPage({ params }: ClientEditPageProps) {
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const client = await db.customer.findFirst({
    where: { id: params.clientId, orgId },
  });

  if (!client) {
    return (
      <AppShell
        userName={session.user?.name}
        orgName={org?.name ?? orgId}
        orgLogoUrl={org?.logoUrl ?? null}
        userRole={membership?.tradeRole ?? null}
        title="Client not found"
      >
        <p className="text-sm text-slate-400">This client no longer exists.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="Edit client"
      subtitle={client.name}
      backLink={{ href: `/clients/${client.id}`, label: "Back to client" }}
      breadcrumbs={[
        { label: "Clients", href: "/clients" },
        { label: client.name, href: `/clients/${client.id}` },
        { label: "Edit" },
      ]}
    >
      <ClientEditForm client={client} />
    </AppShell>
  );
}
