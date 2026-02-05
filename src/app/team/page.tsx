import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import RoleIcon from "@/components/RoleIcon";

const formatRole = (role: string) =>
  role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export default async function TeamPage() {
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const members = await db.orgMember.findMany({
    where: { orgId, status: "active" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="Team"
      subtitle="Company members and roles."
      backLink={{ href: "/dashboard", label: "Back to dashboard" }}
      breadcrumbs={[{ label: "Team" }]}
    >
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Org role</th>
                <th className="px-4 py-3">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {members.length ? (
                members.map((member) => (
                  <tr key={member.id} className="bg-slate-950/40">
                    <td className="px-4 py-3">
                      <a
                        href={`/team/${member.id}`}
                        className="inline-flex items-center gap-2 font-semibold text-slate-100 hover:text-emerald-200"
                      >
                        <RoleIcon role={member.tradeRole} className="h-4 w-4 text-slate-400" />
                        {member.user?.name ?? "Unnamed"}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {formatRole(member.tradeRole)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{member.role}</td>
                    <td className="px-4 py-3 text-slate-400">{member.user?.email ?? "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={4}>
                    No team members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
