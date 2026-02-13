import AppShell from "@/components/AppShell";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import OrgLogoForm from "../OrgLogoForm";

export default async function BrandingSettingsPage() {
  const { session, orgId, membership } = await requireOrg();
  const [org, user] = await Promise.all([
    db.org.findUnique({ where: { id: orgId } }),
    db.user.findUnique({ where: { id: session.user.id } }),
  ]);

  return (
    <AppShell
      userName={user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="Branding"
      subtitle="Set your organization logo used across the app."
    >
      <OrgLogoForm orgLogoUrl={org?.logoUrl ?? null} />
    </AppShell>
  );
}
