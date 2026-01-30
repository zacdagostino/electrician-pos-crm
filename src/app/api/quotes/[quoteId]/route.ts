import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { computeQuoteTotals } from "@/lib/quoteTotals";

type Params = { params: { quoteId: string } };

export const GET = async (_req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const quote = await db.quote.findFirst({
    where: { id: params.quoteId, orgId },
    include: { items: true },
  });

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  return NextResponse.json({ quote });
};

export const PATCH = async (req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const body = await req.json();
  const items = Array.isArray(body.items) ? body.items : [];

  const profile = await db.pricingProfile.findFirst({
    where: { orgId },
    orderBy: { createdAt: "asc" },
  });

  if (!profile) {
    return NextResponse.json({ error: "Pricing profile not configured" }, { status: 400 });
  }

  const travelSurchargeApplied = Boolean(body.travelSurchargeApplied);
  const totals = computeQuoteTotals(items, profile, travelSurchargeApplied);

  const updated = await db.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId: params.quoteId } });

    return tx.quote.update({
      where: { id: params.quoteId, orgId },
      data: {
        title: body.title ? String(body.title).trim() : undefined,
        customerName: body.customerName ? String(body.customerName).trim() : undefined,
        customerEmail: body.customerEmail ? String(body.customerEmail).trim() : undefined,
        customerPhone: body.customerPhone ? String(body.customerPhone).trim() : undefined,
        siteLine1: body.siteLine1 ? String(body.siteLine1).trim() : undefined,
        siteLine2: body.siteLine2 ? String(body.siteLine2).trim() : undefined,
        siteSuburb: body.siteSuburb ? String(body.siteSuburb).trim() : undefined,
        siteState: body.siteState ? String(body.siteState).trim() : undefined,
        sitePostcode: body.sitePostcode ? String(body.sitePostcode).trim() : undefined,
        travelSurchargeApplied,
        travelSurchargeAmount: new Prisma.Decimal(totals.travelSurchargeAmount),
        minimumChargeApplied: totals.minimumChargeApplied,
        minimumChargeAmount: new Prisma.Decimal(totals.minimumChargeAmount),
        subtotal: new Prisma.Decimal(totals.subtotal),
        gstAmount: new Prisma.Decimal(totals.gstAmount),
        total: new Prisma.Decimal(totals.total),
        notes: body.notes ? String(body.notes).trim() : undefined,
        items: {
          create: totals.normalizedItems.map((item) => ({
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

  return NextResponse.json({ quote: updated });
};
