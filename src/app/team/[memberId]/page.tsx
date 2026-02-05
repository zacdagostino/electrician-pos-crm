import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import RoleIcon from "@/components/RoleIcon";

type TeamMemberPageProps = {
  params: { memberId: string };
};

const formatRole = (role: string | null) =>
  role
    ? role
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "Unknown";

export default async function TeamMemberPage({ params }: TeamMemberPageProps) {
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const member = await db.orgMember.findFirst({
    where: { id: params.memberId, orgId },
    include: { user: true },
  });

  if (!member) {
    return (
      <AppShell
        userName={session.user?.name}
        orgName={org?.name ?? orgId}
        orgLogoUrl={org?.logoUrl ?? null}
        userRole={membership?.tradeRole ?? null}
        title="Team member not found"
        backLink={{ href: "/quotes", label: "Back to quotes" }}
        breadcrumbs={[{ label: "Team" }, { label: "Profile" }]}
      >
        <p className="text-sm text-slate-400">This team member no longer exists.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title={member.user?.name ?? "Team member"}
      subtitle={member.user?.email ?? ""}
      backLink={{ href: "/quotes", label: "Back to quotes" }}
      breadcrumbs={[{ label: "Team" }, { label: member.user?.name ?? "Profile" }]}
    >
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-3">
          <RoleIcon role={member.tradeRole} className="h-6 w-6 text-slate-300" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Role</p>
            <p className="text-sm text-slate-100">{formatRole(member.tradeRole)}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-slate-300">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Name</p>
            <p className="text-sm text-slate-100">{member.user?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Email</p>
            <p className="text-sm text-slate-100">{member.user?.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Phone</p>
            <p className="text-sm text-slate-100">{member.user?.phone ?? "—"}</p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
