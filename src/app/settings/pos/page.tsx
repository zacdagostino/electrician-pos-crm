import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";

export default async function PosSettingsPage() {
  const { session, orgId, membership } = await requireOrg();
  const [org, user] = await Promise.all([
    db.org.findUnique({ where: { id: orgId } }),
    db.user.findUnique({ where: { id: session.user.id } }),
  ]);

  const stripeSecretConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const stripeWebhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const stripeReady = stripeSecretConfigured && stripeWebhookConfigured;
  const canManageStripe = membership.role === "owner" || membership.role === "admin";

  return (
    <AppShell
      userName={user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="POS Setup"
      subtitle="Configure card charging and payment readiness for your team."
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">POS setup</p>
            <h2 className="mt-2 inline-flex items-center gap-2 text-lg font-semibold">
              <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-500" fill="currentColor" aria-hidden="true">
                <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm3 1.5a1 1 0 100 2h8a1 1 0 100-2H6zm0 4a1 1 0 100 2h4a1 1 0 100-2H6z" />
              </svg>
              Card charging
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Turn on real card payments for electricians using POS.
            </p>
          </div>
          <a
            href="/pos"
            className="inline-flex items-center justify-center rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
          >
            Open POS
          </a>
        </div>

        {canManageStripe ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Stripe secret key</p>
              <p
                className={`mt-2 text-sm font-semibold ${
                  stripeSecretConfigured ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
                }`}
              >
                {stripeSecretConfigured ? "Configured" : "Missing"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Webhook secret</p>
              <p
                className={`mt-2 text-sm font-semibold ${
                  stripeWebhookConfigured ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
                }`}
              >
                {stripeWebhookConfigured ? "Configured" : "Missing"}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Business Stripe status</p>
            <p
              className={`mt-2 text-sm font-semibold ${
                stripeReady ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {stripeReady ? "Ready for card charging" : "Not ready yet"}
            </p>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
          {stripeReady ? (
            <p className="text-emerald-700 dark:text-emerald-300">Stripe card charging is ready.</p>
          ) : (
            <div className="space-y-3">
              <p className="font-semibold text-amber-700 dark:text-amber-300">Card charging is not ready yet.</p>
              <p>
                {canManageStripe
                  ? "Complete setup once, then all electricians can charge cards from POS."
                  : "An owner/admin needs to finish Stripe setup. Once done, you can charge cards from POS with one tap."}
              </p>
              {canManageStripe ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="https://dashboard.stripe.com/apikeys"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      Open Stripe API keys
                    </a>
                    <a
                      href="https://dashboard.stripe.com/webhooks"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      Open Stripe webhooks
                    </a>
                  </div>
                  <details className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/40">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Self-hosted env setup
                    </summary>
                    <div className="mt-3 space-y-2 text-xs">
                      <p>Add env vars, restart server, then test POS:</p>
                      <code className="block rounded bg-slate-950 px-3 py-2 text-slate-200">
                        STRIPE_SECRET_KEY=sk_live_...{"\n"}
                        STRIPE_WEBHOOK_SECRET=whsec_...
                      </code>
                      <p className="text-slate-500 dark:text-slate-400">
                        Local webhook: <code>stripe listen --forward-to localhost:3000/api/stripe/webhook</code>
                      </p>
                    </div>
                  </details>
                </>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
