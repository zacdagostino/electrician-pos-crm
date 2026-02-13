"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { matchesFuzzy } from "@/lib/fuzzy";

type ServiceSummary = {
  id: string;
  name: string;
  price: string | null;
  hasSwi: boolean;
  isDraft: boolean;
};

type WorkInstructionsListProps = {
  services: ServiceSummary[];
};

export default function WorkInstructionsList({ services }: WorkInstructionsListProps) {
  const [query, setQuery] = useState("");
  const [showAllMissing, setShowAllMissing] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return services;
    return services.filter((service) => matchesFuzzy(service.name, query));
  }, [query, services]);

  const missing = filtered.filter((service) => !service.hasSwi || service.isDraft);
  const existing = filtered.filter((service) => service.hasSwi && !service.isDraft);
  const missingLimit = 6;
  const hasMoreMissing = missing.length > missingLimit;
  const missingVisible = showAllMissing ? missing : missing.slice(0, missingLimit);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Search</label>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setShowAllMissing(false);
          }}
          placeholder="Search services"
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-300 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Needs Completion</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Services needing final SWI
            </h2>
            <p className="mt-1 text-sm text-slate-500">Create or finish each service SWI draft.</p>
          </div>
          <p className="text-xs text-slate-500">{missing.length} services</p>
        </div>

        <div className={`relative mt-4 ${!showAllMissing && hasMoreMissing ? "pb-8" : ""}`}>
          <div className="grid gap-3 md:grid-cols-2">
            {missing.length ? (
              missingVisible.map((service) => (
                <Link
                  key={service.id}
                  href={`/work-instructions/${service.id}`}
                  className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-950"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{service.name}</p>
                    {service.isDraft ? (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
                        Draft
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{service.isDraft ? "Continue draft" : "Create SWI"}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500">All services have work instructions.</p>
            )}
          </div>
          {!showAllMissing && hasMoreMissing ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80" />
          ) : null}
        </div>

        {hasMoreMissing ? (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAllMissing((value) => !value)}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-700"
            >
              {showAllMissing ? "Show less" : "Show more"}
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Available SWI</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Services with instructions
            </h2>
          </div>
          <p className="text-xs text-slate-500">{existing.length} services</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {existing.length ? (
            existing.map((service) => (
              <div
                key={service.id}
                className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-950"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{service.name}</p>
                    <p className="mt-1 text-xs text-slate-500">Completed SWI</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/work-instructions/${service.id}/run`}
                      aria-label={`Open ${service.name} SWI`}
                      title="Open SWI"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </Link>
                    <Link
                      href={`/work-instructions/${service.id}`}
                      aria-label={`Edit ${service.name} SWI`}
                      title="Edit SWI"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No SWIs created yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
