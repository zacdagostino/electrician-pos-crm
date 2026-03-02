import { NextResponse } from "next/server";
import type { OrgRole } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

const requireManager = async () => {
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

  if (!membership || !["owner", "admin"].includes(membership.role as OrgRole)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { orgId };
};

export const PATCH = async (req: Request) => {
  const auth = await requireManager();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const reviewBeforeSend = Boolean(body.reviewBeforeSend);
  const autoReplyEnabled = Boolean(body.autoReplyEnabled);

  const integration = await db.messengerIntegration.findFirst({
    where: { orgId: auth.orgId, channel: "facebook_messenger", active: true },
    select: { id: true },
  });

  if (!integration) {
    return NextResponse.json({ error: "Facebook Messenger is not connected." }, { status: 400 });
  }

  await db.messengerIntegration.update({
    where: { id: integration.id },
    data: {
      reviewBeforeSend,
      autoReplyEnabled,
    },
  });

  return NextResponse.json({ ok: true });
};
