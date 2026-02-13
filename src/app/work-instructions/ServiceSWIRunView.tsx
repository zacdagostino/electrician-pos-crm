"use client";

import { useEffect, useMemo, useState } from "react";

type SWIPhase = {
  id: string;
  title: string;
  description?: string;
  locked?: boolean;
};

type SWIStep = {
  id: string;
  phaseId: string;
  title: string;
  whatToDo: string[];
  why: string;
  ppe: string[];
  tools: string[];
  parts: string[];
  tests: string[];
  hazards: string[];
  photoRequired: string;
  gate: boolean;
  stopAndThink: boolean;
  caution: string;
  who: "licensed" | "apprentice" | "apprentice-supervised" | "any";
  notes: string;
};

type SWIMeta = {
  jobName: string;
  classification: string;
  standards: string;
  equipment: string;
  parts: string;
  whoCanPerform: "licensed" | "apprentice" | "apprentice-supervised" | "";
  isDraft?: boolean;
};

type SWIContent = {
  meta: SWIMeta;
  phases: SWIPhase[];
  steps: SWIStep[];
};

type StepProgress = {
  checklist: boolean[];
  photoCaptured: boolean;
  photoName?: string;
  photoException?: boolean;
  photoExceptionReason?: string;
  testResult: string;
};

type ServiceSWIRunViewProps = {
  serviceId: string;
  serviceName: string;
  content: SWIContent;
};

const progressKey = (serviceId: string) => `swi-run-progress:${serviceId}`;

export default function ServiceSWIRunView({ serviceId, serviceName, content }: ServiceSWIRunViewProps) {
  const [expandedCompleted, setExpandedCompleted] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, StepProgress>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(progressKey(serviceId));
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, StepProgress>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(progressKey(serviceId), JSON.stringify(progress));
    } catch {
      // storage can fail in private mode
    }
  }, [progress, serviceId]);

  const grouped = useMemo(
    () =>
      content.phases.map((phase) => ({
        phase,
        steps: content.steps.filter((step) => step.phaseId === phase.id),
      })),
    [content.phases, content.steps]
  );

  const totalSteps = content.steps.length;
  const getStepProgress = (stepId: string): StepProgress => ({
    checklist: [],
    photoCaptured: false,
    photoName: "",
    photoException: false,
    photoExceptionReason: "",
    testResult: "",
    ...progress[stepId],
  });
  function isStepReady(step: SWIStep, state: StepProgress) {
    const checklistLines = step.whatToDo.filter((line) => line.trim().length > 0);
    const checklistComplete =
      checklistLines.length === 0 || checklistLines.every((_line, index) => !!state.checklist[index]);
    const photoComplete =
      !step.photoRequired || state.photoCaptured || (!!state.photoException && !!state.photoExceptionReason?.trim());
    const testsComplete = step.tests.length === 0 || !!state.testResult.trim();
    return checklistComplete && photoComplete && testsComplete;
  }

  const completedSteps = content.steps.filter((step) => isStepReady(step, getStepProgress(step.id))).length;

  const updateStepProgress = (stepId: string, update: Partial<StepProgress>) => {
    setProgress((prev) => {
      const existing = prev[stepId] ?? {
        checklist: [],
        photoCaptured: false,
        photoName: "",
        photoException: false,
        photoExceptionReason: "",
        testResult: "",
      };
      return { ...prev, [stepId]: { ...existing, ...update } };
    });
  };

  const handlePhotoSelected = (stepId: string, file: File | null) => {
    if (!file) return;
    updateStepProgress(stepId, {
      photoCaptured: true,
      photoName: file.name,
      photoException: false,
      photoExceptionReason: "",
    });
  };

  const clearProgress = () => {
    setProgress({});
    try {
      window.localStorage.removeItem(progressKey(serviceId));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">SWI Run</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {content.meta.jobName || serviceName}
            </h2>
            {content.meta.classification ? <p className="text-sm text-slate-500">{content.meta.classification}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Progress</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {completedSteps}/{totalSteps || 0}
            </p>
            <button
              type="button"
              onClick={clearProgress}
              className="mt-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Reset checks
            </button>
          </div>
        </div>
      </section>

      {grouped.map(({ phase, steps }) => (
        <section
          key={phase.id}
          className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{phase.title}</p>
          {phase.description ? <p className="mt-1 text-sm text-slate-500">{phase.description}</p> : null}

          <div className="mt-4 space-y-4">
            {steps.map((step, stepIndex) => {
              const stepState = getStepProgress(step.id);
              const ready = isStepReady(step, stepState);
              const collapsed = ready && !expandedCompleted[step.id];

              return (
                <div
                  key={step.id}
                  className={`rounded-xl border p-4 ${ready
                    ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-700/40 dark:bg-emerald-950/20"
                    : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60"
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Step {stepIndex + 1}: {step.title}
                      </p>
                      {ready ? (
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                          Completed
                        </p>
                      ) : step.why ? (
                        <p className="mt-1 text-xs text-slate-500">{step.why}</p>
                      ) : null}
                    </div>
                    {ready ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCompleted((prev) => ({
                            ...prev,
                            [step.id]: !prev[step.id],
                          }))
                        }
                        className="rounded-md border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                      >
                        {collapsed ? "View details" : "Collapse"}
                      </button>
                    ) : null}
                  </div>

                  {collapsed ? null : (
                    <>
                  {step.whatToDo.length ? (
                    <div className="mt-3 space-y-2">
                      {step.whatToDo.map((item, idx) => (
                        <label
                          key={`${step.id}-item-${idx}`}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                        >
                          <input
                            type="checkbox"
                            checked={!!stepState.checklist[idx]}
                            onChange={(event) => {
                              const next = [...stepState.checklist];
                              next[idx] = event.target.checked;
                              updateStepProgress(step.id, { checklist: next });
                            }}
                          />
                          <span className="text-slate-700 dark:text-slate-200">{item}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}

                  {(step.ppe.length || step.tools.length || step.parts.length || step.tests.length || step.hazards.length) ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {step.ppe.length ? <p className="text-xs text-slate-600 dark:text-slate-300"><strong>PPE:</strong> {step.ppe.join(", ")}</p> : null}
                      {step.tools.length ? <p className="text-xs text-slate-600 dark:text-slate-300"><strong>Tools:</strong> {step.tools.join(", ")}</p> : null}
                      {step.parts.length ? <p className="text-xs text-slate-600 dark:text-slate-300"><strong>Parts:</strong> {step.parts.join(", ")}</p> : null}
                      {step.tests.length ? <p className="text-xs text-slate-600 dark:text-slate-300"><strong>Tests:</strong> {step.tests.join(", ")}</p> : null}
                      {step.hazards.length ? <p className="text-xs text-slate-600 dark:text-slate-300"><strong>Hazards:</strong> {step.hazards.join(", ")}</p> : null}
                    </div>
                  ) : null}

                  {step.photoRequired ? (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Photo required</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{step.photoRequired}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                          Take photo
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="sr-only"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              handlePhotoSelected(step.id, file);
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                        <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                          Import photo
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              handlePhotoSelected(step.id, file);
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                        {stepState.photoCaptured ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateStepProgress(step.id, {
                                photoCaptured: false,
                                photoName: "",
                              })
                            }
                            className="inline-flex items-center rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-500/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                          >
                            Remove photo
                          </button>
                        ) : null}
                        {!stepState.photoCaptured && !stepState.photoException ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateStepProgress(step.id, {
                                photoException: true,
                                photoExceptionReason: "",
                              })
                            }
                            className="inline-flex items-center rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-500/60 dark:text-amber-300 dark:hover:bg-amber-950/30"
                          >
                            Couldn&apos;t take photo
                          </button>
                        ) : null}
                        {stepState.photoException ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateStepProgress(step.id, {
                                photoException: false,
                                photoExceptionReason: "",
                              })
                            }
                            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                          >
                            Cancel reason
                          </button>
                        ) : null}
                      </div>
                      {stepState.photoException ? (
                        <div className="mt-3">
                          <label className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Reason</label>
                          <textarea
                            value={stepState.photoExceptionReason || ""}
                            onChange={(event) =>
                              updateStepProgress(step.id, { photoExceptionReason: event.target.value })
                            }
                            placeholder="Why couldn't a photo be taken?"
                            rows={2}
                            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                          />
                        </div>
                      ) : null}
                      <p className="mt-2 text-xs text-slate-500">
                        {stepState.photoCaptured
                          ? `Attached: ${stepState.photoName || "Photo attached"}`
                          : stepState.photoException
                            ? "Photo exception in use. Reason required."
                            : "No photo attached yet."}
                      </p>
                    </div>
                  ) : null}

                  {step.tests.length ? (
                    <div className="mt-3">
                      <label className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Test result</label>
                      <input
                        value={stepState.testResult}
                        onChange={(event) => updateStepProgress(step.id, { testResult: event.target.value })}
                        placeholder="Enter test result"
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      />
                    </div>
                  ) : null}

                  {!ready ? (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                      Complete checklist/photo/test to mark this step complete.
                    </p>
                  ) : null}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
