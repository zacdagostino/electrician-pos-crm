import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

export const GET = async () => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const items = await db.sWILibraryItem.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
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

  const body = await req.json().catch(() => ({}));
  if (!body?.name || !body?.type) {
    return NextResponse.json({ error: "Name and type are required." }, { status: 400 });
  }

  const item = await db.sWILibraryItem.create({
    data: {
      orgId,
      type: body.type,
      name: body.name,
      usage: body.usage ?? null,
      howTo: body.howTo ?? null,
    },
  });

  return NextResponse.json({ item });
};
