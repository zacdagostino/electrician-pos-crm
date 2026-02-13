import { Prisma, type OrgRole } from "@prisma/client";
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

const getSelectedOrgMembership = async (userId: string) => {
  const cookieStore = await cookies();
  const selectedOrgId = cookieStore.get("org_id")?.value;
  if (!selectedOrgId) return null;

  const membership = await withPoolRetry(() =>
    db.orgMember.findFirst({
      where: {
        userId,
        orgId: selectedOrgId,
        status: "active",
      },
    })
  );
  if (!membership) return null;

  return { orgId: selectedOrgId, membership };
};

const withPoolRetry = async <T>(query: () => Promise<T>) => {
  try {
    return await query();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2024") {
      await new Promise((resolve) => setTimeout(resolve, 120));
      return query();
    }
    throw error;
  }
};

export const getSelectedOrgId = async () => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return null;
  const selected = await getSelectedOrgMembership(session.user.id);
  return selected?.orgId ?? null;
};

export const requireOrg = async () => {
  const session = await requireAuth();
  const selected = await getSelectedOrgMembership(session.user.id);
  if (!selected) {
    redirect("/select-org");
  }

  return { session, orgId: selected.orgId, membership: selected.membership };
};

export const requireRole = async (requiredRole: OrgRole) => {
  const { session, orgId, membership } = await requireOrg();
  if (!membership) {
    redirect("/unauthorized");
  }

  if (membership.role !== requiredRole && membership.role !== "owner") {
    redirect("/unauthorized");
  }

  return { session, orgId, membership };
};

export const requirePermission = async (permission: Permission) => {
  const { session, orgId, membership } = await requireOrg();
  if (!membership || !hasPermission(membership.role, permission)) {
    redirect("/unauthorized");
  }

  return { session, orgId, membership };
};
