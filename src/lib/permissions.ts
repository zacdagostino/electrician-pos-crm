import type { OrgRole } from "@prisma/client";

export type Permission =
  | "org:manage"
  | "billing:manage"
  | "users:manage"
  | "locations:manage"
  | "products:manage"
  | "taxes:manage"
  | "refunds:manage"
  | "reports:view"
  | "sales:create"
  | "jobs:create"
  | "materials:add";

export const rolePermissions: Record<OrgRole, Permission[]> = {
  owner: [
    "org:manage",
    "billing:manage",
    "users:manage",
    "locations:manage",
    "products:manage",
    "taxes:manage",
    "refunds:manage",
    "reports:view",
    "sales:create",
    "jobs:create",
    "materials:add",
  ],
  admin: [
    "users:manage",
    "locations:manage",
    "products:manage",
    "taxes:manage",
    "refunds:manage",
    "reports:view",
    "sales:create",
    "jobs:create",
    "materials:add",
  ],
  staff: ["sales:create", "jobs:create", "materials:add"],
};

export const hasPermission = (role: OrgRole, permission: Permission) => {
  return rolePermissions[role]?.includes(permission) ?? false;
};
