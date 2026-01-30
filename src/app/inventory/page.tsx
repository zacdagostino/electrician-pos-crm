import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import InventoryClient from "@/app/inventory/InventoryClient";

export default async function InventoryPage() {
  const { session, orgId } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      title="Inventory"
      subtitle="Sync Bunnings items, scan receipts, and manage stock across locations."
    >
      <InventoryClient />
    </AppShell>
  );
}
