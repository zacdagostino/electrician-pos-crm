"use client";

import { useToast } from "@/components/ToastProvider";

type CopyableFieldProps = {
  label: string;
  value?: string | null;
  icon: React.ReactNode;
};

export default function CopyableField({ label, value, icon }: CopyableFieldProps) {
  const { notify } = useToast();

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      notify({ tone: "success", title: "Copied", message: `${label} copied.` });
    } catch (err) {
      notify({ tone: "error", title: "Copy failed", message: "Unable to copy." });
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100">
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-500">
            {label}
          </p>
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {value || "—"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!value}
        className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
        aria-label={`Copy ${label}`}
        title={`Copy ${label}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
    </div>
  );
}
