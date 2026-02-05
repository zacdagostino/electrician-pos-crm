"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";

type RevertQuoteButtonProps = {
  quoteId: string;
  historyId: string;
};

export default function RevertQuoteButton({ quoteId, historyId }: RevertQuoteButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useToast();
  const { confirm } = useConfirm();

  const handleRevert = async () => {
    const ok = await confirm({
      title: "Revert quote",
      message: "Revert this quote to the selected version?",
      confirmLabel: "Revert",
      tone: "danger",
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyId }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify({
          tone: "error",
          title: "Revert failed",
          message: payload.error ?? "Unable to revert quote.",
        });
        return;
      }

      notify({ tone: "success", title: "Quote reverted", message: "Quote reverted successfully." });
      router.refresh();
    } catch (err) {
      notify({ tone: "error", title: "Revert failed", message: "Unable to revert quote." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRevert}
      disabled={submitting}
      className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-900 disabled:opacity-60"
    >
      {submitting ? "Reverting..." : "Revert"}
    </button>
  );
}
