import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import ProfileForm from "../ProfileForm";

export default async function ProfileSettingsPage() {
  const { session, orgId, membership } = await requireOrg();
  const [org, user, member] = await Promise.all([
    db.org.findUnique({ where: { id: orgId } }),
    db.user.findUnique({ where: { id: session.user.id } }),
    db.orgMember.findFirst({ where: { orgId, userId: session.user.id } }),
  ]);

  return (
    <AppShell
      userName={user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="Profile"
      subtitle="Manage your personal details and role used across jobs, quotes, and POS."
    >
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Your profile</p>
        <h2 className="mt-2 text-lg font-semibold">Account details</h2>
        <div className="mt-4">
          <ProfileForm
            name={user?.name ?? null}
            email={user?.email ?? ""}
            phone={user?.phone ?? null}
            tradeRole={member?.tradeRole ?? "office"}
            accessRole={member?.role ?? "staff"}
          />
        </div>
      </section>
    </AppShell>
  );
}
