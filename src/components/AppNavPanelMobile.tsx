"use client";

import { useState } from "react";
import AppNav from "@/components/AppNav";
import RoleIcon from "@/components/RoleIcon";

type AppNavPanelMobileProps = {
  userName?: string | null;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  userRole?: "electrician" | "apprentice" | "office" | null;
};

export default function AppNavPanelMobile({
  userName,
  orgName,
  orgLogoUrl,
  userRole,
}: AppNavPanelMobileProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-4 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
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
              className="h-12 w-12 rounded-xl border border-slate-200 bg-slate-100 object-cover dark:border-slate-800 dark:bg-slate-900"
            />
          ) : null}
          <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Electrician POS</p>
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {orgName ?? "Workspace"}
                </p>
              {userRole ? (
                <RoleIcon role={userRole} className="h-3.5 w-3.5 text-slate-400" />
              ) : null}
            </div>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
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

      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsOpen(false)}
          className={`absolute inset-0 bg-slate-950/60 transition ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute left-0 top-0 h-full w-72 transform transition ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
                className="rounded-md border border-slate-300 p-1.5 text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
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
            <div className="min-h-0 flex-1">
              <AppNav
                userName={userName}
                orgName={orgName}
                orgLogoUrl={orgLogoUrl}
                userRole={userRole}
                className="h-full w-72 border-r-0"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
