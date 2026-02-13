import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type { QuoteStatus } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { computeQuoteTotals } from "@/lib/quoteTotals";
import { verifyAddressWithGoogle } from "@/lib/addressVerification";

type Params = { params: Promise<{ quoteId: string }> };
type TransactionClient = Parameters<typeof db.$transaction>[0] extends (tx: infer T) => Promise<unknown>
  ? T
  : never;

const getQuoteId = async (params: Params["params"]) => {
  const resolved = await params;
  return resolved.quoteId;
};

const createQuoteHistory = async (
  tx: TransactionClient,
  quoteId: string,
  orgId: string,
  changedByMemberId?: string | null
) => {
  const snapshot = await tx.quote.findFirst({
    where: { id: quoteId, orgId },
    include: { items: true },
  });

  if (!snapshot) {
    return;
  }

  await tx.quoteHistory.create({
    data: {
      orgId,
      quoteId,
      status: snapshot.status,
      title: snapshot.title,
      customerName: snapshot.customerName,
      customerEmail: snapshot.customerEmail,
      customerPhone: snapshot.customerPhone,
      siteLine1: snapshot.siteLine1,
      siteLine2: snapshot.siteLine2,
      siteSuburb: snapshot.siteSuburb,
      siteState: snapshot.siteState,
      sitePostcode: snapshot.sitePostcode,
      pricingProfileId: snapshot.pricingProfileId,
      travelSurchargeApplied: snapshot.travelSurchargeApplied,
      travelSurchargeAmount: snapshot.travelSurchargeAmount,
      minimumChargeApplied: snapshot.minimumChargeApplied,
      minimumChargeAmount: snapshot.minimumChargeAmount,
      subtotal: snapshot.subtotal,
      gstAmount: snapshot.gstAmount,
      total: snapshot.total,
      notes: snapshot.notes,
      jobId: snapshot.jobId,
      customerId: snapshot.customerId,
      assignedToMemberId: snapshot.assignedToMemberId,
      changedByMemberId: changedByMemberId ?? null,
      items: {
        create: snapshot.items.map((item) => ({
          pricingItemId: item.pricingItemId ?? null,
          type: item.type,
          name: item.name,
          description: item.description ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      },
    },
  });
};

export const GET = async (_req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }
  const member = await db.orgMember.findFirst({
    where: { orgId, userId: session.user.id },
    select: { id: true },
  });
  const changedByMemberId = member?.id ?? null;

  const quoteId = await getQuoteId(params);
  const quote = await db.quote.findFirst({
    where: { id: quoteId, orgId },
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

  const member = await db.orgMember.findFirst({
    where: { orgId, userId: session.user.id },
    select: { id: true },
  });
  const changedByMemberId = member?.id ?? null;

  const quoteId = await getQuoteId(params);
  const body = await req.json();
  const hasItems = Array.isArray(body.items);
  const items = hasItems ? body.items : [];

  if (!hasItems && (body.status || body.assignedToMemberId !== undefined)) {
    const allowedStatuses = new Set<QuoteStatus>([
      "pending",
      "draft",
      "sent",
      "accepted",
      "declined",
    ]);
    const updateData: Prisma.QuoteUncheckedUpdateInput = {};
    if (body.status) {
      const nextStatus = String(body.status) as QuoteStatus;
      if (!allowedStatuses.has(nextStatus)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = nextStatus;
    }

    if (body.assignedToMemberId !== undefined) {
      const raw = body.assignedToMemberId;
      if (raw === null || raw === "" || raw === "unassigned") {
        updateData.assignedToMemberId = null;
      } else {
        const memberId = String(raw);
        const member = await db.orgMember.findFirst({
          where: {
            id: memberId,
            orgId,
            tradeRole: { in: ["electrician", "apprentice"] },
          },
        });
        if (!member) {
          return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
        }
        updateData.assignedToMemberId = member.id;
      }
    }

    if (!updateData.status && updateData.assignedToMemberId === undefined) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const updated = await db.$transaction(async (tx) => {
      await createQuoteHistory(tx, quoteId, orgId, changedByMemberId);
      const saved = await tx.quote.update({
        where: { id: quoteId, orgId },
        data: {
          ...updateData,
          sentAt: null,
          sentVia: null,
        },
      });
      const savedJobId = saved.jobId;
      if (updateData.status === "accepted" && savedJobId) {
        await tx.job.update({
          where: { id: savedJobId, orgId },
          data: { status: "in_progress" },
        });

        const existingTasks = await tx.jobTask.findMany({
          where: { orgId, jobId: savedJobId },
          select: { name: true, sourceQuoteId: true },
        });
        const existingKeys = new Set(
          existingTasks.map((task) => `${task.sourceQuoteId ?? "none"}::${task.name}`)
        );

        const quoteItems = await tx.quoteItem.findMany({
          where: { quoteId },
          orderBy: { id: "asc" },
        });

        const taskCreates = quoteItems
          .filter((item) => !existingKeys.has(`${quoteId}::${item.name}`))
          .map((item, index) => ({
            orgId,
            jobId: savedJobId,
            sourceQuoteId: quoteId,
            name: item.name,
            description: item.description ?? null,
            sortOrder: index,
          }));

        if (taskCreates.length) {
          await tx.jobTask.createMany({ data: taskCreates });
        }
      } else if (savedJobId) {
        const existingTasks = await tx.jobTask.findMany({
          where: { orgId, jobId: savedJobId },
          select: { id: true },
          take: 1,
        });
        if (!existingTasks.length) {
          const acceptedQuote = await tx.quote.findFirst({
            where: { orgId, jobId: savedJobId, status: "accepted" },
            orderBy: { createdAt: "desc" },
            include: { items: true },
          });
          if (acceptedQuote) {
            const taskCreates = acceptedQuote.items.map((item, index) => ({
              orgId,
              jobId: savedJobId,
              sourceQuoteId: acceptedQuote.id,
              name: item.name,
              description: item.description ?? null,
              sortOrder: index,
            }));
            if (taskCreates.length) {
              await tx.jobTask.createMany({ data: taskCreates });
            }
          }
        }
      }
      return saved;
    });
    return NextResponse.json({ quote: updated });
  }

  if (!hasItems) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
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

  if (body.siteLine1) {
    const verification = await verifyAddressWithGoogle({
      line1: body.siteLine1,
      line2: body.siteLine2,
      suburb: body.siteSuburb,
      state: body.siteState,
      postcode: body.sitePostcode,
    });
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error ?? "Invalid address." }, { status: 400 });
    }
  }

  const updated = await db.$transaction(async (tx) => {
    await createQuoteHistory(tx, quoteId, orgId, changedByMemberId);
    await tx.quoteItem.deleteMany({ where: { quoteId } });

    return tx.quote.update({
      where: { id: quoteId, orgId },
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
        sentAt: null,
        sentVia: null,
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

  if (body.siteLine1 && updated.customerId) {
    await db.customer.update({
      where: { id: updated.customerId, orgId },
      data: {
        siteLine1: String(body.siteLine1).trim(),
        siteLine2: body.siteLine2 ? String(body.siteLine2).trim() : null,
        siteSuburb: body.siteSuburb ? String(body.siteSuburb).trim() : null,
        siteState: body.siteState ? String(body.siteState).trim() : null,
        sitePostcode: body.sitePostcode ? String(body.sitePostcode).trim() : null,
      },
    });
  }

  return NextResponse.json({ quote: updated });
};

export const DELETE = async (_req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }
  const member = await db.orgMember.findFirst({
    where: { orgId, userId: session.user.id },
    select: { id: true },
  });
  const changedByMemberId = member?.id ?? null;

  const quoteId = await getQuoteId(params);

  await db.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId } });
    await tx.quote.delete({ where: { id: quoteId, orgId } });
  });

  return NextResponse.json({ ok: true });
};

export const POST = async (req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }
  const changedByMember = await db.orgMember.findFirst({
    where: { orgId, userId: session.user.id },
    select: { id: true },
  });
  const changedByMemberId = changedByMember?.id ?? null;

  const quoteId = await getQuoteId(params);
  const body = await req.json().catch(() => ({}));
  const historyId = String(body.historyId ?? "").trim();

  if (!historyId) {
    return NextResponse.json({ error: "Missing history id" }, { status: 400 });
  }

  const updated = await db.$transaction(async (tx) => {
    const history = await tx.quoteHistory.findFirst({
      where: { id: historyId, quoteId, orgId },
      include: { items: true },
    });

    if (!history) {
      throw new Error("History not found");
    }

    await createQuoteHistory(tx, quoteId, orgId, changedByMemberId);
    await tx.quoteItem.deleteMany({ where: { quoteId } });

    return tx.quote.update({
      where: { id: quoteId, orgId },
      data: {
        status: history.status,
        title: history.title,
        customerId: history.customerId,
        customerName: history.customerName,
        customerEmail: history.customerEmail,
        customerPhone: history.customerPhone,
        siteLine1: history.siteLine1,
        siteLine2: history.siteLine2,
        siteSuburb: history.siteSuburb,
        siteState: history.siteState,
        sitePostcode: history.sitePostcode,
        pricingProfileId: history.pricingProfileId,
        travelSurchargeApplied: history.travelSurchargeApplied,
        travelSurchargeAmount: history.travelSurchargeAmount,
        minimumChargeApplied: history.minimumChargeApplied,
        minimumChargeAmount: history.minimumChargeAmount,
        subtotal: history.subtotal,
        gstAmount: history.gstAmount,
        total: history.total,
        notes: history.notes,
        jobId: history.jobId,
        assignedToMemberId: history.assignedToMemberId,
        sentAt: null,
        sentVia: null,
        items: {
          create: history.items.map((item) => ({
            pricingItemId: item.pricingItemId ?? null,
            type: item.type,
            name: item.name,
            description: item.description ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
      },
    });
  });

  return NextResponse.json({ quote: updated });
};
