"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "neutral" | "danger";
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setPending(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleClose = (value: boolean) => {
    setOpen(false);
    resolver?.(value);
    setResolver(null);
    setPending(null);
  };

  const value = useMemo(() => ({ confirm }), [confirm]);

  const tone = pending?.tone ?? "neutral";
  const confirmLabel = pending?.confirmLabel ?? "Confirm";
  const cancelLabel = pending?.cancelLabel ?? "Cancel";

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {open && pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {pending.title ?? "Please confirm"}
            </p>
            <p className="mt-3 text-sm text-slate-200">{pending.message}</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="rounded-lg border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => handleClose(true)}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                  tone === "danger"
                    ? "border-rose-400/60 text-rose-300 hover:bg-rose-500/10"
                    : "border-emerald-400/60 text-emerald-300 hover:bg-emerald-500/10"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return context;
}
