"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

type SWIContent = {
  meta: SWIMeta;
  phases: SWIPhase[];
  steps: SWIStep[];
};

type LibraryItem = {
  id: string;
  type: "ppe" | "tool" | "test" | "part" | "hazard" | "step" | "definition";
  name: string;
  usage?: string | null;
  howTo?: string | null;
};

type ServiceSWIBuilderProps = {
  serviceId: string;
  serviceName: string;
  initialContent: SWIContent;
};

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createPhase = (): SWIPhase => ({
  id: createId(),
  title: "New phase",
  description: "",
  locked: false,
});

const createStep = (phaseId: string): SWIStep => ({
  id: createId(),
  phaseId,
  title: "New step",
  whatToDo: [""],
  why: "",
  ppe: [],
  tools: [],
  parts: [],
  tests: [],
  hazards: [],
  photoRequired: "",
  gate: false,
  stopAndThink: false,
  caution: "",
  who: "any",
  notes: "",
});

const emptyContent = (serviceName: string): SWIContent => ({
  meta: {
    jobName: serviceName,
    classification: "",
    standards: "",
    equipment: "",
    parts: "",
    whoCanPerform: "",
  },
  phases: [],
  steps: [],
});

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const joinLines = (lines: string[]) => lines.join("\n");

export default function ServiceSWIBuilder({
  serviceId,
  serviceName,
  initialContent,
}: ServiceSWIBuilderProps) {
  const router = useRouter();
  const { notify } = useToast();
  const [content, setContent] = useState<SWIContent>(
    initialContent?.phases?.length || initialContent?.steps?.length
      ? initialContent
      : emptyContent(serviceName)
  );
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [libraryType, setLibraryType] = useState<LibraryItem["type"]>("ppe");
  const [libraryName, setLibraryName] = useState("");
  const [libraryUsage, setLibraryUsage] = useState("");
  const [libraryHowTo, setLibraryHowTo] = useState("");

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/work-instructions/library");
      const payload = await response.json().catch(() => ({}));
      setLibrary(Array.isArray(payload.items) ? payload.items : []);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/services/${serviceId}/swi`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify({ tone: "error", title: "Save failed", message: payload.error ?? "Unable to save SWI." });
        return;
      }
      setSavedAt(new Date().toLocaleString());
      notify({ tone: "success", title: "SWI saved", message: "Work instructions updated." });
      router.refresh();
    } catch (err) {
      notify({ tone: "error", title: "Save failed", message: "Unable to save SWI." });
    } finally {
      setSaving(false);
    }
  };

  const addLibraryItem = async () => {
    if (!libraryName.trim()) return;
    const response = await fetch("/api/work-instructions/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: libraryType,
        name: libraryName.trim(),
        usage: libraryUsage.trim() || null,
        howTo: libraryHowTo.trim() || null,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      notify({ tone: "error", title: "Save failed", message: payload.error ?? "Unable to add item." });
      return;
    }
    setLibrary((prev) => [payload.item, ...prev]);
    setLibraryName("");
    setLibraryUsage("");
    setLibraryHowTo("");
  };

  const deleteLibraryItem = async (id: string) => {
    const response = await fetch(`/api/work-instructions/library/${id}`, { method: "DELETE" });
    if (!response.ok) {
      notify({ tone: "error", title: "Delete failed", message: "Unable to delete item." });
      return;
    }
    setLibrary((prev) => prev.filter((item) => item.id !== id));
  };

  const updateMeta = <K extends keyof SWIMeta>(key: K, value: SWIMeta[K]) => {
    setContent((prev) => ({ ...prev, meta: { ...prev.meta, [key]: value } }));
  };

  const addPhase = () => {
    setContent((prev) => ({ ...prev, phases: [...prev.phases, createPhase()] }));
  };

  const updatePhase = (phaseId: string, update: Partial<SWIPhase>) => {
    setContent((prev) => ({
      ...prev,
      phases: prev.phases.map((phase) => (phase.id === phaseId ? { ...phase, ...update } : phase)),
    }));
  };

  const removePhase = (phaseId: string) => {
    setContent((prev) => ({
      ...prev,
      phases: prev.phases.filter((phase) => phase.id !== phaseId),
      steps: prev.steps.filter((step) => step.phaseId !== phaseId),
    }));
  };

  const addStep = (phaseId: string) => {
    setContent((prev) => ({ ...prev, steps: [...prev.steps, createStep(phaseId)] }));
  };

  const updateStep = (stepId: string, update: Partial<SWIStep>) => {
    setContent((prev) => ({
      ...prev,
      steps: prev.steps.map((step) => (step.id === stepId ? { ...step, ...update } : step)),
    }));
  };

  const removeStep = (stepId: string) => {
    setContent((prev) => ({
      ...prev,
      steps: prev.steps.filter((step) => step.id !== stepId),
    }));
  };

  const libraryByType = useMemo(() => {
    return library.reduce<Record<LibraryItem["type"], LibraryItem[]>>(
      (acc, item) => {
        acc[item.type] = [...(acc[item.type] ?? []), item];
        return acc;
      },
      { ppe: [], tool: [], test: [], part: [], hazard: [], step: [], definition: [] }
    );
  }, [library]);

  const addFromLibrary = (
    stepId: string,
    field: "ppe" | "tools" | "parts" | "tests" | "hazards",
    value: string
  ) => {
    updateStep(stepId, {
      [field]: Array.from(new Set([...(content.steps.find((step) => step.id === stepId)?.[field] ?? []), value])),
    } as Partial<SWIStep>);
  };

  const removeChip = (
    stepId: string,
    field: "ppe" | "tools" | "parts" | "tests" | "hazards",
    value: string
  ) => {
    const current = content.steps.find((step) => step.id === stepId)?.[field] ?? [];
    updateStep(stepId, { [field]: current.filter((item) => item !== value) } as Partial<SWIStep>);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">SWI Builder</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {serviceName}
            </h2>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-60 dark:text-emerald-300"
            >
              {saving ? "Saving…" : "Save SWI"}
            </button>
            {savedAt ? <p className="text-xs text-slate-500">Saved {savedAt}</p> : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Job name</label>
            <input
              value={content.meta.jobName}
              onChange={(event) => updateMeta("jobName", event.target.value)}
              placeholder="Switchboard replacement"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Work classification</label>
            <input
              value={content.meta.classification}
              onChange={(event) => updateMeta("classification", event.target.value)}
              placeholder="Electrical installation work"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Applicable standards</label>
            <input
              value={content.meta.standards}
              onChange={(event) => updateMeta("standards", event.target.value)}
              placeholder="AS/NZS 3000, AS/NZS 3017"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Who can perform</label>
            <select
              value={content.meta.whoCanPerform}
              onChange={(event) =>
                updateMeta("whoCanPerform", event.target.value as SWIMeta["whoCanPerform"])
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="">Select requirement</option>
              <option value="licensed">Licensed only</option>
              <option value="apprentice">Apprentice allowed</option>
              <option value="apprentice-supervised">Apprentice with supervision</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Equipment</label>
            <input
              value={content.meta.equipment}
              onChange={(event) => updateMeta("equipment", event.target.value)}
              placeholder="Multimeter, insulated tools, ladder"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Parts</label>
            <input
              value={content.meta.parts}
              onChange={(event) => updateMeta("parts", event.target.value)}
              placeholder="RCBOs, cable, clips"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Phases</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Job phases</h3>
          </div>
          <button
            type="button"
            onClick={addPhase}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Add phase
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {content.phases.length === 0 ? (
            <p className="text-sm text-slate-500">Add a phase to start building steps.</p>
          ) : null}
          {content.phases.map((phase) => {
            const steps = content.steps.filter((step) => step.phaseId === phase.id);
            return (
              <div key={phase.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
                    <input
                      value={phase.title}
                      onChange={(event) => updatePhase(phase.id, { title: event.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <input
                      value={phase.description ?? ""}
                      onChange={(event) => updatePhase(phase.id, { description: event.target.value })}
                      placeholder="Phase description"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={!!phase.locked}
                        onChange={(event) => updatePhase(phase.id, { locked: event.target.checked })}
                      />
                      Gate phase
                    </label>
                    <button
                      type="button"
                      onClick={() => removePhase(phase.id)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <input
                          value={step.title}
                          onChange={(event) => updateStep(step.id, { title: event.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => removeStep(step.id)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-xs uppercase tracking-[0.3em] text-slate-500">What to do</label>
                          <textarea
                            value={joinLines(step.whatToDo)}
                            onChange={(event) => updateStep(step.id, { whatToDo: splitLines(event.target.value) })}
                            rows={4}
                            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Why this matters</label>
                          <textarea
                            value={step.why}
                            onChange={(event) => updateStep(step.id, { why: event.target.value })}
                            rows={4}
                            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {([
                          ["ppe", "PPE", libraryByType.ppe],
                          ["tools", "Tools", libraryByType.tool],
                          ["parts", "Parts", libraryByType.part],
                          ["tests", "Tests", libraryByType.test],
                          ["hazards", "Hazards", libraryByType.hazard],
                        ] as Array<[SWIStep["ppe" | "tools" | "parts" | "tests" | "hazards"], string, LibraryItem[]]>).map(
                          ([field, label, items]) => (
                            <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                              <div className="flex items-center justify-between">
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</p>
                                <select
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    if (!value) return;
                                    addFromLibrary(step.id, field as any, value);
                                    event.target.value = "";
                                  }}
                                >
                                  <option value="">Add from library</option>
                                  {items.map((item) => (
                                    <option key={item.id} value={item.name}>
                                      {item.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(step[field as keyof SWIStep] as string[]).map((item) => (
                                  <button
                                    key={item}
                                    type="button"
                                    onClick={() => removeChip(step.id, field as any, item)}
                                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                                  >
                                    {item} ✕
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Photo required</label>
                          <input
                            value={step.photoRequired}
                            onChange={(event) => updateStep(step.id, { photoRequired: event.target.value })}
                            placeholder="Photo must show lockout tag applied"
                            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Notes</label>
                          <input
                            value={step.notes}
                            onChange={(event) => updateStep(step.id, { notes: event.target.value })}
                            placeholder="Extra guidance"
                            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={step.gate}
                            onChange={(event) => updateStep(step.id, { gate: event.target.checked })}
                          />
                          Gate step
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={step.stopAndThink}
                            onChange={(event) => updateStep(step.id, { stopAndThink: event.target.checked })}
                          />
                          Stop & think
                        </label>
                        <select
                          value={step.who}
                          onChange={(event) => updateStep(step.id, { who: event.target.value as SWIStep["who"] })}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                        >
                          <option value="any">Anyone</option>
                          <option value="licensed">Licensed only</option>
                          <option value="apprentice">Apprentice allowed</option>
                          <option value="apprentice-supervised">Apprentice supervised</option>
                        </select>
                      </div>

                      {step.stopAndThink ? (
                        <div className="mt-3">
                          <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Caution / stop & think</label>
                          <input
                            value={step.caution}
                            onChange={(event) => updateStep(step.id, { caution: event.target.value })}
                            placeholder="Pause and confirm isolation is complete."
                            className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-100"
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addStep(phase.id)}
                  className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Add step
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Library</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Reusable items & definitions
            </h3>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Add item</label>
            <select
              value={libraryType}
              onChange={(event) => setLibraryType(event.target.value as LibraryItem["type"])}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="ppe">PPE</option>
              <option value="tool">Tool</option>
              <option value="part">Part</option>
              <option value="test">Test</option>
              <option value="hazard">Hazard</option>
              <option value="definition">Definition</option>
            </select>
            <input
              value={libraryName}
              onChange={(event) => setLibraryName(event.target.value)}
              placeholder="Name"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
            <input
              value={libraryUsage}
              onChange={(event) => setLibraryUsage(event.target.value)}
              placeholder="Usage / notes"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
            <textarea
              value={libraryHowTo}
              onChange={(event) => setLibraryHowTo(event.target.value)}
              placeholder="How to / definition"
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
            <button
              type="button"
              onClick={addLibraryItem}
              className="mt-3 rounded-lg border border-emerald-400/60 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
            >
              Add to library
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Library items</label>
            <div className="mt-2 max-h-[320px] space-y-2 overflow-auto pr-2">
              {library.length === 0 ? (
                <p className="text-xs text-slate-500">No library items yet.</p>
              ) : (
                library.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-[10px] uppercase text-slate-400">{item.type}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteLibraryItem(item.id)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                      >
                        Delete
                      </button>
                    </div>
                    {item.usage ? <p className="mt-2 text-[11px] text-slate-500">{item.usage}</p> : null}
                    {item.howTo ? <p className="mt-1 text-[11px] text-slate-500">{item.howTo}</p> : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
