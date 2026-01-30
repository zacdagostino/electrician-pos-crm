import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import QuoteBuilder from "@/app/quotes/new/QuoteBuilder";

export default async function QuoteNewPage() {
  const { session, orgId } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      title="New quote"
      subtitle="Build a quote using your pricing profile."
    >
      <QuoteBuilder />
    </AppShell>
  );
}
