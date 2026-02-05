import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

type Params = { params: Promise<{ itemId: string }> };

const getItemId = async (params: Params["params"]) => {
  const resolved = await params;
  return resolved.itemId;
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

  const itemId = await getItemId(params);
  const item = await db.sWILibraryItem.findFirst({ where: { id: itemId, orgId } });
  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  await db.sWILibraryItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
};
