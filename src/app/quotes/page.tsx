import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";

export default async function QuotesPage() {
  const { session, orgId } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const quotes = await db.quote.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      title="Quotes"
      subtitle="Create, review, and send professional quotes."
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Quote maker</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-100">
                Build quotes from your pricing profile
              </h2>
              <p className="text-sm text-slate-400">
                Fixed services, add-ons, and labour combine into clear totals.
              </p>
            </div>
            <a
              href="/quotes/new"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
            >
              New quote
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Recent quotes</p>
          </header>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {quotes.length ? (
                  quotes.map((quote) => (
                    <tr key={quote.id} className="bg-slate-950/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-100">{quote.customerName}</p>
                        <p className="text-xs text-slate-500">{quote.siteLine1}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{quote.status}</td>
                      <td className="px-4 py-3 text-slate-300">
                        ${Number(quote.total).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {quote.createdAt.toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={4}>
                      No quotes yet. Create your first quote.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
