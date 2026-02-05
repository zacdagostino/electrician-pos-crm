"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SendQuotePrompt from "@/app/quotes/SendQuotePrompt";
import StackedCard from "@/components/StackedCard";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";

type QuoteSummary = {
  id: string;
  customerName: string;
  customerId?: string | null;
  siteLine1?: string | null;
  siteLine2?: string | null;
  siteSuburb?: string | null;
  siteState?: string | null;
  sitePostcode?: string | null;
  assignedToName?: string | null;
  assignedToRole?: "electrician" | "apprentice" | "office" | null;
  assignedToMemberId?: string | null;
  scopeItems?: string[] | null;
  status: string;
  total: string | number;
  createdAt: string;
  updatedAt?: string | null;
  sentAt?: string | null;
  jobId?: string | null;
  jobStatus?: string | null;
  isActiveJobQuote?: boolean;
};


const formatAddress = (quote: QuoteSummary) => {
  const primary = [quote.siteLine1, quote.siteLine2]
    .filter((value) => value && String(value).trim().length > 0)
    .join(", ");
  const secondary = [quote.siteSuburb, quote.siteState, quote.sitePostcode]
    .filter((value) => value && String(value).trim().length > 0)
    .join(", ");

  return { primary, secondary };
};

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

const formatStatusLabel = (status: string) =>
  status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const statusOptions = ["pending", "sent", "accepted", "declined", "draft"] as const;

export default function QuotesTabs({
  drafts,
  quotes,
  highlightQuoteId,
  toastMessage,
  jobToastMessage,
}: {
  drafts: QuoteSummary[];
  quotes: QuoteSummary[];
  highlightQuoteId?: string | null;
  toastMessage?: string | null;
  jobToastMessage?: string | null;
}) {
  const [tab, setTab] = useState<"recent" | "drafts">("recent");
  const [localDrafts, setLocalDrafts] = useState<QuoteSummary[]>(drafts);
  const router = useRouter();
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const [sendQuoteId, setSendQuoteId] = useState<string | null>(null);
  const [highlightActive, setHighlightActive] = useState(Boolean(highlightQuoteId));
  const { notify } = useToast();
  const { confirm } = useConfirm();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [pendingDeletes] = useState<Record<string, number>>({});

  const currentList = useMemo(
    () =>
      (tab === "recent" ? quotes : localDrafts).filter((item) => !hiddenIds.has(item.id)),
    [tab, quotes, localDrafts, hiddenIds]
  );
  const visibleDraftCount = useMemo(
    () => localDrafts.filter((draft) => !hiddenIds.has(draft.id)).length,
    [localDrafts, hiddenIds]
  );
  const allSelected = currentList.length > 0 && selectedIds.size === currentList.length;

  useEffect(() => {
    if (!highlightQuoteId) return;
    setTab("recent");
    setHighlightActive(true);
    const handle = window.setTimeout(() => setHighlightActive(false), 3200);
    const scrollHandle = window.setTimeout(() => {
      const el = document.querySelector(`[data-quote-id="${highlightQuoteId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    return () => {
      window.clearTimeout(handle);
      window.clearTimeout(scrollHandle);
    };
  }, [highlightQuoteId]);

  useEffect(() => {
    if (!toastMessage && !jobToastMessage) return;
    const cleanHandle = window.setTimeout(() => {
      router.replace("/quotes");
    }, 2600);
    if (toastMessage) {
      notify({ tone: "success", title: "Quote saved", message: toastMessage });
    }
    if (jobToastMessage) {
      notify({ tone: "info", title: "Job updated", message: jobToastMessage });
    }
    return () => {
      window.clearTimeout(cleanHandle);
    };
  }, [toastMessage, jobToastMessage, router, notify]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [tab]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete draft",
      message: "Delete this draft? This cannot be undone.",
      confirmLabel: "Delete draft",
      tone: "danger",
    });
    if (!ok) return;
    setHiddenIds((prev) => new Set([...prev, id]));
    notify({
      tone: "warning",
      title: "Draft scheduled",
      message: "Deleting draft in 5 seconds.",
      actionLabel: "Undo",
      onAction: () => {
        const timeout = pendingDeletes[`draft-${id}`];
        if (timeout) window.clearTimeout(timeout);
        delete pendingDeletes[`draft-${id}`];
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        notify({ tone: "info", title: "Undo", message: "Draft deletion canceled." });
      },
    });
    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/quotes/drafts/${id}`, { method: "DELETE" });
        if (res.ok) {
          setLocalDrafts((prev) => prev.filter((d) => d.id !== id));
          notify({ tone: "success", title: "Draft deleted", message: "Draft removed." });
        } else {
          notify({ tone: "error", title: "Delete failed", message: "Unable to delete draft." });
          setHiddenIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      } catch (err) {
        notify({ tone: "error", title: "Delete failed", message: "Unable to delete draft." });
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } finally {
        delete pendingDeletes[`draft-${id}`];
      }
    }, 5000);

    pendingDeletes[`draft-${id}`] = timeoutId;
  };

  const updateStatus = async (quoteId: string, nextStatus: string) => {
    await fetch(`/api/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    router.refresh();
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(currentList.map((item) => item.id)));
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDeleteDrafts = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const ok = await confirm({
      title: "Delete drafts",
      message: `Delete ${ids.length} draft quote(s)? This cannot be undone.`,
      confirmLabel: "Delete drafts",
      tone: "danger",
    });
    if (!ok) return;
    const pendingId = `drafts-${Date.now()}`;
    setHiddenIds((prev) => new Set([...prev, ...ids]));
    setSelectedIds(new Set());
    notify({
      tone: "warning",
      title: "Drafts scheduled",
      message: `Deleting ${ids.length} draft(s) in 5 seconds.`,
      actionLabel: "Undo",
      onAction: () => {
        const timeout = pendingDeletes[pendingId];
        if (timeout) window.clearTimeout(timeout);
        delete pendingDeletes[pendingId];
        setHiddenIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        notify({ tone: "info", title: "Undo", message: "Draft deletion canceled." });
      },
    });

    pendingDeletes[pendingId] = window.setTimeout(async () => {
      setDeleting(true);
      try {
        await Promise.all(ids.map((id) => fetch(`/api/quotes/drafts/${id}`, { method: "DELETE" })));
        setLocalDrafts((prev) => prev.filter((draft) => !ids.includes(draft.id)));
        notify({ tone: "success", title: "Drafts deleted", message: `${ids.length} drafts removed.` });
      } catch (err) {
        notify({ tone: "error", title: "Delete failed", message: "Unable to delete drafts." });
        setHiddenIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      } finally {
        setDeleting(false);
        delete pendingDeletes[pendingId];
      }
    }, 5000);
  };

  const handleBulkDeleteQuotes = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const selectedQuotes = quotes.filter((quote) => ids.includes(quote.id));
    const linkedJobs = Array.from(
      new Set(selectedQuotes.map((quote) => quote.jobId).filter(Boolean))
    );

    const ok = await confirm({
      title: "Delete quotes",
      message: linkedJobs.length
        ? `Some selected quotes are linked to ${linkedJobs.length} job(s). Deleting these quotes will also delete those jobs. Continue?`
        : `Delete ${ids.length} quote(s)? This cannot be undone.`,
      confirmLabel: linkedJobs.length ? "Delete quotes + jobs" : "Delete quotes",
      tone: "danger",
    });
    if (!ok) return;

    const pendingId = `quotes-${Date.now()}`;
    setHiddenIds((prev) => new Set([...prev, ...ids]));
    setSelectedIds(new Set());
    notify({
      tone: "warning",
      title: "Quotes scheduled",
      message: `Deleting ${ids.length} quote(s) in 5 seconds.`,
      actionLabel: "Undo",
      onAction: () => {
        const timeout = pendingDeletes[pendingId];
        if (timeout) window.clearTimeout(timeout);
        delete pendingDeletes[pendingId];
        setHiddenIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        notify({ tone: "info", title: "Undo", message: "Quote deletion canceled." });
      },
    });

    pendingDeletes[pendingId] = window.setTimeout(async () => {
      setDeleting(true);
      try {
        const response = await fetch("/api/quotes/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quoteIds: ids, deleteLinkedJobs: linkedJobs.length > 0 }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          notify({ tone: "error", title: "Delete failed", message: payload.error ?? "Unable to delete quotes." });
          setHiddenIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
          });
          return;
        }
        router.refresh();
        notify({
          tone: "success",
          title: "Quotes deleted",
          message: linkedJobs.length
            ? `Deleted ${payload.deletedQuotes ?? ids.length} quotes and ${payload.deletedJobs ?? linkedJobs.length} jobs.`
            : `Deleted ${payload.deletedQuotes ?? ids.length} quotes.`,
        });
      } catch (err) {
        notify({ tone: "error", title: "Delete failed", message: "Unable to delete quotes." });
        setHiddenIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      } finally {
        setDeleting(false);
        delete pendingDeletes[pendingId];
      }
    }, 5000);
  };


  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-xs text-slate-300">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-slate-700 bg-slate-950"
          />
          Select all
        </label>
        <div className="flex items-center gap-2">
          <span>{selectedIds.size} selected</span>
          <button
            type="button"
            onClick={() => {
              if (!selectedIds.size) return;
              if (tab === "drafts") {
                void handleBulkDeleteDrafts();
              } else {
                void handleBulkDeleteQuotes();
              }
            }}
            disabled={!selectedIds.size || deleting}
            className="rounded-lg border border-rose-400/60 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete selected"}
          </button>
        </div>
      </div>
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
          {visibleDraftCount ? (
            <span className="ml-2 inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
              {visibleDraftCount}
            </span>
          ) : null}
        </button>
      </div>

      {tab === "recent" ? (
        <div className="grid gap-4">
          {currentList.length ? (
            currentList.map((quote) => {
              const address = formatAddress(quote);
              const isSelected = selectedIds.has(quote.id);
              return (
                <StackedCard
                  key={quote.id}
                  dataId={quote.id}
                  shine={highlightActive && highlightQuoteId === quote.id}
                  className={
                    highlightActive && highlightQuoteId === quote.id
                      ? "ring-2 ring-emerald-400/60"
                      : ""
                  }
                  onClick={() => router.push(`/quotes/${quote.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/quotes/${quote.id}`);
                    }
                  }}
                  topRight={
                    <div className="flex items-start gap-3 text-xs">
                      <div className="flex flex-col items-end gap-1 text-xs">
                        {quote.isActiveJobQuote ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                            Active job
                          </span>
                        ) : null}
                        {quote.jobId && !quote.isActiveJobQuote && quote.status === "accepted" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                            Old version
                          </span>
                        ) : null}
                        {quote.jobId && !quote.isActiveJobQuote ? (
                          <Link
                            href={`/jobs/${quote.jobId}`}
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400/50 hover:text-emerald-200"
                          >
                            Linked job
                          </Link>
                        ) : null}
                        <span className={quote.sentAt ? "text-slate-500" : "text-rose-300"}>
                          {quote.sentAt ? "Sent to client" : "Not sent"}
                        </span>
                      </div>
                      <label
                        className="flex items-center gap-2"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(quote.id)}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                          aria-label="Select quote"
                        />
                      </label>
                    </div>
                  }
                >
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_1.1fr_0.6fr]">
                      <div className="min-w-0 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-200">
                            Quote
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-100">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4 text-slate-400"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 21a8 8 0 0 0-16 0" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          {quote.customerId ? (
                            <Link
                              href={`/clients/${quote.customerId}`}
                              className="hover:text-emerald-200"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {quote.customerName}
                            </Link>
                          ) : (
                            <span>{quote.customerName}</span>
                          )}
                          {quote.customerId ? (
                            <Link
                              href={`/clients/${quote.customerId}`}
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-800 text-slate-400 transition hover:text-emerald-200 hover:border-emerald-400/50"
                              aria-label="View client"
                              title="View client"
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M7 7h10v10" />
                                <path d="M7 17 17 7" />
                              </svg>
                            </Link>
                          ) : null}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenStatusId((prev) => (prev === quote.id ? null : quote.id));
                              }}
                              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                                statusStyles[quote.status] ?? "border-slate-500/60 text-slate-300"
                              }`}
                              aria-haspopup="listbox"
                              aria-expanded={openStatusId === quote.id}
                            >
                              {formatStatusLabel(quote.status)}
                              <span className="text-[10px]">▼</span>
                            </button>
                            {openStatusId === quote.id ? (
                              <div
                                className="absolute left-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-xl"
                                role="listbox"
                                onMouseLeave={() => setOpenStatusId(null)}
                              >
                                {statusOptions.map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={async (event) => {
                                      event.stopPropagation();
                                      await updateStatus(quote.id, status);
                                      setOpenStatusId(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-200 transition hover:bg-slate-900"
                                    role="option"
                                    aria-selected={quote.status === status}
                                  >
                                    <span
                                      className={`inline-flex h-2.5 w-2.5 rounded-full ${
                                        statusDot[status] ?? "bg-slate-500"
                                      }`}
                                    />
                                    {formatStatusLabel(status)}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="mt-0.5 h-4 w-4 text-slate-500"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 22s7-7.6 7-12a7 7 0 0 0-14 0c0 4.4 7 12 7 12z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {address.primary ? <span>{address.primary}</span> : null}
                          {address.primary && address.secondary ? <span>•</span> : null}
                          {address.secondary ? <span>{address.secondary}</span> : null}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-800/50 bg-slate-950/5 p-3 text-xs text-slate-300">
                        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          <span>Scope</span>
                          {quote.scopeItems && quote.scopeItems.length > 2 ? (
                            <span>+{Math.max(quote.scopeItems.length - 2, 1)} more</span>
                          ) : null}
                        </div>
                        {quote.scopeItems && quote.scopeItems.length ? (
                          <ul className="space-y-1">
                            {quote.scopeItems.map((item, index) => (
                              <li key={`${item}-${index}`} className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/70" />
                                <span className="font-semibold text-slate-200">{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-slate-500">No scope items</p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-3 text-right">
                        <div>
                          <p className="text-lg font-semibold text-slate-100">
                            ${Number(quote.total).toFixed(2)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSendQuoteId(quote.id);
                          }}
                          className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-900"
                        >
                          {quote.sentAt ? "Resend to client" : "Send to client"}
                        </button>
                      </div>
                    </div>
                  {sendQuoteId === quote.id ? (
                    <SendQuotePrompt
                      quoteId={quote.id}
                      customerEmail={quote.customerEmail}
                      customerName={quote.customerName}
                      onClose={() => setSendQuoteId(null)}
                      onSent={() => {
                        setSendQuoteId(null);
                        router.refresh();
                      }}
                    />
                  ) : null}
                </StackedCard>
              );
            })
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-6 text-center text-sm text-slate-500">
              No quotes yet. Create your first quote.
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {currentList.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {currentList.map((draft) => (
                <div key={draft.id} className="relative rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <div className="absolute right-3 top-3 text-xs text-slate-500">
                    {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString() : new Date(draft.createdAt).toLocaleDateString()}
                  </div>
                  <label
                    className="absolute left-3 top-3 flex items-center gap-2"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(draft.id)}
                      onChange={() => toggleSelected(draft.id)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                      aria-label="Select draft"
                    />
                  </label>
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
