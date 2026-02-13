import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import QuotePdf from "@/app/quotes/[quoteId]/QuotePdf";

type Params = { params: Promise<{ quoteId: string }> };

const getQuoteId = async (params: Params["params"]) => {
  const resolved = await params;
  return resolved.quoteId;
};

const defaultBlocks = [
  { type: "header" },
  { type: "customer" },
  { type: "items" },
  { type: "totals" },
  { type: "notes" },
  { type: "footer" },
];

export const GET = async (_req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const quoteId = await getQuoteId(params);
  const quote = await db.quote.findFirst({
    where: { id: quoteId, orgId },
    include: { items: true },
  });

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const org = await db.org.findUnique({ where: { id: orgId } });
  const template = await db.quoteTemplate.findFirst({
    where: { orgId, isDefault: true },
    orderBy: { createdAt: "asc" },
  });

  const blocks =
    (template?.blocks as Array<{ type: string }> | null) ?? defaultBlocks;

  const pdfBuffer = await renderToBuffer(
    QuotePdf({
      orgName: org?.name ?? "Workspace",
      orgLogoUrl: org?.logoUrl ?? null,
      quoteNumber: quote.id,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      customerPhone: quote.customerPhone,
      siteLine1: quote.siteLine1,
      siteLine2: quote.siteLine2,
      siteSuburb: quote.siteSuburb,
      siteState: quote.siteState,
      sitePostcode: quote.sitePostcode,
      status: quote.status,
      items: quote.items.map((item) => ({
        name: item.name,
        description: item.description ?? null,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
      subtotal: Number(quote.subtotal),
      gstAmount: Number(quote.gstAmount),
      total: Number(quote.total),
      notes: quote.notes,
      blocks,
      createdAt: quote.createdAt.toLocaleDateString(),
    })
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="quote-${quote.id}.pdf"`,
    },
  });
};
