"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

type JobScheduleCardProps = {
  jobId: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  scheduledAllDay: boolean;
  scheduledNotes: string | null;
};

const toDateTimeInput = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const pad = (num: number) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toDateInput = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const pad = (num: number) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

export default function JobScheduleCard({
  jobId,
  scheduledStart,
  scheduledEnd,
  scheduledAllDay,
  scheduledNotes,
}: JobScheduleCardProps) {
  const router = useRouter();
  const { notify } = useToast();
  const [allDay, setAllDay] = useState(Boolean(scheduledAllDay));
  const [start, setStart] = useState(
    scheduledAllDay ? toDateInput(scheduledStart) : toDateTimeInput(scheduledStart)
  );
  const [end, setEnd] = useState(
    scheduledAllDay ? toDateInput(scheduledEnd) : toDateTimeInput(scheduledEnd)
  );
  const [notes, setNotes] = useState(scheduledNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(!scheduledStart);

  const saveSchedule = async () => {
    if (!start) {
      notify({ tone: "error", title: "Missing time", message: "Pick a start time." });
      return;
    }
    setSaving(true);
    const startValue = allDay ? new Date(`${start}T00:00`).toISOString() : new Date(start).toISOString();
    const endValue = end
      ? allDay
        ? new Date(`${end}T23:59`).toISOString()
        : new Date(end).toISOString()
      : null;

    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledStart: startValue,
        scheduledEnd: endValue,
        scheduledAllDay: allDay,
        scheduledNotes: notes,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      notify({
        tone: "error",
        title: "Schedule failed",
        message: payload.error ?? "Unable to update schedule.",
      });
      setSaving(false);
      return;
    }
    notify({ tone: "success", title: "Schedule saved", message: "Job updated." });
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  const clearSchedule = async () => {
    setSaving(true);
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledStart: null,
        scheduledEnd: null,
        scheduledAllDay: false,
        scheduledNotes: "",
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      notify({
        tone: "error",
        title: "Clear failed",
        message: payload.error ?? "Unable to clear schedule.",
      });
      setSaving(false);
      return;
    }
    notify({ tone: "success", title: "Schedule cleared", message: "Job unscheduled." });
    setSaving(false);
    setStart("");
    setEnd("");
    setNotes("");
    setAllDay(false);
    setEditing(true);
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Schedule</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Set when this job should happen and keep your calendar up to date.
          </p>
        </div>
        <a
          href="/jobs/schedule"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          Open schedule
        </a>
      </div>
      {scheduledStart && !editing ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Scheduled</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Date</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {new Date(scheduledStart).toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Start time</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {allDay
                  ? "All day"
                  : new Date(scheduledStart).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">End time</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {allDay
                  ? "All day"
                  : scheduledEnd
                  ? new Date(scheduledEnd).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>
            </div>
          </div>
          {scheduledNotes ? (
            <p className="mt-3 text-xs text-slate-500">{scheduledNotes}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Edit schedule
            </button>
            <button
              type="button"
              onClick={clearSchedule}
              disabled={saving}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 text-sm">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(event) => {
                  const next = event.target.checked;
                  setAllDay(next);
                  setStart((value) =>
                    next ? (value ? value.slice(0, 10) : "") : value ? `${value}T08:00` : ""
                  );
                  setEnd("");
                }}
                className="h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950"
              />
              All day
            </label>
            <label className="text-xs text-slate-500">
              {allDay ? "Date" : "Start"}
              <input
                type={allDay ? "date" : "datetime-local"}
                value={start}
                onChange={(event) => setStart(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            {!allDay ? (
              <label className="text-xs text-slate-500">
                End (optional)
                <input
                  type="datetime-local"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
            ) : null}
            <label className="text-xs text-slate-500">
              Notes
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveSchedule}
              disabled={saving}
              className="rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-60 dark:text-emerald-300"
            >
              {saving ? "Saving..." : "Save schedule"}
            </button>
            {scheduledStart ? (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
