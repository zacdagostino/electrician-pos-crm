"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ToastProvider";

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
};

type SWIRunContent = {
  meta: SWIMeta;
  phases: SWIPhase[];
  steps: SWIStep[];
  progress: Record<
    string,
    {
      completed: boolean;
      photo?: string;
      testResult?: string;
      notes?: string;
    }
  >;
  templateId?: string;
  templateName?: string;
};

type LibraryItem = {
  id: string;
  type: "definition";
  name: string;
  howTo?: string | null;
};

type JobSWIRunProps = {
  jobId: string;
  existing: SWIRunContent | null;
  serviceOptions: Array<{ id: string; name: string }>;
};

const highlightText = (text: string, definitions: LibraryItem[]) => {
  if (!definitions.length || !text) return text;
  let nodes: Array<string | JSX.Element> = [text];
  const sorted = [...definitions].sort((a, b) => b.name.length - a.name.length);
  sorted.forEach((def) => {
    const regex = new RegExp(`\\b(${def.name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")})\\b`, "gi");
    nodes = nodes.flatMap((node) => {
      if (typeof node !== "string") return [node];
      const parts = node.split(regex);
      return parts.map((part, idx) => {
        if (regex.test(part)) {
          return (
            <span
              key={`${def.id}-${idx}-${part}`}
              title={def.howTo ?? ""}
              className="cursor-help rounded bg-amber-100 px-1 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100"
            >
              {part}
            </span>
          );
        }
        return part;
      });
    });
  });
  return nodes;
};

export default function JobSWIRun({ jobId, existing, serviceOptions }: JobSWIRunProps) {
  const { notify } = useToast();
  const [run, setRun] = useState<SWIRunContent | null>(existing);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [selectedService, setSelectedService] = useState(serviceOptions[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [definitions, setDefinitions] = useState<LibraryItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/work-instructions/library");
      const payload = await response.json().catch(() => ({}));
      const items = Array.isArray(payload.items) ? payload.items : [];
      setDefinitions(items.filter((item: any) => item.type === "definition"));
    };
    load();
  }, []);

  const saveRun = async (nextRun: SWIRunContent) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/swi`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextRun),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify({ tone: "error", title: "Save failed", message: payload.error ?? "Unable to save SWI." });
        return;
      }
      setRun(nextRun);
      notify({ tone: "success", title: "SWI saved", message: "Progress updated." });
    } catch (err) {
      notify({ tone: "error", title: "Save failed", message: "Unable to save SWI." });
    } finally {
      setSaving(false);
    }
  };

  const startFromTemplate = async () => {
    if (!selectedService) return;
    setLoadingTemplate(true);
    try {
      const response = await fetch(`/api/services/${selectedService}/swi`);
      const payload = await response.json().catch(() => ({}));
      const content = payload?.swi?.content;
      if (!content) {
        notify({ tone: "error", title: "No template", message: "This service has no SWI yet." });
        return;
      }
      const newRun: SWIRunContent = {
        meta: content.meta,
        phases: content.phases ?? [],
        steps: content.steps ?? [],
        progress: {},
        templateId: selectedService,
        templateName: serviceOptions.find((service) => service.id === selectedService)?.name,
      };
      await saveRun(newRun);
    } finally {
      setLoadingTemplate(false);
    }
  };

  const grouped = useMemo(() => {
    if (!run) return [];
    return run.phases.map((phase) => ({
      phase,
      steps: run.steps.filter((step) => step.phaseId === phase.id),
    }));
  }, [run]);

  const updateProgress = (stepId: string, update: Partial<SWIRunContent["progress"][string]>) => {
    if (!run) return;
    const current = run.progress[stepId] ?? { completed: false };
    const nextRun: SWIRunContent = {
      ...run,
      progress: { ...run.progress, [stepId]: { ...current, ...update } },
    };
    saveRun(nextRun);
  };

  if (!run) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Start SWI</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Load from a service template
        </h3>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={selectedService}
            onChange={(event) => setSelectedService(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            {serviceOptions.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={startFromTemplate}
            disabled={!selectedService || loadingTemplate}
            className="rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-60 dark:text-emerald-300"
          >
            {loadingTemplate ? "Loading..." : "Load SWI"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Work instructions</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {run.meta?.jobName || run.templateName || "SWI"}
            </h2>
            {run.meta?.classification ? <p className="text-sm text-slate-500">{run.meta.classification}</p> : null}
            {run.meta?.standards ? <p className="text-xs text-slate-500">{run.meta.standards}</p> : null}
          </div>
          <div className="text-xs text-slate-500">{saving ? "Saving..." : " "}</div>
        </div>
      </section>

      {grouped.map(({ phase, steps }) => (
        <section
          key={phase.id}
          className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{phase.title}</p>
            {phase.description ? <p className="mt-1 text-sm text-slate-500">{phase.description}</p> : null}
          </div>
          <div className="mt-4 space-y-4">
            {steps.map((step, index) => {
              const progress = run.progress[step.id] ?? { completed: false };
              const requiresPhoto = !!step.photoRequired;
              const requiresTest = step.tests.length > 0;
              const canComplete =
                (!requiresPhoto || !!progress.photo) &&
                (!requiresTest || !!progress.testResult) &&
                (!step.gate || true);

              return (
                <div
                  key={step.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Step {index + 1}: {step.title}
                      </p>
                      {step.who !== "any" ? (
                        <p className="text-xs text-slate-500">Who: {step.who.replace("-", " ")}</p>
                      ) : null}
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={!!progress.completed}
                        onChange={(event) =>
                          updateProgress(step.id, { completed: event.target.checked })
                        }
                        disabled={!canComplete}
                      />
                      Complete
                    </label>
                  </div>

                  <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {step.whatToDo.length ? (
                      <ul className="list-disc space-y-1 pl-4">
                        {step.whatToDo.map((line, idx) => (
                          <li key={idx}>{highlightText(line, definitions)}</li>
                        ))}
                      </ul>
                    ) : null}
                    {step.why ? <p className="text-slate-500">{highlightText(step.why, definitions)}</p> : null}
                  </div>

                  {step.stopAndThink ? (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-100">
                      <strong>Stop & think:</strong> {step.caution || "Pause before proceeding."}
                    </div>
                  ) : null}

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {step.ppe.length ? (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">PPE</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{step.ppe.join(", ")}</p>
                      </div>
                    ) : null}
                    {step.tools.length ? (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Tools</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{step.tools.join(", ")}</p>
                      </div>
                    ) : null}
                    {step.parts.length ? (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Parts</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{step.parts.join(", ")}</p>
                      </div>
                    ) : null}
                    {step.tests.length ? (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Tests</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{step.tests.join(", ")}</p>
                      </div>
                    ) : null}
                    {step.hazards.length ? (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Hazards</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{step.hazards.join(", ")}</p>
                      </div>
                    ) : null}
                  </div>

                  {step.photoRequired ? (
                    <div className="mt-3">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Photo required</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{step.photoRequired}</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            updateProgress(step.id, { photo: String(reader.result) });
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="mt-2 text-xs text-slate-500"
                      />
                    </div>
                  ) : null}

                  {step.tests.length ? (
                    <div className="mt-3">
                      <label className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                        Test result
                      </label>
                      <input
                        value={progress.testResult ?? ""}
                        onChange={(event) => updateProgress(step.id, { testResult: event.target.value })}
                        placeholder="Enter result"
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      />
                    </div>
                  ) : null}

                  {!canComplete ? (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                      Complete required photo/test to finish this step.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
