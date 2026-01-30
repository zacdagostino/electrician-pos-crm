"use client";

import { useState } from "react";

type OrgOption = {
  id: string;
  name: string;
};

type SelectOrgListProps = {
  orgs: OrgOption[];
};

export default function SelectOrgList({ orgs }: SelectOrgListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectOrg = async (orgId: string) => {
    setLoadingId(orgId);
    setError(null);

    const response = await fetch("/api/org/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error || "Unable to select org.");
      setLoadingId(null);
      return;
    }

    window.location.href = "/dashboard";
  };

  return (
    <div className="flex flex-col gap-3">
      {orgs.map((org) => (
        <button
          key={org.id}
          type="button"
          onClick={() => selectOrg(org.id)}
          disabled={loadingId === org.id}
          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-left text-sm"
        >
          <span>{org.name}</span>
          <span className="text-xs text-slate-400">
            {loadingId === org.id ? "Selecting..." : "Enter"}
          </span>
        </button>
      ))}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
