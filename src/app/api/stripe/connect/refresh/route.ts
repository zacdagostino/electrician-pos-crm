import { NextResponse } from "next/server";
import type { OrgRole } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getStripeClient } from "@/lib/stripe";

const requireSalesPermission = async () => {
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

  if (!membership || !hasPermission(membership.role as OrgRole, "sales:create")) {
    return { error: NextResponse.redirect(new URL("/unauthorized", process.env.NEXTAUTH_URL ?? "http://localhost:3000")) };
  }

  return { orgId };
};

export const GET = async (req: Request) => {
  const auth = await requireSalesPermission();
  if ("error" in auth) return auth.error;

  const org = await db.org.findUnique({
    where: { id: auth.orgId },
    select: { stripeAccountId: true },
  });

  if (org?.stripeAccountId && process.env.STRIPE_SECRET_KEY) {
    const stripe = getStripeClient();
    const account = await stripe.accounts.retrieve(org.stripeAccountId);
    await db.org.update({
      where: { id: auth.orgId },
      data: {
        stripeDetailsSubmitted: Boolean(account.details_submitted),
        stripeChargesEnabled: Boolean(account.charges_enabled),
        stripePayoutsEnabled: Boolean(account.payouts_enabled),
      },
    });
  }

  return NextResponse.redirect(new URL("/settings/pos?connect=refreshed", req.url));
};
