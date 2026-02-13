import { NextResponse } from "next/server";
import type { OrgRole } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getStripeClient } from "@/lib/stripe";

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

  return { orgId };
};

export const POST = async () => {
  const auth = await requireSalesCreatePermission();
  if ("error" in auth) {
    return auth.error;
  }

  const stripe = getStripeClient();
  const token = await stripe.terminal.connectionTokens.create();
  return NextResponse.json({ secret: token.secret });
};
