"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RoleIcon from "@/components/RoleIcon";
import { useToast } from "@/components/ToastProvider";

type AssigneeOption = {
  id: string;
  label: string;
  role: "electrician" | "apprentice" | "office";
};

type JobAssigneeSelectProps = {
  jobId: string;
  assignedToMemberId?: string | null;
  assignees: AssigneeOption[];
};

export default function JobAssigneeSelect({
  jobId,
  assignedToMemberId,
  assignees,
}: JobAssigneeSelectProps) {
  const router = useRouter();
  const [value, setValue] = useState(assignedToMemberId ?? "");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const { notify } = useToast();

  const currentAssignee = useMemo(
    () => assignees.find((assignee) => assignee.id === value) ?? null,
    [assignees, value]
  );

  const handleChange = async (next: string) => {
    setValue(next);
    setSaving(true);
    setOpen(false);
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToMemberId: next }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify({
          tone: "error",
          title: "Assignment failed",
          message: payload.error ?? "Unable to update assignment.",
        });
        return;
      }
      notify({ tone: "success", title: "Assignment updated", message: "Job assignee updated." });
      router.refresh();
    } catch (err) {
      notify({ tone: "error", title: "Assignment failed", message: "Unable to update assignment." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="relative flex flex-col items-end gap-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Assigned electrician
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-700/60 dark:bg-slate-950 dark:text-slate-100">
          {currentAssignee ? <RoleIcon role={currentAssignee.role} className="h-3.5 w-3.5" /> : null}
          {currentAssignee?.label ?? "Select"}
        </span>
        <span className="ml-auto text-slate-400">▼</span>
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950"
          role="listbox"
        >
          {assignees.map((assignee) => (
            <button
              key={assignee.id}
              type="button"
              onClick={() => void handleChange(assignee.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
              role="option"
              aria-selected={value === assignee.id}
            >
              <RoleIcon role={assignee.role} className="h-4 w-4 text-slate-400 dark:text-slate-300" />
              <span className="flex-1 truncate">{assignee.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
