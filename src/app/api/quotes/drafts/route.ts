import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

export const POST = async (req: Request) => {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getSelectedOrgId();
    if (!orgId) {
      return NextResponse.json({ error: "No org selected" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    // Create a draft quote. Some fields in the database are non-nullable,
    // so use empty string / zeros as sensible defaults for drafts.
    const profile = await db.pricingProfile.findFirst({ where: { orgId }, orderBy: { createdAt: "asc" } });

    const draft = await db.quote.create({
      data: {
        orgId,
        customerName: String(body.customerName ?? "").trim(),
        customerEmail: body.customerEmail ? String(body.customerEmail).trim() : null,
        customerPhone: body.customerPhone ? String(body.customerPhone).trim() : null,
        siteLine1: String(body.siteLine1 ?? "").trim(),
        siteLine2: body.siteLine2 ? String(body.siteLine2).trim() : null,
        siteSuburb: body.siteSuburb ? String(body.siteSuburb).trim() : null,
        siteState: body.siteState ? String(body.siteState).trim() : null,
        sitePostcode: body.sitePostcode ? String(body.sitePostcode).trim() : null,
        status: "draft",
        pricingProfileId: profile?.id ?? null,
        travelSurchargeApplied: Boolean(body.travelSurchargeApplied),
        travelSurchargeAmount: 0,
        minimumChargeApplied: false,
        minimumChargeAmount: 0,
        subtotal: 0,
        gstAmount: 0,
        total: 0,
        notes: body.notes ? String(body.notes).trim() : null,
      },
    });

    return NextResponse.json({ draftId: draft.id, draft });
  } catch (err: any) {
    console.error("Error creating draft:", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
};
