import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

const parseNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
};

export const GET = async () => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const items = await db.item.findMany({
    where: { orgId },
    orderBy: { updatedAt: "desc" },
    include: {
      vendor: true,
      stock: true,
    },
  });

  const response = items.map((item) => {
    const totalOnHand = item.stock.reduce((sum, stock) => {
      return sum + Number(stock.onHand ?? 0);
    }, 0);

    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      unitCost: item.unitCost ? Number(item.unitCost) : null,
      sellPrice: item.sellPrice ? Number(item.sellPrice) : null,
      taxRate: item.taxRate ? Number(item.taxRate) : null,
      source: item.source,
      sourceRef: item.sourceRef,
      vendorName: item.vendor?.name ?? null,
      totalOnHand,
      updatedAt: item.updatedAt,
    };
  });

  return NextResponse.json({ items: response });
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
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }

  const sku = body.sku ? String(body.sku).trim() : null;
  const barcode = body.barcode ? String(body.barcode).trim() : null;
  const unitCost = parseNumber(body.unitCost);
  const sellPrice = parseNumber(body.sellPrice);
  const taxRate = parseNumber(body.taxRate);
  const source = body.source ? String(body.source).trim() : "manual";
  const sourceRef = body.sourceRef ? String(body.sourceRef).trim() : null;
  const vendorName = body.vendorName ? String(body.vendorName).trim() : null;

  try {
    const item = await db.$transaction(async (tx) => {
      let vendorId: string | null = null;

      if (vendorName) {
        const vendor = await tx.vendor.upsert({
          where: {
            orgId_name: {
              orgId,
              name: vendorName,
            },
          },
          update: {},
          create: {
            orgId,
            name: vendorName,
          },
        });
        vendorId = vendor.id;
      }

      return tx.item.create({
        data: {
          orgId,
          name,
          sku,
          barcode,
          unitCost: unitCost ?? undefined,
          sellPrice: sellPrice ?? undefined,
          taxRate: taxRate ?? undefined,
          source,
          sourceRef,
          vendorId,
        },
      });
    });

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to create item" }, { status: 500 });
  }
};
