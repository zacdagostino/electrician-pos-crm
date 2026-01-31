import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import QuoteBuilder from "@/app/quotes/new/QuoteBuilder";
import Link from "next/link";

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
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/quotes"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
        >
          <span className="text-xs">←</span>
          <span>Back to quotes</span>
        </Link>
      </div>

      <QuoteBuilder />
    </AppShell>
  );
}
