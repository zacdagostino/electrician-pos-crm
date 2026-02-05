import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import ProfileForm from "./ProfileForm";
import OrgLogoForm from "./OrgLogoForm";

export default async function SettingsPage() {
  const { session, orgId, membership } = await requireOrg();
  const [org, user, member] = await Promise.all([
    db.org.findUnique({ where: { id: orgId } }),
    db.user.findUnique({ where: { id: session.user.id } }),
    db.orgMember.findFirst({ where: { orgId, userId: session.user.id } }),
  ]);

  return (
    <AppShell
      userName={user?.name}
      orgName={org?.name}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="Settings"
      subtitle="Manage your personal details used across the app."
    >
      <div className="space-y-10">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Pricing</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-100">Pricing profile</h2>
              <p className="text-sm text-slate-400">
                Manage minimum charges, fixed services, and quote language.
              </p>
            </div>
            <a
              href="/settings/pricing"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
            >
              Open pricing
            </a>
          </div>
        </section>
        <OrgLogoForm orgLogoUrl={org?.logoUrl ?? null} />
        <ProfileForm
          name={user?.name ?? null}
          email={user?.email ?? ""}
          phone={user?.phone ?? null}
          tradeRole={member?.tradeRole ?? "office"}
        />
      </div>
    </AppShell>
  );
}
