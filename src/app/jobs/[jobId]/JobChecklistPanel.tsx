"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type JobTask = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  completedAt?: string | null;
  completedByName?: string | null;
};

type JobChecklistPanelProps = {
  jobId: string;
  tasks: JobTask[];
};

export default function JobChecklistPanel({ jobId, tasks }: JobChecklistPanelProps) {
  const router = useRouter();
  const [localTasks, setLocalTasks] = useState<JobTask[]>(tasks);
  const [selectedTask, setSelectedTask] = useState<JobTask | null>(null);
  const [open, setOpen] = useState(false);

  const completedCount = useMemo(
    () => localTasks.filter((task) => task.status === "completed").length,
    [localTasks]
  );

  const toggleTask = async (task: JobTask) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: nextStatus,
              completedAt: nextStatus === "completed" ? new Date().toISOString() : null,
            }
          : t
      )
    );
    await fetch(`/api/jobs/${jobId}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    router.refresh();
  };


  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Job checklist</p>
            <h3 className="mt-2 text-lg font-semibold">Tasks & work instructions</h3>
            <p className="text-sm text-slate-500">
              {completedCount} of {tasks.length} completed
            </p>
          </div>
          <div className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
            {Math.round((completedCount / Math.max(tasks.length, 1)) * 100)}% done
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {localTasks.length ? (
            localTasks.map((task) => (
              <div
                key={task.id}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-900/70"
              >
                <button
                  type="button"
                  onClick={() => toggleTask(task)}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${
                    task.status === "completed"
                      ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                      : "border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400"
                  }`}
                  aria-label={task.status === "completed" ? "Mark pending" : "Mark complete"}
                >
                  {task.status === "completed" ? "✓" : ""}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTask(task);
                    setOpen(true);
                  }}
                  className="flex flex-1 items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="font-semibold">{task.name}</p>
                    {task.completedAt ? (
                      <p className="text-xs text-slate-500">
                        Completed {new Date(task.completedAt).toLocaleString()}
                        {task.completedByName ? ` by ${task.completedByName}` : ""}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">Pending</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">View</span>
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No tasks yet.</p>
          )}
        </div>
      </section>

      {open && selectedTask ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60">
          <div className="mr-4 mt-4 flex h-[calc(100%-2rem)] w-full max-w-xl flex-col overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Work instruction</p>
                <h2 className="mt-1 text-lg font-semibold">{selectedTask.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Close
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                {selectedTask.description ? (
                  selectedTask.description
                ) : (
                  <p>No specific instructions. Follow standard procedures for this task.</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleTask(selectedTask)}
                  className="rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                >
                  {selectedTask.status === "completed" ? "Mark pending" : "Mark complete"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
