"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SendQuotePrompt from "@/app/quotes/SendQuotePrompt";

type QuoteItem = {
  id: string;
  name: string;
};

type JobQuote = {
  id: string;
  title: string | null;
  status: string;
  total: number;
  createdAt: string;
  sentAt: string | null;
  customerEmail: string | null;
  customerName: string;
  items: QuoteItem[];
};

type JobQuotesPanelProps = {
  quotes: JobQuote[];
};

export default function JobQuotesPanel({ quotes }: JobQuotesPanelProps) {
  const router = useRouter();
  const [sendQuoteId, setSendQuoteId] = useState<string | null>(null);

  const sortedQuotes = useMemo(
    () =>
      [...quotes].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [quotes]
  );

  const acceptedQuotes = sortedQuotes.filter((quote) => quote.status === "accepted");
  const activeQuote = acceptedQuotes[0] ?? null;
  const latestQuote = sortedQuotes[0] ?? null;
  const recentChange = latestQuote && latestQuote.status !== "accepted" ? latestQuote : null;
  const historyQuotes = sortedQuotes.filter((quote) => quote.id !== recentChange?.id);
  const [historyOpen, setHistoryOpen] = useState(false);

  const approveQuote = async (quoteId: string) => {
    await fetch(`/api/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted" }),
    });
    router.refresh();
  };

  const renderQuoteCard = (quote: JobQuote) => {
    const quoteHref = `/quotes/${quote.id}`;
    const isLatest = latestQuote?.id === quote.id;

    return (
      <div
        key={quote.id}
        className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-[background-color,box-shadow] duration-200 hover:bg-slate-100 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.25)] dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-900/70"
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1.1fr_0.6fr]">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {new Date(quote.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {quote.title ? (
                <Link href={quoteHref} className="hover:text-emerald-600 dark:hover:text-emerald-200">
                  {quote.title}
                </Link>
              ) : null}
              {!isLatest ? (
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-600 dark:border-slate-700/60 dark:bg-slate-950 dark:text-slate-300">
                  Old version
                </span>
              ) : null}
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-600 dark:border-slate-700/60 dark:bg-slate-950 dark:text-slate-300">
                {quote.status}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 dark:border-slate-800/50 dark:bg-slate-950/5 dark:text-slate-300">
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
              <span>Scope</span>
            </div>
            {quote.items?.length ? (
              <ul className="space-y-1">
                {quote.items.map((item, index) => (
                  <li key={`${item.id}-${index}`} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/70" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">No scope items</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-3 text-right">
            <div className="flex items-center gap-2">
              <Link
                href={`/api/quotes/${quote.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                View PDF
              </Link>
              <Link
                href={quoteHref}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                View quote
              </Link>
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                ${Number(quote.total).toFixed(2)}
              </span>
            </div>
            {isLatest ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSendQuoteId(quote.id)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  {quote.sentAt ? "Resend to client" : "Send to client"}
                </button>
                {quote.status !== "accepted" ? (
                  <button
                    type="button"
                    onClick={() => approveQuote(quote.id)}
                    className="rounded-lg border border-emerald-400/60 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                  >
                    Approve
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {recentChange ? (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Recent change</p>
          {renderQuoteCard(recentChange)}
        </div>
      ) : null}
      {historyQuotes.length ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500"
          >
            Quote history
            <span className="text-[10px]">{historyOpen ? "▲" : "▼"}</span>
          </button>
          {historyOpen ? (
            <div className="space-y-4">{historyQuotes.map(renderQuoteCard)}</div>
          ) : null}
        </div>
      ) : null}

      {sendQuoteId ? (
        <SendQuotePrompt
          quoteId={sendQuoteId}
          customerEmail={quotes.find((quote) => quote.id === sendQuoteId)?.customerEmail ?? null}
          customerName={quotes.find((quote) => quote.id === sendQuoteId)?.customerName ?? ""}
          onClose={() => setSendQuoteId(null)}
          onSent={() => {
            setSendQuoteId(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
