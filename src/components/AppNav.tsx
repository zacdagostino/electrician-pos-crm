"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/quotes", label: "Quotes" },
  { href: "/inventory", label: "Inventory" },
  { href: "/select-org", label: "Select org" },
  { href: "/settings", label: "Settings" },
];

type AppNavProps = {
  userName?: string | null;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  className?: string;
};

export default function AppNav({ userName, orgName, orgLogoUrl, className }: AppNavProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex h-full flex-col justify-between border-r border-slate-800 bg-slate-950 px-4 py-6 ${
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
              <p className="mt-1 truncate text-base font-semibold text-slate-100">
                {orgName ?? "Workspace"}
              </p>
              <p className="mt-1 truncate text-xs text-slate-400">
                {userName ? `${userName} • ${orgName ?? "Workspace"}` : "Signed in"}
              </p>
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-emerald-400 text-slate-900"
                    : "text-slate-200 hover:bg-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-lg border border-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
      >
        Sign out
      </button>
    </aside>
  );
}
