import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

const defaultBlocks = [
  { id: "header", type: "header", label: "Header" },
  { id: "customer", type: "customer", label: "Customer details" },
  { id: "items", type: "items", label: "Line items" },
  { id: "totals", type: "totals", label: "Totals" },
  { id: "notes", type: "notes", label: "Notes" },
  { id: "footer", type: "footer", label: "Footer" },
];

export const GET = async () => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const template = await db.quoteTemplate.findFirst({
    where: { orgId, isDefault: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    template: template ?? {
      id: null,
      name: "Default template",
      blocks: defaultBlocks,
    },
  });
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
  const name = String(body.name ?? "Default template").trim() || "Default template";
  const blocks = Array.isArray(body.blocks) ? body.blocks : defaultBlocks;

  const existing = await db.quoteTemplate.findFirst({
    where: { orgId, isDefault: true },
  });

  const template = existing
    ? await db.quoteTemplate.update({
        where: { id: existing.id },
        data: { name, blocks, isDefault: true },
      })
    : await db.quoteTemplate.create({
        data: { orgId, name, blocks, isDefault: true },
      });

  return NextResponse.json({ template });
};
