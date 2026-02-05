"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ToastProvider";

type TemplateBlock = {
  id: string;
  type: string;
  label: string;
};

type TemplateEditorProps = {
  initialName: string;
  initialBlocks: TemplateBlock[];
};

const BLOCK_LIBRARY: TemplateBlock[] = [
  { id: "header", type: "header", label: "Header" },
  { id: "customer", type: "customer", label: "Customer details" },
  { id: "items", type: "items", label: "Line items" },
  { id: "totals", type: "totals", label: "Totals" },
  { id: "notes", type: "notes", label: "Notes" },
  { id: "footer", type: "footer", label: "Footer" },
];

const createBlockId = (type: string) =>
  `${type}-${Math.random().toString(36).slice(2, 8)}`;

export default function TemplateEditor({ initialName, initialBlocks }: TemplateEditorProps) {
  const [name, setName] = useState(initialName);
  const [blocks, setBlocks] = useState<TemplateBlock[]>(initialBlocks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { notify } = useToast();

  const availableBlocks = useMemo(() => BLOCK_LIBRARY, []);

  const handleAddBlock = (type: string) => {
    const block = availableBlocks.find((entry) => entry.type === type);
    if (!block) return;
    setBlocks((prev) => [...prev, { ...block, id: createBlockId(block.type) }]);
  };

  const handleRemoveBlock = (id: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
  };

  const moveBlock = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setBlocks((prev) => {
      const fromIndex = prev.findIndex((block) => block.id === fromId);
      const toIndex = prev.findIndex((block) => block.id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/quotes/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, blocks }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify({
          tone: "error",
          title: "Save failed",
          message: payload.error ?? "Unable to save template.",
        });
        return;
      }
      notify({ tone: "success", title: "Template saved", message: "Template updated." });
    } catch (err) {
      notify({ tone: "error", title: "Save failed", message: "Unable to save template." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Template name</p>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Default template"
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save template"}
          </button>
        </div>
        <div className="mt-6 space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Template blocks</p>
          {blocks.length ? (
            <div className="space-y-3">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => setDragId(block.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragId) moveBlock(dragId, block.id);
                    setDragId(null);
                  }}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">⋮⋮</span>
                    <div>
                      <p className="font-semibold text-slate-100">{block.label}</p>
                      <p className="text-xs text-slate-500">{block.type}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBlock(block.id)}
                    className="text-xs text-rose-300 hover:text-rose-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Add blocks to start building the template.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Block library</p>
        <div className="mt-4 grid gap-3">
          {availableBlocks.map((block) => (
            <button
              key={block.type}
              type="button"
              onClick={() => handleAddBlock(block.type)}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-900"
            >
              <span className="font-semibold text-slate-100">{block.label}</span>
              <span className="text-xs text-slate-500">Add</span>
            </button>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-400">
          Drag blocks in the left column to reorder. This layout controls the PDF output.
        </div>
      </div>
    </div>
  );
}
