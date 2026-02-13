"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";
import RoleIcon from "@/components/RoleIcon";

const navSections = [
  {
    title: "Core",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/pos", label: "POS" },
      { href: "/quotes", label: "Quotes" },
      { href: "/jobs", label: "Jobs" },
      { href: "/clients", label: "Clients" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/jobs/schedule", label: "Schedule" },
      { href: "/services", label: "Services" },
      { href: "/work-instructions", label: "Work instructions" },
      { href: "/inventory", label: "Inventory" },
      { href: "/team", label: "Team" },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/settings/pricing", label: "Pricing profile" },
      { href: "/settings", label: "Settings" },
      { href: "/select-org", label: "Select org" },
    ],
  },
];

type AppNavProps = {
  userName?: string | null;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  userRole?: "electrician" | "apprentice" | "office" | null;
  className?: string;
};

export default function AppNav({ userName, orgName, orgLogoUrl, userRole, className }: AppNavProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex h-full min-h-0 flex-col overflow-y-auto border-r border-slate-800 bg-slate-950 px-4 py-6 ${
        className ?? ""
      }`}
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
          <div className="flex items-center gap-3">
            {orgLogoUrl ? (
              <img
                src={orgLogoUrl}
                alt={`${orgName ?? "Workspace"} logo`}
                className="h-14 w-14 rounded-xl border border-slate-800 bg-slate-900 object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                Electrician POS
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="truncate text-base font-semibold text-slate-100">
                  {orgName ?? "Workspace"}
                </p>
                {userRole ? (
                  <RoleIcon role={userRole} className="h-4 w-4 text-slate-400" />
                ) : null}
              </div>
              <p className="mt-1 truncate text-xs text-slate-400">
                {userName ? (
                  <span className="inline-flex items-center gap-1">
                    {userRole ? <RoleIcon role={userRole} className="h-3 w-3" /> : null}
                    {`${userName} • ${orgName ?? "Workspace"}`}
                  </span>
                ) : (
                  "Signed in"
                )}
              </p>
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-4">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                {section.title}
              </p>
              <div className="flex flex-col gap-2">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "bg-emerald-400 text-white"
                          : "text-slate-200 hover:bg-slate-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
      <div className="mt-6 space-y-2">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full rounded-lg border border-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
