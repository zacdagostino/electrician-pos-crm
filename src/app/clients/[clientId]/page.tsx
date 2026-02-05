import AppShell from "@/components/AppShell";
import DeleteButton from "@/components/DeleteButton";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";

type ClientPageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function ClientPage({ params }: ClientPageProps) {
  const { clientId } = await params;
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const client = await db.customer.findFirst({
    where: { id: clientId, orgId },
    include: {
      jobs: {
        orderBy: { createdAt: "desc" },
        include: { quotes: { orderBy: { createdAt: "desc" } } },
      },
    },
  });

  if (!client) {
    return (
      <AppShell
        userName={session.user?.name}
        orgName={org?.name ?? orgId}
        orgLogoUrl={org?.logoUrl ?? null}
        userRole={membership?.tradeRole ?? null}
        title="Client not found"
      >
        <p className="text-sm text-slate-400">This client no longer exists.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title={client.name}
      subtitle="Client profile and job history."
      backLink={{ href: "/clients", label: "Back to clients" }}
      breadcrumbs={[
        { label: "Clients", href: "/clients" },
        { label: client.name },
      ]}
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Client</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-100">{client.name}</h2>
              <p className="text-sm text-slate-400">{client.email ?? "No email"}</p>
              <p className="text-sm text-slate-400">{client.phone ?? ""}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/clients/${client.id}/edit`}
                className="inline-flex items-center justify-center rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
              >
                Edit client
              </a>
              <DeleteButton
                endpoint={`/api/clients/${client.id}`}
                redirectTo="/clients"
                label="Delete client"
                confirmText="Delete this client? Jobs and quotes must be removed first."
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <header className="mb-4 text-xs uppercase tracking-[0.3em] text-slate-500">
            Job history
          </header>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Quote</th>
                  <th className="px-4 py-3">Job total</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {client.jobs.length ? (
                  client.jobs.map((job) => (
                    <tr key={job.id} className="bg-slate-950/40">
                      <td className="px-4 py-3">
                        <a
                          href={`/jobs/${job.id}`}
                          className="font-semibold text-slate-100 hover:text-emerald-200"
                        >
                          {job.title ?? "Electrical job"}
                        </a>
                        <p className="text-xs text-slate-500">{job.siteLine1}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{job.status}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {job.quotes.length ? (
                          <div className="space-y-1">
                            {job.quotes.map((quote) => (
                              <div key={quote.id} className="flex items-center gap-2">
                                <a
                                  href={`/quotes/${quote.id}`}
                                  className="font-semibold text-slate-100 hover:text-emerald-200"
                                >
                                  {quote.title ?? "Quote"}
                                </a>
                                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                  {quote.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {job.total != null ? `$${Number(job.total).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {job.createdAt.toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={5}>
                      No jobs yet.
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
