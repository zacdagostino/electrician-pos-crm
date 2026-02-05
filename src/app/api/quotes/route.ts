import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { computeQuoteTotals } from "@/lib/quoteTotals";
import { verifyAddressWithGoogle } from "@/lib/addressVerification";

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
  let siteLine1 = String(body.siteLine1 ?? "").trim();
  const customerIdInput = body.customerId ? String(body.customerId).trim() : null;

  if (!customerName || (!siteLine1 && !customerIdInput)) {
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
  const draftId = body.draftId ? String(body.draftId).trim() : null;

  if (siteLine1) {
    const verification = await verifyAddressWithGoogle({
      line1: siteLine1,
      line2: body.siteLine2,
      suburb: body.siteSuburb,
      state: body.siteState,
      postcode: body.sitePostcode,
    });
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error ?? "Invalid address." }, { status: 400 });
    }
  }

  const member = await db.orgMember.findFirst({
    where: { orgId, userId: session.user.id },
  });
  const isAssignable = member?.tradeRole === "electrician" || member?.tradeRole === "apprentice";
  const defaultAssignee =
    (isAssignable ? member : null) ??
    (await db.orgMember.findFirst({
      where: { orgId, status: "active", tradeRole: { in: ["electrician", "apprentice"] } },
      orderBy: { createdAt: "asc" },
    }));

  if (!defaultAssignee) {
    return NextResponse.json(
      { error: "No electrician available to assign." },
      { status: 400 }
    );
  }

  const forceNewCustomer = Boolean(body.forceNewCustomer);

  const quote = await db.$transaction(async (tx) => {

    let customer = customerIdInput
      ? await tx.customer.findFirst({ where: { id: customerIdInput, orgId } })
      : null;

    if (!customer && !forceNewCustomer && customerEmail) {
      customer = await tx.customer.findFirst({ where: { orgId, email: customerEmail } });
    }

    if (!customer && !forceNewCustomer && customerPhone) {
      customer = await tx.customer.findFirst({ where: { orgId, phone: customerPhone } });
    }

    if (!customer && !forceNewCustomer && customerName) {
      customer = await tx.customer.findFirst({ where: { orgId, name: customerName } });
    }

    if (!customer) {
      customer = await tx.customer.create({
        data: {
          orgId,
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          siteLine1: siteLine1 || null,
          siteLine2: body.siteLine2 ? String(body.siteLine2).trim() : null,
          siteSuburb: body.siteSuburb ? String(body.siteSuburb).trim() : null,
          siteState: body.siteState ? String(body.siteState).trim() : null,
          sitePostcode: body.sitePostcode ? String(body.sitePostcode).trim() : null,
        },
      });
    } else if (siteLine1) {
      await tx.customer.update({
        where: { id: customer.id, orgId },
        data: {
          siteLine1: siteLine1 || null,
          siteLine2: body.siteLine2 ? String(body.siteLine2).trim() : null,
          siteSuburb: body.siteSuburb ? String(body.siteSuburb).trim() : null,
          siteState: body.siteState ? String(body.siteState).trim() : null,
          sitePostcode: body.sitePostcode ? String(body.sitePostcode).trim() : null,
        },
      });
    }

    if (!siteLine1 && customer?.siteLine1) {
      siteLine1 = customer.siteLine1;
    }

    const job = await tx.job.create({
      data: {
        orgId,
        customerId: customer.id,
        assignedToMemberId: defaultAssignee.id,
        status: "pending",
        title: body.title ? String(body.title).trim() : null,
        customerName,
        customerEmail,
        customerPhone,
        siteLine1,
        siteLine2: body.siteLine2 ? String(body.siteLine2).trim() : null,
        siteSuburb: body.siteSuburb ? String(body.siteSuburb).trim() : null,
        siteState: body.siteState ? String(body.siteState).trim() : null,
        sitePostcode: body.sitePostcode ? String(body.sitePostcode).trim() : null,
        travelSurchargeApplied,
        travelSurchargeAmount: new Prisma.Decimal(totals.travelSurchargeAmount),
        minimumChargeApplied: totals.minimumChargeApplied,
        minimumChargeAmount: new Prisma.Decimal(totals.minimumChargeAmount),
        subtotal: new Prisma.Decimal(totals.subtotal),
        gstAmount: new Prisma.Decimal(totals.gstAmount),
        total: new Prisma.Decimal(totals.total),
        notes: body.notes ? String(body.notes).trim() : null,
      },
    });

    return tx.quote.create({
      data: {
        orgId,
        customerId: customer.id,
        jobId: job.id,
        status: "pending",
        assignedToMemberId: defaultAssignee.id,
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

  if (draftId) {
    await db.$transaction(async (tx) => {
      await tx.quoteItem.deleteMany({ where: { quoteId: draftId } });
      await tx.quote.deleteMany({ where: { id: draftId, orgId, status: "draft" } });
    });
  }

  return NextResponse.json({ quoteId: quote.id, jobId: quote.jobId });
};
