"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  isDraft?: boolean;
};

type SWIContent = {
  meta: SWIMeta;
  phases: SWIPhase[];
  steps: SWIStep[];
};

type StepListField = "ppe" | "tools" | "parts" | "tests" | "hazards";
type MetaLibraryField = "equipment" | "parts";

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
    isDraft: true,
  },
  phases: [],
  steps: [],
});

const splitCsv = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
const joinCsv = (values: string[]) => Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).join(", ");

const HelpHint = ({ text }: { text: string }) => (
  <span
    title={text}
    aria-label={text}
    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500"
  >
    ?
  </span>
);

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
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(content.phases[0]?.id ?? null);
  const [draggingPhaseId, setDraggingPhaseId] = useState<string | null>(null);
  const [advancedOpenByStep, setAdvancedOpenByStep] = useState<Record<string, boolean>>({});
  const [requirementsOpenByStep, setRequirementsOpenByStep] = useState<Record<string, boolean>>({});
  const [activeRequirementPicker, setActiveRequirementPicker] = useState<{ stepId: string; field: StepListField } | null>(null);
  const [requirementSearch, setRequirementSearch] = useState("");
  const [metaPickerOpen, setMetaPickerOpen] = useState<MetaLibraryField | null>(null);
  const [metaSearch, setMetaSearch] = useState("");
  const hasMountedRef = useRef(false);
  const skipAutosaveRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/work-instructions/library");
      const payload = await response.json().catch(() => ({}));
      setLibrary(Array.isArray(payload.items) ? payload.items : []);
    };
    load();
  }, []);

  useEffect(() => {
    setMetaSearch("");
  }, [metaPickerOpen]);

  useEffect(() => {
    setRequirementSearch("");
  }, [activeRequirementPicker]);

  useEffect(() => {
    if (!content.phases.length) {
      setSelectedPhaseId(null);
      return;
    }
    if (!selectedPhaseId || !content.phases.some((phase) => phase.id === selectedPhaseId)) {
      setSelectedPhaseId(content.phases[0].id);
    }
  }, [content.phases, selectedPhaseId]);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const persistContent = useCallback(async (
    nextContent: SWIContent,
    options?: { showToast?: boolean; showErrorToast?: boolean; refresh?: boolean; updateLocal?: boolean; keepalive?: boolean }
  ) => {
    const { showToast = false, showErrorToast = true, refresh = false, updateLocal = false, keepalive = false } = options ?? {};
    setSaving(true);
    try {
      const response = await fetch(`/api/services/${serviceId}/swi`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextContent),
        keepalive,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (showErrorToast) {
          notify({ tone: "error", title: "Save failed", message: payload.error ?? "Unable to save SWI." });
        }
        return false;
      }
      if (updateLocal) {
        skipAutosaveRef.current = true;
        setContent(nextContent);
      }
      setSavedAt(new Date().toLocaleString());
      if (showToast) {
        notify({ tone: "success", title: "SWI saved", message: "Work instructions updated." });
      }
      if (refresh) {
        router.refresh();
      }
      return true;
    } catch {
      if (showErrorToast) {
        notify({ tone: "error", title: "Save failed", message: "Unable to save SWI." });
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [notify, router, serviceId]);

  const flushDraftNow = useCallback(() => {
    const draftContent: SWIContent = {
      ...contentRef.current,
      meta: { ...contentRef.current.meta, isDraft: true },
    };
    void persistContent(draftContent, { showErrorToast: false, keepalive: true });
  }, [persistContent]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      flushDraftNow();
    }, 700);
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [content, flushDraftNow]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushDraftNow();
      }
    };
    const handlePageHide = () => {
      flushDraftNow();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [flushDraftNow]);

  const save = async () => {
    const nextContent: SWIContent = {
      ...content,
      meta: { ...content.meta, isDraft: false },
    };
    await persistContent(nextContent, { showToast: true, refresh: true, updateLocal: true });
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

  const openLibraryPanel = (type?: LibraryItem["type"]) => {
    if (type) setLibraryType(type);
    setLibraryOpen(true);
  };

  const generateFromAiInstruction = async () => {
    if (!aiInstruction.trim()) {
      notify({ tone: "error", title: "Instruction required", message: "Enter a work instruction first." });
      return;
    }

    setAiGenerating(true);
    try {
      const response = await fetch(`/api/services/${serviceId}/swi/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: aiInstruction.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail =
          typeof payload?.details === "string" && payload.details.trim()
            ? ` ${payload.details.slice(0, 200)}`
            : "";
        notify({
          tone: "error",
          title: "AI generation failed",
          message: `${payload.error ?? "Unable to generate SWI."}${detail}`,
        });
        return;
      }

      if (payload.content) {
        setContent(payload.content);
      }

      if (Array.isArray(payload.createdLibraryItems) && payload.createdLibraryItems.length > 0) {
        const libraryResponse = await fetch("/api/work-instructions/library");
        const libraryPayload = await libraryResponse.json().catch(() => ({}));
        if (libraryResponse.ok && Array.isArray(libraryPayload.items)) {
          setLibrary(libraryPayload.items);
        }
      }

      notify({
        tone: "success",
        title: "SWI draft generated",
        message:
          Array.isArray(payload.createdLibraryItems) && payload.createdLibraryItems.length > 0
            ? `Added ${payload.createdLibraryItems.length} new library item(s).`
            : "Used existing library items where possible.",
      });
    } catch {
      notify({ tone: "error", title: "AI generation failed", message: "Unable to generate SWI." });
    } finally {
      setAiGenerating(false);
    }
  };

  const resetDraft = () => {
    const previousContent = content;
    setContent(emptyContent(serviceName));
    setAiInstruction("");
    setMetaPickerOpen(null);
    setMetaSearch("");
    notify({
      tone: "warning",
      title: "SWI reset",
      message: "Draft cleared.",
      actionLabel: "Undo",
      onAction: () => {
        setContent(previousContent);
        notify({ tone: "info", title: "Undo", message: "Draft restored." });
      },
    });
  };

  const updateMeta = <K extends keyof SWIMeta>(key: K, value: SWIMeta[K]) => {
    setContent((prev) => ({ ...prev, meta: { ...prev.meta, [key]: value } }));
  };

  const addPhase = () => {
    const phase = createPhase();
    setContent((prev) => ({ ...prev, phases: [...prev.phases, phase] }));
    setSelectedPhaseId(phase.id);
  };

  const reorderPhases = (dragPhaseId: string, targetPhaseId: string) => {
    if (dragPhaseId === targetPhaseId) return;
    setContent((prev) => {
      const dragIndex = prev.phases.findIndex((phase) => phase.id === dragPhaseId);
      const targetIndex = prev.phases.findIndex((phase) => phase.id === targetPhaseId);
      if (dragIndex < 0 || targetIndex < 0) return prev;
      const nextPhases = [...prev.phases];
      const [dragged] = nextPhases.splice(dragIndex, 1);
      nextPhases.splice(targetIndex, 0, dragged);
      return { ...prev, phases: nextPhases };
    });
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
    if (selectedPhaseId === phaseId) {
      const fallback = content.phases.find((phase) => phase.id !== phaseId);
      setSelectedPhaseId(fallback?.id ?? null);
    }
  };

  const addStep = (phaseId: string) => {
    const step = createStep(phaseId);
    setContent((prev) => ({ ...prev, steps: [...prev.steps, step] }));
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

  const updateWhatToDoItem = (stepId: string, index: number, value: string) => {
    const current = content.steps.find((step) => step.id === stepId)?.whatToDo ?? [];
    const next = [...current];
    next[index] = value;
    updateStep(stepId, { whatToDo: next });
  };

  const addWhatToDoItem = (stepId: string) => {
    const current = content.steps.find((step) => step.id === stepId)?.whatToDo ?? [];
    const next = [...current, ""];
    updateStep(stepId, { whatToDo: next });
  };

  const removeWhatToDoItem = (stepId: string, index: number) => {
    const current = content.steps.find((step) => step.id === stepId)?.whatToDo ?? [];
    if (current.length <= 1) {
      updateStep(stepId, { whatToDo: [""] });
      return;
    }
    updateStep(
      stepId,
      { whatToDo: current.filter((_item, itemIndex) => itemIndex !== index) }
    );
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
    field: StepListField,
    value: string
  ) => {
    updateStep(stepId, {
      [field]: Array.from(new Set([...(content.steps.find((step) => step.id === stepId)?.[field] ?? []), value])),
    } as Partial<SWIStep>);
  };

  const removeChip = (
    stepId: string,
    field: StepListField,
    value: string
  ) => {
    const current = content.steps.find((step) => step.id === stepId)?.[field] ?? [];
    updateStep(stepId, { [field]: current.filter((item) => item !== value) } as Partial<SWIStep>);
  };

  const getRequirementLibraryItems = (field: StepListField) => {
    if (field === "ppe") return libraryByType.ppe;
    if (field === "tools") return libraryByType.tool;
    if (field === "parts") return libraryByType.part;
    if (field === "tests") return libraryByType.test;
    return libraryByType.hazard;
  };

  const getRequirementLibraryType = (field: StepListField): LibraryItem["type"] => {
    if (field === "tools") return "tool";
    if (field === "parts") return "part";
    if (field === "tests") return "test";
    if (field === "hazards") return "hazard";
    return "ppe";
  };

  const getFilteredRequirementOptions = (step: SWIStep, field: StepListField) => {
    const query = requirementSearch.trim().toLowerCase();
    const existing = new Set(step[field].map((item) => item.toLowerCase()));
    return getRequirementLibraryItems(field)
      .map((item) => item.name)
      .filter((name) => !existing.has(name.toLowerCase()))
      .filter((name) => (query ? name.toLowerCase().includes(query) : true));
  };

  const toggleRequirementsOpen = (stepId: string) => {
    setRequirementsOpenByStep((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
    if (activeRequirementPicker?.stepId === stepId) {
      setActiveRequirementPicker(null);
    }
  };

  const countStepRequirements = (step: SWIStep) =>
    step.ppe.length + step.tools.length + step.parts.length + step.tests.length + step.hazards.length;

  const isRequirementsOpen = (step: SWIStep) => {
    if (Object.prototype.hasOwnProperty.call(requirementsOpenByStep, step.id)) {
      return !!requirementsOpenByStep[step.id];
    }
    return countStepRequirements(step) > 0;
  };

  const equipmentLibraryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          library
            .filter((item) => item.type === "tool" || item.type === "ppe" || item.type === "test")
            .map((item) => item.name)
        )
      ),
    [library]
  );

  const partsLibraryOptions = useMemo(
    () => Array.from(new Set(library.filter((item) => item.type === "part").map((item) => item.name))),
    [library]
  );

  const getMetaItems = (field: MetaLibraryField) => splitCsv(content.meta[field]);

  const setMetaItems = (field: MetaLibraryField, items: string[]) => {
    updateMeta(field, joinCsv(items) as SWIMeta[typeof field]);
  };

  const addMetaItem = (field: MetaLibraryField, value: string) => {
    const cleaned = value.trim();
    if (!cleaned) return;
    setMetaItems(field, [...getMetaItems(field), cleaned]);
    setMetaSearch("");
  };

  const removeMetaItem = (field: MetaLibraryField, value: string) => {
    setMetaItems(
      field,
      getMetaItems(field).filter((item) => item !== value)
    );
  };

  const getFilteredMetaOptions = (field: MetaLibraryField) => {
    const existing = new Set(getMetaItems(field).map((item) => item.toLowerCase()));
    const query = metaSearch.trim().toLowerCase();
    const options = field === "equipment" ? equipmentLibraryOptions : partsLibraryOptions;
    return options.filter((option) => {
      if (existing.has(option.toLowerCase())) return false;
      if (!query) return true;
      return option.toLowerCase().includes(query);
    });
  };

  const selectedPhase = content.phases.find((phase) => phase.id === selectedPhaseId) ?? null;
  const selectedPhaseSteps = selectedPhase
    ? content.steps.filter((step) => step.phaseId === selectedPhase.id)
    : [];

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
                onClick={() => openLibraryPanel()}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Library
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-60 dark:text-emerald-300"
            >
              {saving ? "Saving…" : "Save SWI"}
            </button>
            <button
              type="button"
              onClick={resetDraft}
              className="rounded-lg border border-rose-300/70 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
            >
              Reset SWI
            </button>
            {savedAt ? <p className="text-xs text-slate-500">Saved {savedAt}</p> : null}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">AI SWI Generator</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Enter plain-text work instructions. AI will structure phases and steps, reuse your library, and create
            missing items.
          </p>
          <textarea
            value={aiInstruction}
            onChange={(event) => setAiInstruction(event.target.value)}
            rows={5}
            placeholder="Example: Replace damaged double power point, isolate circuit, verify de-energized, remove existing outlet, inspect cable condition, install new outlet, torque terminals, test polarity and RCD operation, restore supply, label and clean up."
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">This will replace the current unsaved SWI draft on screen.</p>
            <button
              type="button"
              onClick={generateFromAiInstruction}
              disabled={aiGenerating}
              className="rounded-lg border border-blue-400/60 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-500/10 disabled:opacity-60 dark:text-blue-300"
            >
              {aiGenerating ? "Generating…" : "Generate from text"}
            </button>
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
            <div className="relative mt-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap gap-2">
                {getMetaItems("equipment").length === 0 ? (
                  <p className="text-xs text-slate-500">No equipment selected.</p>
                ) : (
                  getMetaItems("equipment").map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => removeMetaItem("equipment", item)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      {item} ✕
                    </button>
                  ))
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setMetaPickerOpen(metaPickerOpen === "equipment" ? null : "equipment")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Add from library
                </button>
                <button
                  type="button"
                  onClick={() => openLibraryPanel("tool")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  New item
                </button>
              </div>
              {metaPickerOpen === "equipment" ? (
                <div className="mt-3 rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                  <input
                    value={metaSearch}
                    onChange={(event) => setMetaSearch(event.target.value)}
                    placeholder="Search equipment library"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  />
                  <div className="mt-2 max-h-32 space-y-1 overflow-auto">
                    {getFilteredMetaOptions("equipment").map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => addMetaItem("equipment", option)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        {option}
                      </button>
                    ))}
                    {getFilteredMetaOptions("equipment").length === 0 ? (
                      <p className="px-2 py-1 text-xs text-slate-500">No matching library items.</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Parts</label>
            <div className="relative mt-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap gap-2">
                {getMetaItems("parts").length === 0 ? (
                  <p className="text-xs text-slate-500">No parts selected.</p>
                ) : (
                  getMetaItems("parts").map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => removeMetaItem("parts", item)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      {item} ✕
                    </button>
                  ))
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setMetaPickerOpen(metaPickerOpen === "parts" ? null : "parts")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Add from library
                </button>
                <button
                  type="button"
                  onClick={() => openLibraryPanel("part")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  New item
                </button>
              </div>
              {metaPickerOpen === "parts" ? (
                <div className="mt-3 rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                  <input
                    value={metaSearch}
                    onChange={(event) => setMetaSearch(event.target.value)}
                    placeholder="Search parts library"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  />
                  <div className="mt-2 max-h-32 space-y-1 overflow-auto">
                    {getFilteredMetaOptions("parts").map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => addMetaItem("parts", option)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        {option}
                      </button>
                    ))}
                    {getFilteredMetaOptions("parts").length === 0 ? (
                      <p className="px-2 py-1 text-xs text-slate-500">No matching library items.</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
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
        <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            {content.phases.length === 0 ? (
              <p className="p-2 text-sm text-slate-500">Add a phase to start building steps.</p>
            ) : (
              <div className="space-y-2">
                {content.phases.map((phase) => {
                  const phaseSteps = content.steps.filter((step) => step.phaseId === phase.id);
                  const isSelected = selectedPhaseId === phase.id;
                  return (
                    <button
                      key={phase.id}
                      type="button"
                      draggable
                      onClick={() => setSelectedPhaseId(phase.id)}
                      onDragStart={() => setDraggingPhaseId(phase.id)}
                      onDragEnd={() => setDraggingPhaseId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggingPhaseId) {
                          reorderPhases(draggingPhaseId, phase.id);
                          setDraggingPhaseId(null);
                        }
                      }}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        isSelected
                          ? "border-emerald-400/70 bg-emerald-500/10"
                          : "border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                      } ${draggingPhaseId === phase.id ? "opacity-60" : ""}`}
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <span className="mr-1 text-slate-400">⋮⋮</span>
                        {phase.title || "Untitled phase"}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">{phaseSteps.length} step{phaseSteps.length === 1 ? "" : "s"}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            {!selectedPhase ? (
              <p className="text-sm text-slate-500">Select a phase to edit details and steps.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Phase title</p>
                      <input
                        value={selectedPhase.title}
                        onChange={(event) => updatePhase(selectedPhase.id, { title: event.target.value })}
                        placeholder="Ex: Preparation and Isolation"
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Phase description</p>
                      <textarea
                        value={selectedPhase.description ?? ""}
                        onChange={(event) => updatePhase(selectedPhase.id, { description: event.target.value })}
                        placeholder="Describe what this phase covers and any key constraints."
                        rows={3}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={!!selectedPhase.locked}
                        onChange={(event) => updatePhase(selectedPhase.id, { locked: event.target.checked })}
                      />
                      Gate phase
                      <HelpHint text="Gate phase means this phase is a checkpoint and should be completed before moving on." />
                    </label>
                    <button
                      type="button"
                      onClick={() => removePhase(selectedPhase.id)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  {selectedPhaseSteps.map((step, stepIndex) => (
                    <div key={step.id}>
                      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Step {stepIndex + 1}
                      </p>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                      <div className="flex items-start justify-between gap-3">
                        <input
                          value={step.title}
                          onChange={(event) => updateStep(step.id, { title: event.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setAdvancedOpenByStep((prev) => ({ ...prev, [step.id]: !prev[step.id] }))
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                          >
                            {advancedOpenByStep[step.id] ? "Hide advanced" : "Advanced"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStep(step.id)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-xs uppercase tracking-[0.3em] text-slate-500">What to do checklist</label>
                          <div className="mt-2 space-y-2">
                            {(step.whatToDo.length ? step.whatToDo : [""]).map((item, index) => (
                              <div
                                key={`${step.id}-todo-${index}`}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-950"
                              >
                                <span className="text-slate-400">•</span>
                                <input
                                  value={item}
                                  onChange={(event) => updateWhatToDoItem(step.id, index, event.target.value)}
                                  placeholder={`Task ${index + 1}`}
                                  className="w-full bg-transparent text-xs text-slate-700 outline-none dark:text-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeWhatToDoItem(step.id, index)}
                                  className="rounded border border-slate-200 px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addWhatToDoItem(step.id)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                            >
                              Add checklist item
                            </button>
                          </div>
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

                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Requirements</p>
                          <button
                            type="button"
                            onClick={() => toggleRequirementsOpen(step.id)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                          >
                            {isRequirementsOpen(step) ? "Hide requirements" : "Add requirements"}
                          </button>
                        </div>

                        {isRequirementsOpen(step) ? (
                          <div className="mt-3 space-y-3">
                            {([
                              ["ppe", "PPE"],
                              ["tools", "Tools"],
                              ["parts", "Parts"],
                              ["tests", "Tests"],
                              ["hazards", "Hazards"],
                            ] as Array<[StepListField, string]>).map(([field, label]) => {
                              const pickerOpen =
                                activeRequirementPicker?.stepId === step.id &&
                                activeRequirementPicker.field === field;
                              const options = getFilteredRequirementOptions(step, field);

                              return (
                                <div key={`${step.id}-${field}`} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{label}</p>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setActiveRequirementPicker((prev) =>
                                            prev?.stepId === step.id && prev.field === field
                                              ? null
                                              : { stepId: step.id, field }
                                          )
                                        }
                                        className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                                      >
                                        Add
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openLibraryPanel(getRequirementLibraryType(field))}
                                        className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                                      >
                                        New
                                      </button>
                                    </div>
                                  </div>

                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {step[field].length === 0 ? (
                                      <p className="text-xs text-slate-500">None added.</p>
                                    ) : (
                                      step[field].map((item) => (
                                        <button
                                          key={item}
                                          type="button"
                                          onClick={() => removeChip(step.id, field, item)}
                                          className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                                        >
                                          {item} ✕
                                        </button>
                                      ))
                                    )}
                                  </div>

                                  {pickerOpen ? (
                                    <div className="mt-2 rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                                      <input
                                        value={requirementSearch}
                                        onChange={(event) => setRequirementSearch(event.target.value)}
                                        placeholder={`Search ${label.toLowerCase()} library`}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                                      />
                                      <div className="mt-2 max-h-28 space-y-1 overflow-auto">
                                        {options.map((option) => (
                                          <button
                                            key={option}
                                            type="button"
                                            onClick={() => {
                                              addFromLibrary(step.id, field, option);
                                              setRequirementSearch("");
                                            }}
                                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                                          >
                                            {option}
                                          </button>
                                        ))}
                                        {options.length === 0 ? (
                                          <p className="px-1 text-xs text-slate-500">No matching library items.</p>
                                        ) : null}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">
                            {countStepRequirements(step)} requirement item{countStepRequirements(step) === 1 ? "" : "s"} added.
                          </p>
                        )}
                      </div>

                      {advancedOpenByStep[step.id] ? (
                        <>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                                <input
                                  type="checkbox"
                                  checked={!!step.photoRequired}
                                  onChange={(event) =>
                                    updateStep(step.id, {
                                      photoRequired: event.target.checked ? step.photoRequired || "Photo evidence required." : "",
                                    })
                                  }
                                />
                                Photo required
                              </label>
                              {step.photoRequired ? (
                                <input
                                  value={step.photoRequired}
                                  onChange={(event) => updateStep(step.id, { photoRequired: event.target.value })}
                                  placeholder="What the photo must show"
                                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                                />
                              ) : null}
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
                              <HelpHint text="Gate step means this step is a critical checkpoint and should not be skipped." />
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
                        </>
                      ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addStep(selectedPhase.id)}
                  className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Add step
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {libraryOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Library</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Reusable items & definitions
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
