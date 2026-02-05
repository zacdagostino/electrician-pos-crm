import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ jobId: string }> };

const getJobId = async (params: Params["params"]) => {
  const resolved = await params;
  return resolved.jobId;
};

export const POST = async (_req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const jobId = await getJobId(params);

  const baseQuote =
    (await db.quote.findFirst({
      where: { orgId, jobId, status: "accepted" },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    })) ??
    (await db.quote.findFirst({
      where: { orgId, jobId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }));

  if (!baseQuote) {
    return NextResponse.json(
      { error: "No quote found to clone for this job." },
      { status: 400 }
    );
  }

  const variationTitle = baseQuote.title
    ? `${baseQuote.title} (Variation)`
    : "Variation quote";

  const created = await db.$transaction(async (tx) => {
    return tx.quote.create({
      data: {
        orgId,
        jobId,
        customerId: baseQuote.customerId,
        status: "draft",
        title: variationTitle,
        customerName: baseQuote.customerName,
        customerEmail: baseQuote.customerEmail,
        customerPhone: baseQuote.customerPhone,
        siteLine1: baseQuote.siteLine1,
        siteLine2: baseQuote.siteLine2,
        siteSuburb: baseQuote.siteSuburb,
        siteState: baseQuote.siteState,
        sitePostcode: baseQuote.sitePostcode,
        travelSurchargeApplied: baseQuote.travelSurchargeApplied,
        travelSurchargeAmount:
          baseQuote.travelSurchargeAmount != null
            ? new Prisma.Decimal(baseQuote.travelSurchargeAmount)
            : null,
        minimumChargeApplied: baseQuote.minimumChargeApplied,
        minimumChargeAmount:
          baseQuote.minimumChargeAmount != null
            ? new Prisma.Decimal(baseQuote.minimumChargeAmount)
            : null,
        subtotal:
          baseQuote.subtotal != null ? new Prisma.Decimal(baseQuote.subtotal) : null,
        gstAmount:
          baseQuote.gstAmount != null ? new Prisma.Decimal(baseQuote.gstAmount) : null,
        total: baseQuote.total != null ? new Prisma.Decimal(baseQuote.total) : null,
        notes: baseQuote.notes,
        sentAt: null,
        sentVia: null,
        items: {
          create: baseQuote.items.map((item) => ({
            name: item.name,
            description: item.description ?? null,
            type: item.type,
            pricingItemId: item.pricingItemId ?? null,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            lineTotal: new Prisma.Decimal(item.lineTotal),
          })),
        },
      },
    });
  });

  return NextResponse.json({ quoteId: created.id });
};
