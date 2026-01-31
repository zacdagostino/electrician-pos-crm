"use client";

import { useState } from "react";
import Link from "next/link";

type QuoteSummary = {
  id: string;
  customerName: string;
  siteLine1?: string | null;
  status: string;
  total: string | number;
  createdAt: string;
  updatedAt?: string | null;
};

export default function QuotesTabs({ drafts, quotes }: { drafts: QuoteSummary[]; quotes: QuoteSummary[] }) {
  const [tab, setTab] = useState<"recent" | "drafts">("recent");
  const [localDrafts, setLocalDrafts] = useState<QuoteSummary[]>(drafts);

  const handleDelete = async (id: string) => {
    const ok = confirm("Delete this draft? This cannot be undone.");
    if (!ok) return;
    try {
      const res = await fetch(`/api/quotes/drafts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLocalDrafts((prev) => prev.filter((d) => d.id !== id));
      } else {
        console.warn("Failed to delete draft", await res.text());
      }
    } catch (err) {
      console.warn("Failed to delete draft", err);
    }
  };

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <button
          type="button"
          onClick={() => setTab("recent")}
          className={`rounded-lg px-3 py-1 text-sm font-semibold ${tab === "recent" ? "bg-slate-950 text-slate-100" : "text-slate-400"}`}
        >
          Recent
        </button>
        <button
          type="button"
          onClick={() => setTab("drafts")}
          className={`rounded-lg px-3 py-1 text-sm font-semibold ${tab === "drafts" ? "bg-slate-950 text-slate-100" : "text-slate-400"}`}
        >
          Drafts
          {localDrafts.length ? <span className="ml-2 inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">{localDrafts.length}</span> : null}
        </button>
      </div>

      {tab === "recent" ? (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {quotes.length ? (
                quotes.map((quote) => (
                  <tr key={quote.id} className="bg-slate-950/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-100">{quote.customerName}</p>
                      <p className="text-xs text-slate-500">{quote.siteLine1}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{quote.status}</td>
                    <td className="px-4 py-3 text-slate-300">${Number(quote.total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(quote.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={4}>
                    No quotes yet. Create your first quote.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3">
          {localDrafts.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {localDrafts.map((draft) => (
                <div key={draft.id} className="relative rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <div className="absolute right-3 top-3 text-xs text-slate-500">
                    {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString() : new Date(draft.createdAt).toLocaleDateString()}
                  </div>
                  <div className="min-h-[3.25rem]">
                    <p className="font-semibold text-slate-100">{draft.customerName || "Draft"}</p>
                    <p className="text-xs text-slate-500 mt-1">{draft.siteLine1}</p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/quotes/new?draftId=${draft.id}`}
                      className="rounded-full border border-emerald-400/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-200"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => void handleDelete(draft.id)}
                      className="rounded-full border border-rose-400/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-rose-200"
                      aria-label={`Delete draft ${draft.customerName || 'draft'}`}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-slate-500">No drafts yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
