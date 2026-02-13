import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";

export default async function SettingsPage() {
  const { session, orgId, membership } = await requireOrg();
  const [org, user] = await Promise.all([
    db.org.findUnique({ where: { id: orgId } }),
    db.user.findUnique({ where: { id: session.user.id } }),
  ]);

  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY) && Boolean(process.env.STRIPE_WEBHOOK_SECRET);

  const settingsItems = [
    {
      id: "pos",
      title: "POS setup",
      description: "Connect Stripe and enable real card charging in POS.",
      href: "/settings/pos",
      ready: stripeReady,
      icon: (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm3 1.5a1 1 0 100 2h8a1 1 0 100-2H6zm0 4a1 1 0 100 2h4a1 1 0 100-2H6z" />
        </svg>
      ),
    },
    {
      id: "pricing",
      title: "Pricing profile",
      description: "Set callout, minimum charge, travel and quote defaults.",
      href: "/settings/pricing",
      ready: true,
      icon: (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M3 4a1 1 0 011-1h10.5A2.5 2.5 0 0117 5.5V15a2 2 0 01-2 2H4a1 1 0 01-1-1V4zm4 2.5a1.5 1.5 0 000 3h6a1.5 1.5 0 000-3H7zm0 5a1.5 1.5 0 100 3h3a1.5 1.5 0 100-3H7z" />
        </svg>
      ),
    },
    {
      id: "branding",
      title: "Branding",
      description: "Upload org logo used in navigation and PDFs.",
      href: "/settings/branding",
      ready: Boolean(org?.logoUrl),
      icon: (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M2.5 4A1.5 1.5 0 014 2.5h12A1.5 1.5 0 0117.5 4v12a1.5 1.5 0 01-1.5 1.5H4A1.5 1.5 0 012.5 16V4zm3 10h9l-2.8-3.5a1 1 0 00-1.5-.1L8.8 12 7 10.2a1 1 0 00-1.5.1L5.5 14zm1-7a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0z" />
        </svg>
      ),
    },
    {
      id: "profile",
      title: "Profile",
      description: "Manage your personal details and trade role.",
      href: "/settings/profile",
      ready: Boolean(user?.name),
      icon: (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm0 2c-3.5 0-7 1.75-7 4v1h14v-1c0-2.25-3.5-4-7-4z" />
        </svg>
      ),
    },
  ];

  return (
    <AppShell
      userName={user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="Settings"
      subtitle="Open a settings area to manage business and account setup."
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Settings list</p>
        <h2 className="mt-2 text-lg font-semibold">Choose a settings page</h2>
        <div className="mt-4 space-y-2">
          {settingsItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-900"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                  item.ready
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                }`}
              >
                {item.ready ? "Ready" : "Setup"}
              </span>
            </a>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
