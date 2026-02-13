import AppNav from "@/components/AppNav";
import AppNavPanelMobile from "@/components/AppNavPanelMobile";

type AppNavPanelProps = {
  userName?: string | null;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  userRole?: "electrician" | "apprentice" | "office" | null;
};

export default function AppNavPanel({ userName, orgName, orgLogoUrl, userRole }: AppNavPanelProps) {
  return (
    <div className="flex flex-col lg:h-full lg:min-h-0">
      <AppNavPanelMobile
        userName={userName}
        orgName={orgName}
        orgLogoUrl={orgLogoUrl}
        userRole={userRole}
      />

      <div className="hidden lg:block lg:h-full lg:min-h-0">
        <AppNav
          userName={userName}
          orgName={orgName}
          orgLogoUrl={orgLogoUrl}
          userRole={userRole}
          className="h-full"
        />
      </div>
    </div>
  );
}
