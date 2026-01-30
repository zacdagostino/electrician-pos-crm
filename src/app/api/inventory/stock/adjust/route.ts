import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

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
  const itemId = String(body.itemId ?? "").trim();
  const locationId = String(body.locationId ?? "").trim();
  const quantity = Number(body.quantity);
  const reason = String(body.reason ?? "adjustment").trim();

  if (!itemId || !locationId || Number.isNaN(quantity) || !reason) {
    return NextResponse.json({ error: "Invalid adjustment request" }, { status: 400 });
  }

  const item = await db.item.findFirst({ where: { id: itemId, orgId } });
  const location = await db.location.findFirst({ where: { id: locationId, orgId } });

  if (!item || !location) {
    return NextResponse.json({ error: "Item or location not found" }, { status: 404 });
  }

  const adjustment = await db.$transaction(async (tx) => {
    const stockItem = await tx.stockItem.upsert({
      where: {
        itemId_locationId: {
          itemId,
          locationId,
        },
      },
      update: {
        onHand: { increment: new Prisma.Decimal(quantity) },
      },
      create: {
        orgId,
        itemId,
        locationId,
        onHand: new Prisma.Decimal(quantity),
      },
    });

    await tx.stockMovement.create({
      data: {
        orgId,
        itemId,
        locationId,
        quantity: new Prisma.Decimal(quantity),
        reason,
        createdById: session.user.id,
      },
    });

    return stockItem;
  });

  return NextResponse.json({ stockItem: adjustment });
};
