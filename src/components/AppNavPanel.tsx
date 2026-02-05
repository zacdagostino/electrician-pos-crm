import AppNav from "@/components/AppNav";
import ThemeToggle from "@/components/ThemeToggle";
import AppNavPanelMobile from "@/components/AppNavPanelMobile";

type AppNavPanelProps = {
  userName?: string | null;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  userRole?: "electrician" | "apprentice" | "office" | null;
};

export default function AppNavPanel({ userName, orgName, orgLogoUrl, userRole }: AppNavPanelProps) {
  return (
    <div className="flex flex-col lg:h-full">
      <AppNavPanelMobile
        userName={userName}
        orgName={orgName}
        orgLogoUrl={orgLogoUrl}
        userRole={userRole}
      />

      <div className="hidden lg:flex lg:h-full lg:flex-col lg:border-r lg:border-slate-800 lg:bg-slate-950">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Navigation</span>
          <ThemeToggle className="w-auto px-2 py-1 text-xs" />
        </div>
        <AppNav
          userName={userName}
          orgName={orgName}
          orgLogoUrl={orgLogoUrl}
          userRole={userRole}
          className="h-full border-r-0"
        />
      </div>

    </div>
  );
}
