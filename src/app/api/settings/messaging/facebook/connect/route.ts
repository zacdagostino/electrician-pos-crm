import crypto from "crypto";
import { NextResponse } from "next/server";
import type { OrgRole } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { buildMetaOAuthUrl, getMetaAppConfig } from "@/lib/messenger";

const requireManager = async () => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { error: NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000")) };
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return { error: NextResponse.redirect(new URL("/select-org", process.env.NEXTAUTH_URL ?? "http://localhost:3000")) };
  }

  const membership = await db.orgMember.findFirst({
    where: { userId: session.user.id, orgId, status: "active" },
    select: { role: true },
  });
  if (!membership || !["owner", "admin"].includes(membership.role as OrgRole)) {
    return { error: NextResponse.redirect(new URL("/unauthorized", process.env.NEXTAUTH_URL ?? "http://localhost:3000")) };
  }

  return { orgId };
};

export const GET = async (req: Request) => {
  const cfg = getMetaAppConfig();
  if (!cfg.configured) {
    return NextResponse.redirect(new URL("/settings/messaging?error=meta_env_missing", req.url));
  }

  const auth = await requireManager();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;
  const state = `${orgId}:${crypto.randomBytes(16).toString("hex")}`;
  const origin = new URL(req.url).origin;
  const oauthUrl = buildMetaOAuthUrl(origin, state);

  const response = NextResponse.redirect(oauthUrl);
  response.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
};
