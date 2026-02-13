import { NextResponse } from "next/server";
import type { OrgRole } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { verifyTerminalHandoffToken } from "@/lib/terminalHandoff";

type TerminalAuthContext = {
  orgId: string;
  userId: string;
  allowedSaleId: string | null;
};

const getBearerToken = (req: Request) => {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
  return authHeader.slice(7).trim();
};

const verifyUserPermission = async (input: {
  userId: string;
  orgId: string;
  permission: "sales:create";
}) => {
  const membership = await db.orgMember.findFirst({
    where: { userId: input.userId, orgId: input.orgId, status: "active" },
    select: { role: true },
  });
  if (!membership || !hasPermission(membership.role as OrgRole, input.permission)) {
    return null;
  }
  return membership;
};

export const requireTerminalSalesPermission = async (
  req: Request
): Promise<{ error: NextResponse } | TerminalAuthContext> => {
  const bearer = getBearerToken(req);
  if (bearer) {
    const tokenPayload = verifyTerminalHandoffToken(bearer);
    if (!tokenPayload) {
      return { error: NextResponse.json({ error: "Invalid or expired handoff token." }, { status: 401 }) };
    }
    const membership = await verifyUserPermission({
      userId: tokenPayload.sub,
      orgId: tokenPayload.orgId,
      permission: "sales:create",
    });
    if (!membership) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { orgId: tokenPayload.orgId, userId: tokenPayload.sub, allowedSaleId: tokenPayload.saleId };
  }

  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return { error: NextResponse.json({ error: "No org selected" }, { status: 400 }) };
  }

  const membership = await verifyUserPermission({
    userId: session.user.id,
    orgId,
    permission: "sales:create",
  });
  if (!membership) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { orgId, userId: session.user.id, allowedSaleId: null };
};
