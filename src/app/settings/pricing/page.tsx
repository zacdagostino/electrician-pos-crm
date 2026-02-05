import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import PricingForm from "./PricingForm";

export default async function PricingPage() {
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="Pricing"
      subtitle="Set your pricing profile, fixed services, and customer-facing explanations."
    >
      <PricingForm />
    </AppShell>
  );
}
