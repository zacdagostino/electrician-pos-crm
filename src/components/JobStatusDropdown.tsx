"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type JobStatusDropdownProps = {
  jobId: string;
  status: string;
};

const statusOptions = ["pending", "in_progress", "completed", "cancelled"] as const;

const statusStyles: Record<string, string> = {
  pending: "border-amber-300 text-amber-700 dark:border-amber-400/50 dark:text-amber-200",
  in_progress: "border-sky-300 text-sky-700 dark:border-sky-400/50 dark:text-sky-200",
  completed: "border-emerald-300 text-emerald-700 dark:border-emerald-400/60 dark:text-emerald-200",
  cancelled: "border-rose-300 text-rose-700 dark:border-rose-400/60 dark:text-rose-200",
};

const formatStatusLabel = (value: string) =>
  value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export default function JobStatusDropdown({ jobId, status }: JobStatusDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("Has the client accepted the quote?");
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const updateStatus = async (nextStatus: string, forceStatus = false) => {
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, forceStatus }),
    });

    if (response.status === 409) {
      const payload = await response.json().catch(() => ({}));
      setConfirmMessage(payload?.message ?? "Has the client accepted the quote?");
      setPendingStatus(nextStatus);
      setConfirmOpen(true);
      return;
    }

    router.refresh();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
          statusStyles[status] ?? "border-slate-300 text-slate-600 dark:border-slate-500/60 dark:text-slate-300"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {formatStatusLabel(status)}
        <span className="text-[10px]">▼</span>
      </button>
      {isOpen ? (
        <div
          className="absolute left-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950"
          role="listbox"
          onMouseLeave={() => setIsOpen(false)}
        >
          {statusOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={async () => {
                await updateStatus(option);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
              role="option"
              aria-selected={status === option}
            >
              {formatStatusLabel(option)}
            </button>
          ))}
        </div>
      ) : null}
      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Confirm status
            </p>
            <h3 className="mt-2 text-lg font-semibold">Set job to active?</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {confirmMessage}
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  setPendingStatus(null);
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const next = pendingStatus;
                  setConfirmOpen(false);
                  setPendingStatus(null);
                  if (next) {
                    await updateStatus(next, true);
                  }
                }}
                className="rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
              >
                Yes, mark active
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
