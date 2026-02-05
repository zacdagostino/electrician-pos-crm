"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SelectMenu from "@/components/SelectMenu";
import { useToast } from "@/components/ToastProvider";

const STATUS_OPTIONS = ["pending", "sent", "accepted", "declined", "draft"] as const;

const formatStatusLabel = (status: string) =>
  status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const statusStyles: Record<string, string> = {
  pending: "border-amber-400/50 text-amber-200",
  sent: "border-sky-400/50 text-sky-200",
  accepted: "border-emerald-400/60 text-emerald-200",
  declined: "border-rose-400/60 text-rose-200",
  draft: "border-slate-500/60 text-slate-300",
};

const statusDot: Record<string, string> = {
  pending: "bg-amber-400",
  sent: "bg-sky-400",
  accepted: "bg-emerald-400",
  declined: "bg-rose-400",
  draft: "bg-slate-500",
};

type QuoteActionsProps = {
  quoteId: string;
  status: string;
};

export default function QuoteActions({
  quoteId,
  status: initialStatus,
}: QuoteActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const { notify } = useToast();

  const handleStatusChange = async (next: string) => {
    if (next === status) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify({
          tone: "error",
          title: "Update failed",
          message: payload.error ?? "Unable to update status.",
        });
        return;
      }
      setStatus(next);
      notify({ tone: "success", title: "Status updated", message: "Quote status updated." });
      router.refresh();
    } catch (err) {
      notify({ tone: "error", title: "Update failed", message: "Unable to update status." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <SelectMenu
        value={status}
        onChange={(value) => void handleStatusChange(value)}
        options={STATUS_OPTIONS.map((option) => ({
          value: option,
          label: formatStatusLabel(option),
          icon: <span className={`inline-flex h-2.5 w-2.5 rounded-full ${statusDot[option]}`} />,
        }))}
        label="Status"
        align="right"
        className="w-48"
        buttonClassName={statusStyles[status] ?? "border-slate-500/60 text-slate-300"}
      />

    </div>
  );
}
