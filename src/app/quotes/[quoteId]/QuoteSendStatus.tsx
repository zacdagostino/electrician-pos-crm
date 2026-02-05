"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SendQuotePrompt from "@/app/quotes/SendQuotePrompt";

type QuoteSendStatusProps = {
  quoteId: string;
  customerEmail?: string | null;
  customerName?: string | null;
  sentAt?: string | null;
};

export default function QuoteSendStatus({
  quoteId,
  customerEmail,
  customerName,
  sentAt,
}: QuoteSendStatusProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
          sentAt
            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
            : "border-slate-700/60 bg-slate-950/60 text-slate-300"
        }`}
      >
        {sentAt ? `Sent ${new Date(sentAt).toLocaleDateString()}` : "Not sent"}
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-900"
      >
        {sentAt ? "Resend" : "Send to client"}
      </button>
      {open ? (
        <SendQuotePrompt
          quoteId={quoteId}
          customerEmail={customerEmail}
          customerName={customerName}
          onClose={() => setOpen(false)}
          onSent={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
