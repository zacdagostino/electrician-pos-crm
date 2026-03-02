import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import { getPlatformFeePercent } from "@/lib/stripe";

type PosSettingsPageProps = {
  searchParams: Promise<{ connect?: string }>;
};

export default async function PosSettingsPage({ searchParams }: PosSettingsPageProps) {
  const { session, orgId, membership } = await requireOrg();
  const resolvedSearchParams = await searchParams;
  const [org, user] = await Promise.all([
    db.org.findUnique({ where: { id: orgId } }),
    db.user.findUnique({ where: { id: session.user.id } }),
  ]);

  const stripeSecretConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const stripeWebhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const platformReady = stripeSecretConfigured && stripeWebhookConfigured;
  const orgConnected = Boolean(org?.stripeAccountId);
  const orgReady = Boolean(org?.stripeChargesEnabled && org?.stripePayoutsEnabled);
  const canManageStripe = membership.role === "owner" || membership.role === "admin";
  const connectHint = String(resolvedSearchParams.connect ?? "").trim();

  return (
    <AppShell
      userName={user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="POS Setup"
      subtitle="Connect Stripe for this electrician business and enable marketplace payouts."
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Stripe Connect</p>
            <h2 className="mt-2 inline-flex items-center gap-2 text-lg font-semibold">
              <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-500" fill="currentColor" aria-hidden="true">
                <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm3 1.5a1 1 0 100 2h8a1 1 0 100-2H6zm0 4a1 1 0 100 2h4a1 1 0 100-2H6z" />
              </svg>
              Marketplace card charging
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Each electrician org gets its own Stripe connected account. Platform fee: {getPlatformFeePercent()}%.
            </p>
          </div>
          <a
            href="/pos"
            className="inline-flex items-center justify-center rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
          >
            Open POS
          </a>
        </div>

        {connectHint ? (
          <div className="mt-4 rounded-xl border border-sky-300 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200">
            Stripe status updated: <span className="font-semibold">{connectHint.replaceAll("_", " ")}</span>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Platform secret key</p>
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
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Connected account</p>
            <p
              className={`mt-2 text-sm font-semibold ${
                orgReady ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {orgReady ? "Ready" : orgConnected ? "Incomplete" : "Not connected"}
            </p>
            {org?.stripeAccountId ? <p className="mt-1 text-xs text-slate-500">{org.stripeAccountId}</p> : null}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
          {!platformReady ? (
            <div className="space-y-3">
              <p className="font-semibold text-amber-700 dark:text-amber-300">Platform Stripe keys are missing.</p>
              <p>Add env vars and redeploy:</p>
              <code className="block rounded bg-slate-950 px-3 py-2 text-slate-200">
                STRIPE_SECRET_KEY=sk_live_...{"\n"}
                STRIPE_WEBHOOK_SECRET=whsec_...{"\n"}
                STRIPE_CONNECT_PLATFORM_FEE_PERCENT=5
              </code>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {orgReady
                  ? "This electrician account is ready to charge cards and receive payouts."
                  : "Finish Stripe onboarding for this electrician org."}
              </p>
              <p>
                {canManageStripe
                  ? "Use Connect Stripe below. Stripe handles bank details and verification."
                  : "An owner/admin must complete Stripe onboarding for this org."}
              </p>
              {canManageStripe ? (
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/api/stripe/connect/onboard"
                    className="rounded-lg border border-emerald-400/60 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                  >
                    {orgConnected ? "Resume Stripe onboarding" : "Connect Stripe"}
                  </a>
                  <a
                    href="/api/stripe/connect/refresh"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Refresh Stripe status
                  </a>
                  <a
                    href="https://dashboard.stripe.com/connect/accounts"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Open Stripe Connect
                  </a>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
