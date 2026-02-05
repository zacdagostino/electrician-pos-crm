"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastTone = "success" | "error" | "info" | "warning";

type ToastItem = {
  id: string;
  tone: ToastTone;
  title?: string;
  message: string;
  duration: number;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastOptions = {
  tone?: ToastTone;
  title?: string;
  message: string;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastContextValue = {
  notify: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { border: string; bg: string; text: string; title: string }> = {
  success: {
    border: "border-emerald-400/50",
    bg: "bg-emerald-500/10",
    text: "text-emerald-100",
    title: "text-emerald-200",
  },
  error: {
    border: "border-rose-400/60",
    bg: "bg-rose-500/10",
    text: "text-rose-200",
    title: "text-rose-300",
  },
  info: {
    border: "border-sky-400/50",
    bg: "bg-sky-500/10",
    text: "text-sky-200",
    title: "text-sky-200",
  },
  warning: {
    border: "border-amber-400/40",
    bg: "bg-amber-500/10",
    text: "text-amber-100",
    title: "text-amber-200",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Record<string, number>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    if (timeoutsRef.current[id]) {
      window.clearTimeout(timeoutsRef.current[id]);
      delete timeoutsRef.current[id];
    }
  }, []);

  const notify = useCallback(
    ({ tone = "info", title, message, duration = 4500, actionLabel, onAction }: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [
        { id, tone, title, message, duration, actionLabel, onAction },
        ...prev,
      ]);
      timeoutsRef.current[id] = window.setTimeout(() => removeToast(id), duration);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-6 z-50 w-[min(92vw,420px)] -translate-x-1/2 space-y-3">
        {toasts.map((toast) => {
          const styles = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto rounded-2xl border ${styles.border} ${styles.bg} px-4 py-3 shadow-lg backdrop-blur`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  {toast.title ? (
                    <p className={`text-xs uppercase tracking-[0.3em] ${styles.title}`}>
                      {toast.title}
                    </p>
                  ) : null}
                  <p className={`mt-1 text-sm ${styles.text}`}>{toast.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  {toast.actionLabel && toast.onAction ? (
                    <button
                      type="button"
                      onClick={() => {
                        toast.onAction?.();
                        removeToast(toast.id);
                      }}
                      className="rounded-full border border-slate-800/60 px-2 py-0.5 text-[10px] font-semibold text-slate-200"
                    >
                      {toast.actionLabel}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeToast(toast.id)}
                    className="rounded-full border border-slate-800/60 px-2 py-0.5 text-[10px] font-semibold text-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
