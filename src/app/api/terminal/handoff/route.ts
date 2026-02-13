import { NextResponse } from "next/server";
import type { OrgRole } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { createTerminalHandoffToken } from "@/lib/terminalHandoff";

const requireSalesCreatePermission = async () => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return { error: NextResponse.json({ error: "No org selected" }, { status: 400 }) };
  }

  const membership = await db.orgMember.findFirst({
    where: { userId: session.user.id, orgId, status: "active" },
    select: { role: true },
  });

  if (!membership || !hasPermission(membership.role as OrgRole, "sales:create")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { orgId, userId: session.user.id };
};

export const POST = async (req: Request) => {
  const auth = await requireSalesCreatePermission();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const saleId = String(body.saleId ?? "").trim();
  if (!saleId) {
    return NextResponse.json({ error: "saleId is required." }, { status: 400 });
  }

  const sale = await db.posSale.findFirst({
    where: { id: saleId, orgId: auth.orgId },
    select: { id: true },
  });
  if (!sale) {
    return NextResponse.json({ error: "Sale not found." }, { status: 404 });
  }

  const token = createTerminalHandoffToken({
    userId: auth.userId,
    orgId: auth.orgId,
    saleId: sale.id,
  });

  const scheme = process.env.MOBILE_APP_SCHEME?.trim() || "sparkdesk";
  const deepLink = `${scheme}://tap-pay?saleId=${encodeURIComponent(sale.id)}&token=${encodeURIComponent(token)}`;

  return NextResponse.json({
    saleId: sale.id,
    token,
    deepLink,
    expiresInSeconds: 600,
  });
};
