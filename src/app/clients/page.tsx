import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import Link from "next/link";

export default async function ClientsPage() {
  const { session, orgId, membership } = await requireOrg();
  const org = await db.org.findUnique({ where: { id: orgId } });
  const clients = await db.customer.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      jobs: true,
      quotes: true,
    },
  });

  return (
    <AppShell
      userName={session.user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="Clients"
      subtitle="Every client and their job history."
    >
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Jobs</th>
                <th className="px-4 py-3">Quotes</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {clients.length ? (
                clients.map((client) => {
                  const clientHref = `/clients/${client.id}`;
                  return (
                    <tr
                      key={client.id}
                      className="bg-slate-950/40 transition-colors duration-200 hover:bg-slate-900/70"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={clientHref}
                          className="block font-semibold text-slate-100 hover:text-emerald-200"
                        >
                          {client.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <Link href={clientHref} className="block">
                          <div>{client.email ?? "—"}</div>
                          <div className="text-xs text-slate-500">{client.phone ?? ""}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <Link href={clientHref} className="block">
                          {client.jobs.length}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <Link href={clientHref} className="block">
                          {client.quotes.length}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        <Link href={clientHref} className="block">
                          {client.createdAt.toLocaleDateString()}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={5}>
                    No clients yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
