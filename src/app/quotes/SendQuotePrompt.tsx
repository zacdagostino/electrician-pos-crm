"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";

type SendQuotePromptProps = {
  quoteId: string;
  customerEmail?: string | null;
  customerName?: string | null;
  onClose: () => void;
  onSent?: () => void;
};

export default function SendQuotePrompt({
  quoteId,
  customerEmail,
  customerName,
  onClose,
  onSent,
}: SendQuotePromptProps) {
  const [sending, setSending] = useState(false);
  const { notify } = useToast();

  const handleSendEmail = async () => {
    setSending(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "email" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify({ tone: "error", title: "Send failed", message: payload.error ?? "Unable to send email." });
        return;
      }
      notify({ tone: "success", title: "Quote sent", message: "Email sent to client." });
      onSent?.();
      onClose();
    } catch (err) {
      notify({ tone: "error", title: "Send failed", message: "Unable to send email." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Send quote</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-100">Send to client now?</h3>
        <p className="mt-2 text-sm text-slate-400">
          {customerName ? `${customerName} will receive the PDF quote.` : "Send the PDF quote to the client."}
        </p>
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Email</p>
          <p className="mt-1">{customerEmail ?? "No email on file"}</p>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
          >
            Not now
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled
              className="rounded-lg border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-500"
            >
              SMS (soon)
            </button>
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={sending || !customerEmail}
              className="rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send email"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
