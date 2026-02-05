import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import QuoteBuilder from "@/app/quotes/new/QuoteBuilder";

type QuoteEditPageProps = {
  params: Promise<{ quoteId: string }>;
};

export default async function QuoteEditPage({ params }: QuoteEditPageProps) {
  const { quoteId } = await params;
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const quote = await db.quote.findFirst({
    where: { id: quoteId, orgId },
    include: {
      items: true,
      job: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!quote) {
    return (
      <AppShell
        userName={session.user?.name}
        orgName={org?.name ?? orgId}
        orgLogoUrl={org?.logoUrl ?? null}
        userRole={membership?.tradeRole ?? null}
        title="Quote not found"
      >
        <p className="text-sm text-slate-400">This quote no longer exists.</p>
      </AppShell>
    );
  }

  const serialQuote = {
    id: quote.id,
    customerId: quote.customerId ?? null,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail,
    customerPhone: quote.customerPhone,
    siteLine1: quote.siteLine1,
    siteLine2: quote.siteLine2,
    siteSuburb: quote.siteSuburb,
    siteState: quote.siteState,
    sitePostcode: quote.sitePostcode,
    travelSurchargeApplied: quote.travelSurchargeApplied,
    notes: quote.notes,
    items: quote.items.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
      pricingItemId: item.pricingItemId ?? null,
    })),
  };

  const latestAccepted = quote.jobId
    ? await db.quote.findFirst({
        where: { orgId, jobId: quote.jobId, status: "accepted" },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const isActiveJobQuote =
    Boolean(quote.jobId) &&
    quote.status === "accepted" &&
    latestAccepted?.id === quote.id &&
    quote.job?.status === "in_progress";

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      backLink={{ href: `/quotes/${quote.id}`, label: "Back to quote" }}
      breadcrumbs={[
        { label: "Quotes", href: "/quotes" },
        { label: quote.customerName, href: `/quotes/${quote.id}` },
        { label: "Edit" },
      ]}
    >
      <div className="space-y-4">
        <QuoteBuilder
          mode="edit"
          quoteId={quote.id}
          initialQuote={serialQuote}
          activeJob={{
            isActive: isActiveJobQuote,
            jobId: quote.jobId ?? null,
            jobStatus: quote.job?.status ?? null,
          }}
        />
      </div>
    </AppShell>
  );
}
