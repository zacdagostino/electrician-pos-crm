import type { OrgRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getServerAuthSession } from "@/auth";
import { db } from "@/lib/db";
import { hasPermission, type Permission } from "@/lib/permissions";

export const requireAuth = async () => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
};

export const getSelectedOrgId = async () => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return null;

  const cookieStore = await cookies();
  const selectedOrgId = cookieStore.get("org_id")?.value;
  if (!selectedOrgId) return null;

  const membership = await db.orgMember.findFirst({
    where: {
      userId: session.user.id,
      orgId: selectedOrgId,
      status: "active",
    },
  });

  if (!membership) return null;
  return selectedOrgId;
};

export const requireOrg = async () => {
  const session = await requireAuth();
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/select-org");
  }
  return { session, orgId };
};

export const requireRole = async (requiredRole: OrgRole) => {
  const { session, orgId } = await requireOrg();
  const membership = await db.orgMember.findFirst({
    where: {
      userId: session.user.id,
      orgId,
      status: "active",
    },
  });

  if (!membership) {
    redirect("/unauthorized");
  }

  if (membership.role !== requiredRole && membership.role !== "owner") {
    redirect("/unauthorized");
  }

  return { session, orgId, membership };
};

export const requirePermission = async (permission: Permission) => {
  const { session, orgId } = await requireOrg();
  const membership = await db.orgMember.findFirst({
    where: {
      userId: session.user.id,
      orgId,
      status: "active",
    },
  });

  if (!membership || !hasPermission(membership.role, permission)) {
    redirect("/unauthorized");
  }

  return { session, orgId, membership };
};
