"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";

type DeleteButtonProps = {
  endpoint: string;
  redirectTo: string;
  label: string;
  confirmText?: string;
  className?: string;
};

export default function DeleteButton({
  endpoint,
  redirectTo,
  label,
  confirmText,
  className,
}: DeleteButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useToast();
  const { confirm } = useConfirm();
  const pendingRef = useRef<number | null>(null);

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete item",
      message: confirmText ?? "Are you sure you want to delete this?",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) {
      return;
    }

    setSubmitting(true);
    notify({
      tone: "warning",
      title: "Delete scheduled",
      message: "Deleting in 5 seconds.",
      actionLabel: "Undo",
      onAction: () => {
        if (pendingRef.current) {
          window.clearTimeout(pendingRef.current);
          pendingRef.current = null;
        }
        setSubmitting(false);
        notify({ tone: "info", title: "Undo", message: "Delete canceled." });
      },
    });

    pendingRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(endpoint, { method: "DELETE" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          notify({
            tone: "error",
            title: "Delete failed",
            message: payload.error ?? "Unable to delete. Try again.",
          });
          setSubmitting(false);
          return;
        }
        notify({ tone: "success", title: "Deleted", message: "Item removed successfully." });
        router.push(redirectTo);
        router.refresh();
      } catch (err) {
        notify({ tone: "error", title: "Delete failed", message: "Unable to delete. Try again." });
        setSubmitting(false);
      } finally {
        pendingRef.current = null;
      }
    }, 5000);
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={submitting}
      className={
        className ??
        "inline-flex items-center justify-center rounded-lg border border-rose-400/60 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"
      }
    >
      {submitting ? "Deleting..." : label}
    </button>
  );
}
