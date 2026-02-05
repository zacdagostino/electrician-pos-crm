import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { computeQuoteTotals } from "@/lib/quoteTotals";

type Params = { params: Promise<{ draftId: string }> };

const getDraftId = async (params: Params["params"]) => {
  const resolved = await params;
  return resolved.draftId;
};

export const GET = async (_req: Request, { params }: Params) => {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getSelectedOrgId();
    if (!orgId) {
      return NextResponse.json({ error: "No org selected" }, { status: 400 });
    }

    const draftId = await getDraftId(params);
    const quote = await db.quote.findFirst({ where: { id: draftId, orgId }, include: { items: true } });
    if (!quote) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    if (quote.status !== "draft") {
      return NextResponse.json({ error: "Not a draft" }, { status: 400 });
    }

    return NextResponse.json({ draft: quote });
  } catch (err: any) {
    console.error("Error fetching draft:", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
};

export const PATCH = async (req: Request, { params }: Params) => {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getSelectedOrgId();
    if (!orgId) {
      return NextResponse.json({ error: "No org selected" }, { status: 400 });
    }

    const draftId = await getDraftId(params);
    const body = await req.json().catch(() => ({}));

    const quote = await db.quote.findFirst({ where: { id: draftId, orgId } });
    if (!quote) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    if (quote.status !== "draft") {
      return NextResponse.json({ error: "Not a draft" }, { status: 400 });
    }

    const items = Array.isArray(body.items) ? body.items : [];

    const profile = await db.pricingProfile.findFirst({ where: { orgId }, orderBy: { createdAt: "asc" } });
    if (!profile) {
      return NextResponse.json({ error: "Pricing profile not configured" }, { status: 400 });
    }
    const totals = computeQuoteTotals(items, profile, Boolean(body.travelSurchargeApplied));

    const updated = await db.$transaction(async (tx) => {
      // Replace items
      await tx.quoteItem.deleteMany({ where: { quoteId: draftId } });

      if (items.length) {
        await tx.quoteItem.createMany({
          data: items.map((item: any) => ({
            quoteId: draftId,
            pricingItemId: item.pricingItemId ?? null,
            type: item.type,
            name: item.name,
            description: item.description ?? null,
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice ?? 0,
            lineTotal: item.lineTotal ?? 0,
          })),
        });
      }

      return tx.quote.update({
        where: { id: draftId },
        data: {
          customerName: String(body.customerName ?? "").trim(),
          customerEmail: body.customerEmail ? String(body.customerEmail).trim() : null,
          customerPhone: body.customerPhone ? String(body.customerPhone).trim() : null,
          siteLine1: String(body.siteLine1 ?? "").trim(),
          siteLine2: body.siteLine2 ? String(body.siteLine2).trim() : null,
          siteSuburb: body.siteSuburb ? String(body.siteSuburb).trim() : null,
          siteState: body.siteState ? String(body.siteState).trim() : null,
          sitePostcode: body.sitePostcode ? String(body.sitePostcode).trim() : null,
          notes: body.notes ? String(body.notes).trim() : null,
          travelSurchargeApplied: Boolean(body.travelSurchargeApplied),
          travelSurchargeAmount: new Prisma.Decimal(totals.travelSurchargeAmount),
          minimumChargeApplied: totals.minimumChargeApplied,
          minimumChargeAmount: new Prisma.Decimal(totals.minimumChargeAmount),
          subtotal: new Prisma.Decimal(totals.subtotal),
          gstAmount: new Prisma.Decimal(totals.gstAmount),
          total: new Prisma.Decimal(totals.total),
        },
      });
    });

    return NextResponse.json({ draft: updated });
  } catch (err: any) {
    console.error("Error updating draft:", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
};

export const DELETE = async (_req: Request, { params }: Params) => {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getSelectedOrgId();
    if (!orgId) {
      return NextResponse.json({ error: "No org selected" }, { status: 400 });
    }

    const draftId = await getDraftId(params);
    const quote = await db.quote.findFirst({ where: { id: draftId, orgId } });
    if (!quote) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    if (quote.status !== "draft") {
      return NextResponse.json({ error: "Not a draft" }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      await tx.quoteItem.deleteMany({ where: { quoteId: draftId } });
      await tx.quote.delete({ where: { id: draftId, orgId } });
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error deleting draft:", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
};
