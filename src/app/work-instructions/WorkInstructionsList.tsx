"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type ServiceSummary = {
  id: string;
  name: string;
  price: string | null;
  hasSwi: boolean;
};

type WorkInstructionsListProps = {
  services: ServiceSummary[];
};

export default function WorkInstructionsList({ services }: WorkInstructionsListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return services;
    return services.filter((service) => service.name.toLowerCase().includes(trimmed));
  }, [query, services]);

  const missing = filtered.filter((service) => !service.hasSwi);
  const existing = filtered.filter((service) => service.hasSwi);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Search</label>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search services"
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-300 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Missing SWI</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Services without instructions
            </h2>
            <p className="mt-1 text-sm text-slate-500">Create a simple text SWI for each service.</p>
          </div>
          <p className="text-xs text-slate-500">{missing.length} services</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {missing.length ? (
            missing.map((service) => (
              <Link
                key={service.id}
                href={`/work-instructions/${service.id}`}
                className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-950"
              >
                <p className="font-semibold">{service.name}</p>
                <p className="mt-1 text-xs text-slate-500">Create SWI</p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-500">All services have work instructions.</p>
          )}
        </div>
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
              <Link
                key={service.id}
                href={`/work-instructions/${service.id}`}
                className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-950"
              >
                <p className="font-semibold">{service.name}</p>
                <p className="mt-1 text-xs text-slate-500">View / edit SWI</p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-500">No SWIs created yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
