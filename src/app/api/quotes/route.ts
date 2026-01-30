import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { computeQuoteTotals } from "@/lib/quoteTotals";

export const GET = async () => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const quotes = await db.quote.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  const response = quotes.map((quote) => ({
    id: quote.id,
    status: quote.status,
    title: quote.title,
    customerName: quote.customerName,
    total: Number(quote.total),
    createdAt: quote.createdAt,
    itemsCount: quote.items.length,
  }));

  return NextResponse.json({ quotes: response });
};

export const POST = async (req: Request) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const body = await req.json();
  const customerName = String(body.customerName ?? "").trim();
  const siteLine1 = String(body.siteLine1 ?? "").trim();

  if (!customerName || !siteLine1) {
    return NextResponse.json({ error: "Customer name and site address are required" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) {
    return NextResponse.json({ error: "Add at least one quote item" }, { status: 400 });
  }

  const profile = await db.pricingProfile.findFirst({
    where: { orgId },
    orderBy: { createdAt: "asc" },
  });

  if (!profile) {
    return NextResponse.json({ error: "Pricing profile not configured" }, { status: 400 });
  }

  const travelSurchargeApplied = Boolean(body.travelSurchargeApplied);
  const totals = computeQuoteTotals(items, profile, travelSurchargeApplied);

  const customerEmail = body.customerEmail ? String(body.customerEmail).trim() : null;
  const customerPhone = body.customerPhone ? String(body.customerPhone).trim() : null;

  const quote = await db.$transaction(async (tx) => {
    let customerId: string | null = null;
    if (customerName) {
      const existing = await tx.customer.findFirst({
        where: {
          orgId,
          name: customerName,
          ...(customerEmail ? { email: customerEmail } : {}),
        },
      });
      if (existing) {
        customerId = existing.id;
      } else {
        const created = await tx.customer.create({
          data: {
            orgId,
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          },
        });
        customerId = created.id;
      }
    }

    return tx.quote.create({
      data: {
        orgId,
        customerId,
        status: "draft",
        title: body.title ? String(body.title).trim() : null,
        customerName,
        customerEmail,
        customerPhone,
        siteLine1,
        siteLine2: body.siteLine2 ? String(body.siteLine2).trim() : null,
        siteSuburb: body.siteSuburb ? String(body.siteSuburb).trim() : null,
        siteState: body.siteState ? String(body.siteState).trim() : null,
        sitePostcode: body.sitePostcode ? String(body.sitePostcode).trim() : null,
        pricingProfileId: profile.id,
        travelSurchargeApplied,
        travelSurchargeAmount: new Prisma.Decimal(totals.travelSurchargeAmount),
        minimumChargeApplied: totals.minimumChargeApplied,
        minimumChargeAmount: new Prisma.Decimal(totals.minimumChargeAmount),
        subtotal: new Prisma.Decimal(totals.subtotal),
        gstAmount: new Prisma.Decimal(totals.gstAmount),
        total: new Prisma.Decimal(totals.total),
        notes: body.notes ? String(body.notes).trim() : null,
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

  return NextResponse.json({ quoteId: quote.id });
};
