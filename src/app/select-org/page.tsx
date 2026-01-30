import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/authz";
import { db } from "@/lib/db";
import SelectOrgList from "./SelectOrgList";

export default async function SelectOrgPage() {
  const session = await requireAuth();
  const memberships = await db.orgMember.findMany({
    where: {
      userId: session.user.id,
      status: "active",
    },
    include: {
      org: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  const orgs = memberships.map((membership) => ({
    id: membership.orgId,
    name: membership.org.name,
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Workspace</p>
          <h1 className="mt-3 text-3xl font-semibold">Select a company</h1>
          <p className="mt-2 text-sm text-slate-300">
            Choose which organization you want to work in.
          </p>
        </div>
        <SelectOrgList orgs={orgs} />
      </div>
    </main>
  );
}
