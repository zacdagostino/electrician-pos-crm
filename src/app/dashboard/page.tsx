import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import RoleIcon from "@/components/RoleIcon";

export default async function DashboardPage() {
  const { session, orgId, membership } = await requireOrg();
  const [org, pricingProfile, serviceCount, locationCount] = await Promise.all([
    db.org.findUnique({ where: { id: orgId } }),
    db.pricingProfile.findFirst({ where: { orgId }, select: { id: true } }),
    db.service.count({ where: { orgId } }),
    db.location.count({ where: { orgId } }),
  ]);
  const stripeSecretConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const stripeWebhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const stripeReady =
    stripeSecretConfigured &&
    stripeWebhookConfigured &&
    Boolean(org?.stripeAccountId) &&
    Boolean(org?.stripeChargesEnabled) &&
    Boolean(org?.stripePayoutsEnabled);
  const setupChecks = [
    {
      label: "Pricing profile configured",
      done: Boolean(pricingProfile),
      href: "/settings/pricing",
      required: true,
    },
    {
      label: "At least one service in library",
      done: serviceCount > 0,
      href: "/services",
      required: true,
    },
    {
      label: "Primary stock location created",
      done: locationCount > 0,
      href: "/inventory",
      required: true,
    },
    {
      label: "Stripe live card charging configured",
      done: stripeReady,
      href: "/settings/pos",
      required: false,
    },
  ];
  const requiredChecks = setupChecks.filter((check) => check.required);
  const requiredDone = requiredChecks.filter((check) => check.done).length;

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Setup health</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-100">Go-live checklist</h2>
              <p className="text-sm text-slate-400">
                Complete required setup first. Stripe is optional unless you want real card charging.
              </p>
            </div>
            <a
              href="/pos"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
            >
              Open POS
            </a>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-slate-100">
              Required complete: {requiredDone}/{requiredChecks.length}
            </p>
            <div className="mt-3 space-y-2">
              {setupChecks.map((check) => (
                <a
                  key={check.label}
                  href={check.href}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm hover:bg-slate-900"
                >
                  <span className="text-slate-200">
                    {check.label}
                    {!check.required ? (
                      <span className="ml-2 text-xs uppercase tracking-[0.2em] text-slate-500">Optional</span>
                    ) : null}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                      check.done
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {check.done ? "Done" : "Setup"}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

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
