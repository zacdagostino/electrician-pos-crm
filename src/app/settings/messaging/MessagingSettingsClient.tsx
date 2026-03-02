"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";

type DraftItem = {
  id: string;
  threadId: string;
  customerLabel: string;
  body: string;
  status: "draft" | "failed";
  error: string | null;
  createdAt: string;
};

type Props = {
  canManage: boolean;
  connected: boolean;
  reviewBeforeSend: boolean;
  autoReplyEnabled: boolean;
  drafts: DraftItem[];
};

export default function MessagingSettingsClient({
  canManage,
  connected,
  reviewBeforeSend: initialReview,
  autoReplyEnabled: initialAuto,
  drafts: initialDrafts,
}: Props) {
  const { notify } = useToast();
  const [reviewBeforeSend, setReviewBeforeSend] = useState(initialReview);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(initialAuto);
  const [savingConfig, setSavingConfig] = useState(false);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [sendingDraftId, setSendingDraftId] = useState<string | null>(null);

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/settings/messaging/facebook/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewBeforeSend,
          autoReplyEnabled,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify({ tone: "error", title: "Save failed", message: String(payload.error ?? "Could not update settings.") });
        return;
      }
      notify({ tone: "success", title: "Saved", message: "Messaging automation settings updated." });
    } catch {
      notify({ tone: "error", title: "Save failed", message: "Could not update settings." });
    } finally {
      setSavingConfig(false);
    }
  };

  const sendDraft = async (draftId: string) => {
    setSendingDraftId(draftId);
    try {
      const draft = drafts.find((d) => d.id === draftId);
      const res = await fetch(`/api/settings/messaging/facebook/drafts/${draftId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft?.body ?? "" }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify({ tone: "error", title: "Send failed", message: String(payload.error ?? "Unable to send draft.") });
        return;
      }
      setDrafts((current) => current.filter((item) => item.id !== draftId));
      notify({ tone: "success", title: "Message sent", message: "Draft reply sent to customer." });
    } catch {
      notify({ tone: "error", title: "Send failed", message: "Unable to send draft." });
    } finally {
      setSendingDraftId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reply mode</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <input
              type="checkbox"
              disabled={!connected || !canManage}
              checked={reviewBeforeSend}
              onChange={(event) => setReviewBeforeSend(event.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block font-semibold">Review before send</span>
              <span className="text-xs text-slate-500">AI drafts appear in queue first.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <input
              type="checkbox"
              disabled={!connected || !canManage}
              checked={autoReplyEnabled}
              onChange={(event) => setAutoReplyEnabled(event.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block font-semibold">Auto reply enabled</span>
              <span className="text-xs text-slate-500">When review is off, replies send automatically.</span>
            </span>
          </label>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={saveConfig}
            disabled={!connected || savingConfig}
            className="mt-3 rounded-lg border border-emerald-400/60 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            {savingConfig ? "Saving..." : "Save messaging settings"}
          </button>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Draft review queue</p>
        {drafts.length ? (
          <div className="mt-3 space-y-3">
            {drafts.map((draft) => (
              <div key={draft.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{draft.customerLabel}</p>
                  <p className="text-[11px] text-slate-500">{new Date(draft.createdAt).toLocaleString()}</p>
                </div>
                <textarea
                  value={draft.body}
                  onChange={(event) => {
                    const nextBody = event.target.value;
                    setDrafts((current) =>
                      current.map((item) => (item.id === draft.id ? { ...item, body: nextBody } : item))
                    );
                  }}
                  rows={4}
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
                {draft.error ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{draft.error}</p> : null}
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => sendDraft(draft.id)}
                    disabled={sendingDraftId === draft.id}
                    className="rounded-md border border-sky-400/60 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-60 dark:text-sky-300 dark:hover:bg-sky-950/30"
                  >
                    {sendingDraftId === draft.id ? "Sending..." : "Approve & send"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No pending drafts yet.</p>
        )}
      </div>
    </div>
  );
}
