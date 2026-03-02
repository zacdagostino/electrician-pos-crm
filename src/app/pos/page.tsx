import AppShell from "@/components/AppShell";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import PosTerminal from "@/app/pos/PosTerminal";
import { hasPermission } from "@/lib/permissions";

type SaleItemRecord = {
  id: string;
  serviceId: string | null;
  name: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

type SaleRecord = {
  id: string;
  jobId: string | null;
  job?: { id: string; title: string | null } | null;
  status: "draft" | "paid" | "refunded" | "void";
  paymentMethod: "card" | "cash" | "bank_transfer" | "other";
  customerName: string;
  total: Prisma.Decimal;
  paidAt: Date | null;
  createdAt: Date;
  items: SaleItemRecord[];
};

type PosPageProps = {
  searchParams: Promise<{ jobId?: string }>;
};

type JobScopeItem = {
  serviceId: string | null;
  name: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

type JobQuoteRecord = {
  jobId: string | null;
  total: Prisma.Decimal;
  travelSurchargeApplied: boolean;
  travelSurchargeAmount: Prisma.Decimal | null;
  minimumChargeApplied: boolean;
  minimumChargeAmount: Prisma.Decimal | null;
  items: JobScopeItem[];
};

export default async function PosPage({ searchParams }: PosPageProps) {
  const { session, orgId, membership } = await requirePermission("sales:create");
  const resolvedSearchParams = await searchParams;
  const requestedJobId = String(resolvedSearchParams.jobId ?? "").trim();
  const [org, jobs] = await Promise.all([
    db.org.findUnique({ where: { id: orgId } }),
    db.job.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 120,
      select: {
        id: true,
        title: true,
        customerId: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        siteLine1: true,
        siteSuburb: true,
        siteState: true,
      },
    }),
  ]);

  const getJobDisplayName = (job: {
    title: string | null;
    customerName: string;
    siteSuburb: string | null;
    createdAt?: Date;
  }) => {
    const explicit = job.title?.trim();
    if (explicit) return explicit;
    const suburb = job.siteSuburb?.trim() || "Site";
    return `${job.customerName} - ${suburb}`;
  };

  const jobQuotes = jobs.length
    ? ((await db.quote.findMany({
        where: { orgId, jobId: { in: jobs.map((job) => job.id) } },
        orderBy: { createdAt: "desc" },
        select: {
          jobId: true,
          total: true,
          travelSurchargeApplied: true,
          travelSurchargeAmount: true,
          minimumChargeApplied: true,
          minimumChargeAmount: true,
          items: {
            select: {
              serviceId: true,
              name: true,
              quantity: true,
              unitPrice: true,
              lineTotal: true,
            },
          },
        },
      })) as JobQuoteRecord[])
    : [];
  const latestQuoteByJobId = new Map<string, JobQuoteRecord>();
  for (const quote of jobQuotes) {
    if (!quote.jobId) continue;
    if (!latestQuoteByJobId.has(quote.jobId)) {
      latestQuoteByJobId.set(quote.jobId, quote);
    }
  }
  const initialJob = requestedJobId
    ? jobs.find((job) => job.id === requestedJobId) ?? null
    : null;
  const stripeReady =
    Boolean(process.env.STRIPE_SECRET_KEY) &&
    Boolean(process.env.STRIPE_WEBHOOK_SECRET) &&
    Boolean(org?.stripeAccountId) &&
    Boolean(org?.stripeChargesEnabled) &&
    Boolean(org?.stripePayoutsEnabled);
  const posSaleModel = (
    db as unknown as {
      posSale?: { findMany: (args: unknown) => Promise<unknown[]> };
    }
  ).posSale;

  if (!posSaleModel) {
    return (
      <AppShell
        userName={session.user?.name}
        orgName={org?.name ?? orgId}
        orgLogoUrl={org?.logoUrl ?? null}
        userRole={membership?.tradeRole ?? null}
        title="POS Terminal"
        subtitle="Create and charge customer sales inside the app."
      >
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="text-sm font-semibold">POS setup pending</p>
          <p className="mt-2 text-sm">
            Run <code>npm run db:migrate</code>, then restart <code>npm run dev</code> so Prisma loads the new POS models.
          </p>
        </div>
      </AppShell>
    );
  }

  let sales: SaleRecord[] = [];
  try {
    const result = await posSaleModel.findMany({
      where: { orgId },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    sales = result as SaleRecord[];
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return (
        <AppShell
          userName={session.user?.name}
          orgName={org?.name ?? orgId}
          orgLogoUrl={org?.logoUrl ?? null}
          userRole={membership?.tradeRole ?? null}
          title="POS Terminal"
          subtitle="Create and charge customer sales inside the app."
        >
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-100">
            <p className="text-sm font-semibold">POS database tables missing</p>
            <p className="mt-2 text-sm">
              Run <code>npm run db:migrate</code>, then restart <code>npm run dev</code>.
            </p>
          </div>
        </AppShell>
      );
    }
    throw error;
  }

  const jobTitleById = new Map(jobs.map((job) => [job.id, getJobDisplayName(job)]));
  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="POS Terminal"
      subtitle="Create and charge customer sales inside the app."
    >
      {!stripeReady ? (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="text-sm font-semibold">Card charging not configured</p>
          <p className="mt-1 text-sm">
            Stripe setup is incomplete. You can still save drafts and record non-card payments.
            Finish setup in <a href="/settings/pos" className="underline">Settings → POS setup</a>.
          </p>
        </div>
      ) : null}
      <PosTerminal
        gstRate={Number(org?.defaultGstRate ?? 0.1)}
        jobs={jobs.map((job) => ({
          ...((): {
            quotedTotal: number | null;
            scopeItems: Array<{
              serviceId: string | null;
              name: string;
              quantity: number;
              unitPrice: number;
              lineTotal: number;
            }>;
          } => {
            const latestQuote = latestQuoteByJobId.get(job.id) ?? null;
            const travelAmount = latestQuote?.travelSurchargeAmount != null ? Number(latestQuote.travelSurchargeAmount) : 0;
            const minimumAmount = latestQuote?.minimumChargeAmount != null ? Number(latestQuote.minimumChargeAmount) : 0;
            const surchargeLines = [];
            if (latestQuote?.travelSurchargeApplied && travelAmount > 0) {
              surchargeLines.push({
                serviceId: null,
                name: "Travel surcharge",
                quantity: 1,
                unitPrice: travelAmount,
                lineTotal: travelAmount,
              });
            }
            if (latestQuote?.minimumChargeApplied && minimumAmount > 0) {
              surchargeLines.push({
                serviceId: null,
                name: "Minimum charge",
                quantity: 1,
                unitPrice: minimumAmount,
                lineTotal: minimumAmount,
              });
            }
            return {
              quotedTotal: latestQuote?.total != null ? Number(latestQuote.total) : null,
              scopeItems: [
                ...(latestQuote?.items ?? []).map((item) => ({
                  serviceId: item.serviceId,
                  name: item.name,
                  quantity: Number(item.quantity),
                  unitPrice: Number(item.unitPrice),
                  lineTotal: Number(item.lineTotal),
                })),
                ...surchargeLines,
              ],
            };
          })(),
          id: job.id,
          title: getJobDisplayName(job),
          customerId: job.customerId,
          customerName: job.customerName,
          customerEmail: job.customerEmail,
          customerPhone: job.customerPhone,
          siteSummary: [job.siteLine1, job.siteSuburb, job.siteState].filter(Boolean).join(", "),
        }))}
        initialJobId={initialJob?.id ?? null}
        initialSales={sales.map((sale) => ({
          id: sale.id,
          jobId: sale.jobId ?? null,
          jobTitle: sale.job?.title ?? (sale.jobId ? jobTitleById.get(sale.jobId) ?? null : null),
          status: sale.status,
          paymentMethod: sale.paymentMethod,
          reference: (sale as { reference?: string | null }).reference ?? null,
          customerName: sale.customerName,
          total: Number(sale.total),
          paidAt: sale.paidAt?.toISOString() ?? null,
          createdAt: sale.createdAt.toISOString(),
          items: sale.items.map((item) => ({
            id: item.id,
            serviceId: item.serviceId,
            name: item.name,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            lineTotal: Number(item.lineTotal),
          })),
        }))}
        stripeReady={stripeReady}
        userCanManageRefunds={hasPermission(membership.role, "refunds:manage")}
      />
    </AppShell>
  );
}
