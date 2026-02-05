import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import TemplateEditor from "@/app/quotes/template/TemplateEditor";

export default async function QuoteTemplatePage() {
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  if (!("quoteTemplate" in db)) {
    return (
      <AppShell
        userName={session.user?.name}
        orgName={org?.name ?? orgId}
        orgLogoUrl={org?.logoUrl ?? null}
        userRole={membership?.tradeRole ?? null}
        title="Quote template"
        subtitle="Template storage is not available yet."
        backLink={{ href: "/quotes", label: "Back to quotes" }}
      >
        <p className="text-sm text-slate-400">
          Run `npx prisma migrate dev` and `npx prisma generate` to enable templates.
        </p>
      </AppShell>
    );
  }

  let template: Awaited<ReturnType<typeof db.quoteTemplate.findFirst>> | null = null;
  try {
    template = await db.quoteTemplate.findFirst({
      where: { orgId, isDefault: true },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    return (
      <AppShell
        userName={session.user?.name}
        orgName={org?.name ?? orgId}
        orgLogoUrl={org?.logoUrl ?? null}
        userRole={membership?.tradeRole ?? null}
        title="Quote template"
        subtitle="Template storage is not available yet."
        backLink={{ href: "/quotes", label: "Back to quotes" }}
      >
        <p className="text-sm text-slate-400">
          The QuoteTemplate table is missing. Run `npx prisma migrate dev` and `npx prisma generate`,
          then restart the dev server.
        </p>
      </AppShell>
    );
  }

  const blocks =
    (template?.blocks as Array<{ id: string; type: string; label: string }> | null) ?? [
      { id: "header", type: "header", label: "Header" },
      { id: "customer", type: "customer", label: "Customer details" },
      { id: "items", type: "items", label: "Line items" },
      { id: "totals", type: "totals", label: "Totals" },
      { id: "notes", type: "notes", label: "Notes" },
      { id: "footer", type: "footer", label: "Footer" },
    ];

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="Quote template"
      subtitle="Reorder and add blocks to control the PDF layout."
      backLink={{ href: "/quotes", label: "Back to quotes" }}
    >
      <TemplateEditor
        initialName={template?.name ?? "Default template"}
        initialBlocks={blocks}
      />
    </AppShell>
  );
}
