import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { OrgRole } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { exchangeFacebookCode, listFacebookPages, subscribeAppToFacebookPage } from "@/lib/messenger";

const hasMessagingTask = (tasks: string[]) => {
  const normalized = tasks.map((task) => task.toUpperCase());
  return normalized.includes("MESSAGING") || normalized.includes("MANAGE") || normalized.includes("MODERATE");
};

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
  const url = new URL(req.url);
  const code = String(url.searchParams.get("code") ?? "").trim();
  const state = String(url.searchParams.get("state") ?? "").trim();
  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings/messaging?error=oauth_missing", req.url));
  }

  const auth = await requireManager();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("meta_oauth_state")?.value ?? "";
  const expectedOrgId = expectedState.split(":")[0] ?? "";
  if (!expectedState || expectedState !== state || expectedOrgId !== orgId) {
    return NextResponse.redirect(new URL("/settings/messaging?error=oauth_state", req.url));
  }

  try {
    const origin = url.origin;
    const userToken = await exchangeFacebookCode(origin, code);
    const pages = await listFacebookPages(userToken);
    const chosen = pages.find((page) => hasMessagingTask(page.tasks)) ?? pages[0];

    if (!chosen) {
      return NextResponse.redirect(new URL("/settings/messaging?error=no_pages", req.url));
    }

    await subscribeAppToFacebookPage(chosen.id, chosen.accessToken);

    await db.messengerIntegration.upsert({
      where: {
        orgId_channel: {
          orgId,
          channel: "facebook_messenger",
        },
      },
      create: {
        orgId,
        channel: "facebook_messenger",
        pageId: chosen.id,
        pageName: chosen.name,
        pageAccessToken: chosen.accessToken,
        active: true,
      },
      update: {
        pageId: chosen.id,
        pageName: chosen.name,
        pageAccessToken: chosen.accessToken,
        active: true,
      },
    });

    const response = NextResponse.redirect(new URL("/settings/messaging?connected=1", req.url));
    response.cookies.delete("meta_oauth_state");
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/settings/messaging?error=oauth_exchange", req.url));
    response.cookies.delete("meta_oauth_state");
    return response;
  }
};
