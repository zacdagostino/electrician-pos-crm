import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import PricingForm from "./PricingForm";

export default async function PricingPage() {
  const { session, orgId } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      title="Pricing"
      subtitle="Set your pricing profile, fixed services, and customer-facing explanations."
    >
      <PricingForm />
    </AppShell>
  );
}
