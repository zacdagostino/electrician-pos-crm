"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { EventResizeDoneArg, EventDropArg } from "@fullcalendar/interaction";
import { useToast } from "@/components/ToastProvider";

type ScheduleJob = {
  id: string;
  title: string | null;
  customerName: string;
  status: string;
  assignedToMemberId: string | null;
  assignedToName: string | null;
  scopeItems: string[];
  scheduledStart: string | null;
  scheduledEnd: string | null;
  scheduledAllDay: boolean;
  scheduledNotes: string | null;
  siteLine1: string;
  siteSuburb: string | null;
  siteState: string | null;
  sitePostcode: string | null;
};

type AssigneeOption = {
  id: string;
  label: string;
  role: string;
};

type JobScheduleCalendarProps = {
  jobs: ScheduleJob[];
  assignees: AssigneeOption[];
};

const addressSummary = (job: ScheduleJob) =>
  [job.siteLine1, job.siteSuburb, job.siteState, job.sitePostcode]
    .filter(Boolean)
    .join(", ");

export default function JobScheduleCalendar({ jobs, assignees }: JobScheduleCalendarProps) {
  const router = useRouter();
  const { notify } = useToast();
  const [jobList, setJobList] = useState<ScheduleJob[]>(jobs);
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quickOpen, setQuickOpen] = useState(false);
  const [preview, setPreview] = useState<{
    id: string;
    title: string;
    customerName: string;
    assignedToName: string | null;
    address: string;
    scopeItems: string[];
    status: string;
    start: string | null;
    end: string | null;
    x: number;
    y: number;
  } | null>(null);

  const [scheduleJobId, setScheduleJobId] = useState("");
  const [scheduleAllDay, setScheduleAllDay] = useState(false);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    setJobList(jobs);
  }, [jobs]);

  const filteredJobs = useMemo(
    () =>
      jobList.filter((job) => {
        if (assigneeFilter !== "all" && job.assignedToMemberId !== assigneeFilter) {
          return false;
        }
        if (statusFilter !== "all" && job.status !== statusFilter) {
          return false;
        }
        return true;
      }),
    [jobList, assigneeFilter, statusFilter]
  );

  const scheduledJobs = filteredJobs.filter((job) => job.scheduledStart);
  const unscheduledJobs = filteredJobs.filter((job) => !job.scheduledStart);

  useEffect(() => {
    if (!scheduleJobId && unscheduledJobs.length) {
      setScheduleJobId(unscheduledJobs[0].id);
    }
  }, [unscheduledJobs, scheduleJobId]);

  const events = useMemo(
    () =>
      scheduledJobs.map((job) => ({
        id: job.id,
        title: job.title ?? job.customerName,
        start: job.scheduledStart ?? undefined,
        end: job.scheduledEnd ?? undefined,
        allDay: job.scheduledAllDay,
        classNames: [`event-status-${job.status}`],
        extendedProps: {
          customerName: job.customerName,
          assignedToName: job.assignedToName,
          address: addressSummary(job),
          scopeItems: job.scopeItems ?? [],
          status: job.status,
        },
      })),
    [scheduledJobs]
  );

  const patchJobSchedule = async (jobId: string, payload: Record<string, unknown>) => {
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      notify({
        tone: "error",
        title: "Schedule update failed",
        message: result.error ?? "Unable to update schedule.",
      });
      return { ok: false, message: result.error };
    }
    setJobList((current) =>
      current.map((job) =>
        job.id === jobId
          ? {
              ...job,
              scheduledStart: (payload.scheduledStart as string | null) ?? job.scheduledStart,
              scheduledEnd: (payload.scheduledEnd as string | null) ?? job.scheduledEnd,
              scheduledAllDay:
                payload.scheduledAllDay === undefined
                  ? job.scheduledAllDay
                  : Boolean(payload.scheduledAllDay),
              scheduledNotes:
                payload.scheduledNotes === undefined
                  ? job.scheduledNotes
                  : String(payload.scheduledNotes ?? ""),
            }
          : job
      )
    );
    return { ok: true };
  };

  const handleEventChange = async (info: EventResizeDoneArg | EventDropArg) => {
    const start = info.event.start ? info.event.start.toISOString() : null;
    const end = info.event.end ? info.event.end.toISOString() : null;
    const allDay = info.event.allDay;
    const result = await patchJobSchedule(info.event.id, {
      scheduledStart: start,
      scheduledEnd: end,
      scheduledAllDay: allDay,
    });
    if (!result.ok) {
      info.revert();
    } else {
      notify({ tone: "success", title: "Schedule updated", message: "Job updated." });
      router.refresh();
    }
  };

  const scheduleJob = async () => {
    if (!scheduleJobId || !scheduleStart) {
      notify({
        tone: "error",
        title: "Missing time",
        message: "Choose a job and start time.",
      });
      return;
    }

    setSavingSchedule(true);
    const startValue = scheduleAllDay
      ? new Date(`${scheduleStart}T00:00`).toISOString()
      : new Date(scheduleStart).toISOString();
    let endValue: string | null = null;
    if (scheduleEnd) {
      endValue = scheduleAllDay
        ? new Date(`${scheduleEnd}T23:59`).toISOString()
        : new Date(scheduleEnd).toISOString();
    }

    const result = await patchJobSchedule(scheduleJobId, {
      scheduledStart: startValue,
      scheduledEnd: endValue,
      scheduledAllDay: scheduleAllDay,
      scheduledNotes,
    });
    if (result.ok) {
      notify({ tone: "success", title: "Job scheduled", message: "Added to calendar." });
      setScheduleStart("");
      setScheduleEnd("");
      setScheduleNotes("");
    }
    setSavingSchedule(false);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-slate-500">
            Assigned electrician
            <select
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
              className="mt-2 w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">All</option>
              {assignees.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mt-2 w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setQuickOpen((current) => !current)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            {quickOpen ? "Close quick schedule" : "Quick schedule"}
          </button>
        </div>
        {quickOpen ? (
          <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
            <label className="text-xs text-slate-500">
              Job
              <select
                value={scheduleJobId}
                onChange={(event) => setScheduleJobId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">Select job</option>
                {unscheduledJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title ?? job.customerName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={scheduleAllDay}
                onChange={(event) => setScheduleAllDay(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950"
              />
              All day
            </label>
            <label className="text-xs text-slate-500">
              {scheduleAllDay ? "Date" : "Start"}
              <input
                type={scheduleAllDay ? "date" : "datetime-local"}
                value={scheduleStart}
                onChange={(event) => setScheduleStart(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            {!scheduleAllDay ? (
              <label className="text-xs text-slate-500">
                End (optional)
                <input
                  type="datetime-local"
                  value={scheduleEnd}
                  onChange={(event) => setScheduleEnd(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
            ) : null}
            <label className="text-xs text-slate-500">
              Notes
              <textarea
                rows={3}
                value={scheduleNotes}
                onChange={(event) => setScheduleNotes(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <button
              type="button"
              onClick={scheduleJob}
              disabled={savingSchedule}
              className="rounded-lg border border-emerald-400/60 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-60 dark:text-emerald-300"
            >
              {savingSchedule ? "Scheduling..." : "Schedule job"}
            </button>
          </div>
        ) : null}
      </section>

      <section className="relative rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        {preview ? (
          <div
            className="pointer-events-none absolute z-20 w-72 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            style={{ left: preview.x, top: preview.y }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Job preview</p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {preview.title}
            </p>
            <p className="mt-1 text-xs text-slate-500">{preview.customerName}</p>
            {preview.address ? (
              <p className="mt-1 text-xs text-slate-500">{preview.address}</p>
            ) : null}
            {preview.assignedToName ? (
              <p className="mt-2 text-xs text-slate-500">
                Assigned: {preview.assignedToName}
              </p>
            ) : null}
            {preview.scopeItems.length ? (
              <div className="mt-2 space-y-1">
                {preview.scopeItems.slice(0, 3).map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-300">{item}</span>
                  </div>
                ))}
                {preview.scopeItems.length > 3 ? (
                  <p className="text-[10px] text-slate-400">
                    +{preview.scopeItems.length - 3} more
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          height="auto"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridDay,timeGridWeek,dayGridMonth",
          }}
          nowIndicator
          selectable={false}
          editable
          eventResizableFromStart
          events={events}
          eventDrop={handleEventChange}
          eventResize={handleEventChange}
          eventClick={(info) => {
            info.jsEvent.preventDefault();
            if (preview?.id === info.event.id) {
              router.push(`/jobs/${info.event.id}`);
            } else {
              const rect = info.el.getBoundingClientRect();
              const y = rect.top + window.scrollY - 12;
              const x = rect.left + rect.width / 2 + window.scrollX;
              const { customerName, assignedToName, address, scopeItems, status } =
                info.event.extendedProps as {
                  customerName?: string;
                  assignedToName?: string;
                  address?: string;
                  scopeItems?: string[];
                  status?: string;
                };
              setPreview({
                id: info.event.id,
                title: info.event.title,
                customerName: customerName ?? "",
                assignedToName: assignedToName ?? null,
                address: address ?? "",
                scopeItems: scopeItems ?? [],
                status: status ?? "pending",
                start: info.event.start ? info.event.start.toISOString() : null,
                end: info.event.end ? info.event.end.toISOString() : null,
                x,
                y,
              });
            }
          }}
          eventMouseEnter={(info) => {
            const rect = info.el.getBoundingClientRect();
            const y = rect.top + window.scrollY - 12;
            const x = rect.left + rect.width / 2 + window.scrollX;
            const { customerName, assignedToName, address, scopeItems, status } =
              info.event.extendedProps as {
                customerName?: string;
                assignedToName?: string;
                address?: string;
                scopeItems?: string[];
                status?: string;
              };
            setPreview({
              id: info.event.id,
              title: info.event.title,
              customerName: customerName ?? "",
              assignedToName: assignedToName ?? null,
              address: address ?? "",
              scopeItems: scopeItems ?? [],
              status: status ?? "pending",
              start: info.event.start ? info.event.start.toISOString() : null,
              end: info.event.end ? info.event.end.toISOString() : null,
              x,
              y,
            });
          }}
          eventMouseLeave={() => setPreview(null)}
          eventDidMount={(info) => {
            const { customerName, assignedToName, address } = info.event.extendedProps as {
              customerName?: string;
              assignedToName?: string;
              address?: string;
            };
            const parts = [
              customerName ? `Client: ${customerName}` : null,
              assignedToName ? `Assigned: ${assignedToName}` : null,
              address ? `Address: ${address}` : null,
            ].filter(Boolean);
            if (parts.length) {
              info.el.setAttribute("title", parts.join(" • "));
            }
          }}
          eventContent={(arg) => {
            const scopeItems = (arg.event.extendedProps as { scopeItems?: string[] })
              .scopeItems;
            const timeLabel =
              arg.view.type === "dayGridMonth"
                ? ""
                : arg.event.allDay
                ? "All day"
                : arg.timeText;
            return (
              <div>
                {timeLabel ? (
                  <div className="fc-event-time-label">{timeLabel}</div>
                ) : null}
                <div className="fc-event-title">{arg.event.title}</div>
                {scopeItems?.length && (arg.view.type === "timeGridDay" || arg.view.type === "timeGridWeek") ? (
                  <div className="fc-event-subtitle">
                    {scopeItems.slice(0, 2).join(", ")}
                    {scopeItems.length > 2 ? ` +${scopeItems.length - 2}` : ""}
                  </div>
                ) : null}
              </div>
            );
          }}
        />
      </section>
    </div>
  );
}
