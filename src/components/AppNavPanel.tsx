"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AppNav from "@/components/AppNav";

type AppNavPanelProps = {
  userName?: string | null;
  orgName?: string | null;
  orgLogoUrl?: string | null;
};

export default function AppNavPanel({ userName, orgName, orgLogoUrl }: AppNavPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="contents">
      <div className="flex items-center gap-4 border-b border-slate-800 bg-slate-950 px-6 py-4 lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="rounded-lg border border-slate-800 p-2 text-slate-200 hover:bg-slate-900"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
          </svg>
        </button>
        <div className="flex min-w-0 items-center gap-3">
          {orgLogoUrl ? (
            <img
              src={orgLogoUrl}
              alt={`${orgName ?? "Workspace"} logo`}
              className="h-12 w-12 rounded-xl border border-slate-800 bg-slate-900 object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
              Electrician POS
            </p>
            <p className="truncate text-sm font-semibold text-slate-100">
              {orgName ?? "Workspace"}
            </p>
            <p className="truncate text-[11px] text-slate-400">
              {userName ? `${userName} • ${orgName ?? "Workspace"}` : "Signed in"}
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:h-full lg:flex-col lg:border-r lg:border-slate-800 lg:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Navigation</span>
        </div>
        <AppNav
          userName={userName}
          orgName={orgName}
          orgLogoUrl={orgLogoUrl}
          className="h-full border-r-0"
        />
      </div>

      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsOpen(false)}
          className={`absolute inset-0 bg-slate-950/70 transition ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute left-0 top-0 h-full w-72 transform transition ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
                className="rounded-md border border-slate-800 p-1.5 text-slate-200 transition hover:bg-slate-900"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12" />
                  <path d="M18 6l-12 12" />
                </svg>
              </button>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Menu</span>
            </div>
            <AppNav
              userName={userName}
              orgName={orgName}
              orgLogoUrl={orgLogoUrl}
              className="h-full w-72 border-r-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
