"use client";

import dynamic from "next/dynamic";

type AppNavPanelMobileClientProps = {
  userName?: string | null;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  userRole?: "electrician" | "apprentice" | "office" | null;
};

const AppNavPanelMobile = dynamic(() => import("@/components/AppNavPanelMobile"), {
  ssr: false,
});

export default function AppNavPanelMobileClient(props: AppNavPanelMobileClientProps) {
  return <AppNavPanelMobile {...props} />;
}

