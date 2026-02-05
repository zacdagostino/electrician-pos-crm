import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import RoleIcon from "@/components/RoleIcon";

export default async function DashboardPage() {
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title={
        <span className="inline-flex items-center gap-2">
          Welcome, {session.user?.name ?? "Electrician"}
          {membership?.tradeRole ? (
            <RoleIcon role={membership.tradeRole} className="h-5 w-5 text-slate-400" />
          ) : null}
        </span>
      }
      subtitle={`Active org: ${org?.name ?? orgId}`}
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Quick links</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-100">Inventory hub</h2>
              <p className="text-sm text-slate-400">
                Jump straight into stock, receipts, and supplier items.
              </p>
            </div>
            <a
              href="/inventory"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
            >
              Open inventory
            </a>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="/inventory"
              className="group rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-emerald-500/60 hover:bg-slate-950"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">Catalog search</p>
                <span className="text-xs uppercase tracking-[0.2em] text-emerald-300">Go</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Find items from Bunnings or your mock catalog and add them fast.
              </p>
            </a>
            <a
              href="/inventory"
              className="group rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-emerald-500/60 hover:bg-slate-950"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">Receipt scans</p>
                <span className="text-xs uppercase tracking-[0.2em] text-emerald-300">Go</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Upload receipts for local OCR and reconcile stock later.
              </p>
            </a>
            <a
              href="/inventory"
              className="group rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-emerald-500/60 hover:bg-slate-950"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">Manual entry</p>
                <span className="text-xs uppercase tracking-[0.2em] text-emerald-300">Go</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Add custom items, services, and one-off parts manually.
              </p>
            </a>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Next</p>
            <p className="mt-2 text-sm text-slate-200">
              Build out POS flows, inventory, and invoicing under this org.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Security</p>
            <p className="mt-2 text-sm text-slate-200">
              All records will be scoped by the selected org id on the server.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
