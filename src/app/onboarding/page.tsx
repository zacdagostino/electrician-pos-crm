import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/authz";
import { db } from "@/lib/db";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const session = await requireAuth();
  const existingMembership = await db.orgMember.findFirst({
    where: {
      userId: session.user.id,
      status: "active",
    },
  });

  if (existingMembership) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Onboarding</p>
          <h1 className="mt-3 text-3xl font-semibold">Create your company</h1>
          <p className="mt-2 text-sm text-slate-300">
            Set up your organization and the first working location.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </main>
  );
}
