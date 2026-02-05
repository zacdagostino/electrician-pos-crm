"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StackedCard from "@/components/StackedCard";
import JobStatusDropdown from "@/components/JobStatusDropdown";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";

type JobRow = {
  id: string;
  title: string | null;
  siteLine1: string;
  siteLine2?: string | null;
  siteSuburb?: string | null;
  siteState?: string | null;
  sitePostcode?: string | null;
  customerId: string | null;
  customerName: string | null;
  assignedToMemberId: string | null;
  assignedToName: string | null;
  status: string;
  total: string | null;
  createdDate: string;
  scopeItems: string[];
  quoteCount: number;
  scheduledStart: string | null;
};

type JobsTableProps = {
  jobs: JobRow[];
};

export default function JobsTable({ jobs }: JobsTableProps) {
  const router = useRouter();
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const { notify } = useToast();
  const { confirm } = useConfirm();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [pendingDeletes] = useState<Record<string, number>>({});

  const visibleJobs = useMemo(() => jobs.filter((job) => !hiddenIds.has(job.id)), [jobs, hiddenIds]);
  const allSelected = visibleJobs.length > 0 && selectedIds.size === visibleJobs.length;
  const linkedSelectedCount = useMemo(
    () => visibleJobs.filter((job) => selectedIds.has(job.id) && job.quoteCount > 0).length,
    [visibleJobs, selectedIds]
  );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visibleJobs.map((job) => job.id)));
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const ok = await confirm({
      title: "Delete jobs",
      message:
        linkedSelectedCount > 0
          ? `Some selected jobs have ${linkedSelectedCount} linked quote(s). Deleting these jobs will also delete those quotes. Continue?`
          : `Delete ${ids.length} job(s)? This cannot be undone.`,
      confirmLabel: linkedSelectedCount > 0 ? "Delete jobs + quotes" : "Delete jobs",
      tone: "danger",
    });
    if (!ok) return;

    const pendingId = `jobs-${Date.now()}`;
    setHiddenIds((prev) => new Set([...prev, ...ids]));
    setSelectedIds(new Set());
    notify({
      tone: "warning",
      title: "Jobs scheduled",
      message: `Deleting ${ids.length} job(s) in 5 seconds.`,
      actionLabel: "Undo",
      onAction: () => {
        const timeout = pendingDeletes[pendingId];
        if (timeout) window.clearTimeout(timeout);
        delete pendingDeletes[pendingId];
        setHiddenIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        notify({ tone: "info", title: "Undo", message: "Job deletion canceled." });
      },
    });

    pendingDeletes[pendingId] = window.setTimeout(async () => {
      setDeleting(true);
      try {
        const response = await fetch("/api/jobs/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobIds: ids,
            deleteLinkedQuotes: linkedSelectedCount > 0,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          notify({ tone: "error", title: "Delete failed", message: payload.error ?? "Unable to delete jobs." });
          setHiddenIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
          });
          return;
        }
        router.refresh();
        notify({
          tone: "success",
          title: "Jobs deleted",
          message: linkedSelectedCount > 0
            ? `Deleted ${payload.deletedJobs ?? ids.length} jobs and ${payload.deletedQuotes ?? linkedSelectedCount} quotes.`
            : `Deleted ${payload.deletedJobs ?? ids.length} jobs.`,
        });
      } catch (err) {
        notify({ tone: "error", title: "Delete failed", message: "Unable to delete jobs." });
        setHiddenIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      } finally {
        setDeleting(false);
        delete pendingDeletes[pendingId];
      }
    }, 5000);
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-xs text-slate-300">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-slate-700 bg-slate-950"
          />
          Select all
        </label>
        <div className="flex items-center gap-2">
          <span>{selectedIds.size} selected</span>
          <button
            type="button"
            onClick={() => void handleBulkDelete()}
            disabled={!selectedIds.size || deleting}
            className="rounded-lg border border-rose-400/60 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete selected"}
          </button>
        </div>
      </div>
      {visibleJobs.length ? (
        visibleJobs.map((job) => (
          <StackedCard
            key={job.id}
            onClick={() => router.push(`/jobs/${job.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(`/jobs/${job.id}`);
              }
            }}
            topRight={
              <label
                className="flex items-center gap-2"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(job.id)}
                  onChange={() => toggleSelected(job.id)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                  aria-label="Select job"
                />
              </label>
            }
          >
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1.1fr_0.6fr]">
              <div className="min-w-0 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-200">
                    Job
                  </span>
                  <span className="text-xs text-slate-500">{job.createdDate}</span>
                  {!job.assignedToMemberId ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-700 dark:border-rose-400/50 dark:bg-rose-500/10 dark:text-rose-200">
                      Unassigned
                    </span>
                  ) : null}
                  {!job.scheduledStart ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:border-amber-400/50 dark:bg-amber-500/10 dark:text-amber-200">
                      Not scheduled
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-100">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21a8 8 0 0 0-16 0" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {job.customerId && job.customerName ? (
                    <Link
                      href={`/clients/${job.customerId}`}
                      className="hover:text-emerald-200"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {job.customerName}
                    </Link>
                  ) : (
                    <span>Customer</span>
                  )}
                  {job.customerId ? (
                    <Link
                      href={`/clients/${job.customerId}`}
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-800 text-slate-400 transition hover:text-emerald-200 hover:border-emerald-400/50"
                      aria-label="View client"
                      title="View client"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 7h10v10" />
                        <path d="M7 17 17 7" />
                      </svg>
                    </Link>
                  ) : null}
                  {job.assignedToName ? (
                    <span className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21a8 8 0 0 0-16 0" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      {job.assignedToName}
                    </span>
                  ) : null}
                  <div
                    className="relative"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <JobStatusDropdown jobId={job.id} status={job.status} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="mt-0.5 h-4 w-4 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s7-7.6 7-12a7 7 0 0 0-14 0c0 4.4 7 12 7 12z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {job.siteLine1 ? <span>{job.siteLine1}</span> : null}
                  {job.siteLine1 &&
                  (job.siteLine2 || job.siteSuburb || job.siteState || job.sitePostcode) ? (
                    <span>•</span>
                  ) : null}
                  {job.siteLine2 ? <span>{job.siteLine2}</span> : null}
                  {job.siteLine2 && (job.siteSuburb || job.siteState || job.sitePostcode) ? (
                    <span>•</span>
                  ) : null}
                  {job.siteSuburb || job.siteState || job.sitePostcode ? (
                    <span>
                      {[job.siteSuburb, job.siteState, job.sitePostcode].filter(Boolean).join(" ")}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/50 bg-slate-950/5 p-3 text-xs text-slate-300">
                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  <span>Scope</span>
                </div>
                {job.scopeItems.length ? (
                  <ul className="space-y-1">
                    {job.scopeItems.map((item, index) => (
                      <li key={`${item}-${index}`} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/70" />
                        <span className="font-semibold text-slate-200">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">No scope items</p>
                )}
              </div>

              <div className="flex flex-col items-end gap-3 text-right">
                <p className="text-lg font-semibold text-slate-100">{job.total ?? "—"}</p>
              </div>
            </div>
          </StackedCard>
        ))
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-6 text-center text-sm text-slate-500">
          No jobs yet.
        </div>
      )}
    </div>
  );
}
