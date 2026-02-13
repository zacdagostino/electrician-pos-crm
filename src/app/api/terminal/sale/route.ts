import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTerminalSalesPermission } from "@/lib/terminalAuth";

export const GET = async (req: Request) => {
  const auth = await requireTerminalSalesPermission(req);
  if ("error" in auth) {
    return auth.error;
  }
  const { orgId, allowedSaleId } = auth;

  const url = new URL(req.url);
  const requestedSaleId = String(url.searchParams.get("saleId") ?? "").trim();
  const saleId = allowedSaleId ?? requestedSaleId;
  if (!saleId) {
    return NextResponse.json({ error: "saleId is required." }, { status: 400 });
  }

  const sale = await db.posSale.findFirst({
    where: { id: saleId, orgId },
    select: {
      id: true,
      status: true,
      total: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      reference: true,
      jobId: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
        },
      },
    },
  });

  if (!sale) {
    return NextResponse.json({ error: "Sale not found." }, { status: 404 });
  }

  let jobTitle: string | null = null;
  if (sale.jobId) {
    const job = await db.job.findFirst({
      where: { id: sale.jobId, orgId },
      select: { title: true, customerName: true, siteSuburb: true },
    });
    if (job) {
      jobTitle = job.title?.trim() || `${job.customerName} - ${job.siteSuburb?.trim() || "Site"}`;
    }
  }

  return NextResponse.json({
    sale: {
      id: sale.id,
      status: sale.status,
      total: Number(sale.total),
      customerName: sale.customerName,
      customerEmail: sale.customerEmail,
      customerPhone: sale.customerPhone,
      reference: sale.reference,
      jobId: sale.jobId,
      jobTitle,
      items: sale.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
    },
  });
};
