import { NextResponse } from "next/server";
import type { OrgRole } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";

const requireOwnerOrAdmin = async () => {
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
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.redirect(new URL("/settings/pos?connect=missing_platform_key", req.url));
  }

  const auth = await requireOwnerOrAdmin();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;

  const org = await db.org.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, stripeAccountId: true, abn: true },
  });
  if (!org) {
    return NextResponse.redirect(new URL("/settings/pos?connect=org_not_found", req.url));
  }

  const stripe = getStripeClient();
  let accountId = org.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "AU",
      metadata: {
        orgId: org.id,
      },
      business_profile: {
        name: org.name,
      },
    });
    accountId = account.id;
    await db.org.update({
      where: { id: org.id },
      data: { stripeAccountId: accountId },
    });
  }

  const origin = new URL(req.url).origin;
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${origin}/api/stripe/connect/onboard`,
    return_url: `${origin}/settings/pos?connect=returned`,
  });

  return NextResponse.redirect(accountLink.url);
};
