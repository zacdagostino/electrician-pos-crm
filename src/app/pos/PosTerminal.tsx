"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import VariationQuotePanel from "@/components/VariationQuotePanel";

type SaleItem = {
  id: string;
  serviceId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type SaleSummary = {
  id: string;
  jobId: string | null;
  jobTitle: string | null;
  status: "draft" | "paid" | "refunded" | "void";
  paymentMethod: "card" | "cash" | "bank_transfer" | "other";
  reference?: string | null;
  customerName: string;
  total: number;
  paidAt: string | null;
  createdAt: string;
  items: SaleItem[];
};

type LineDraft = {
  id: string;
  serviceId: string | null;
  name: string;
  quantity: string;
  unitPrice: string;
};

type JobOption = {
  id: string;
  title: string | null;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  siteSummary: string;
  quotedTotal: number | null;
  scopeItems: Array<{
    serviceId: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

type PosTerminalProps = {
  gstRate: number;
  jobs: JobOption[];
  initialJobId: string | null;
  initialSales: SaleSummary[];
  stripeReady: boolean;
  userCanManageRefunds: boolean;
};

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
const hasNoDraftLines = (lines: LineDraft[]) =>
  lines.length === 1 && !lines[0].name.trim() && !String(lines[0].unitPrice ?? "").trim();

const MetaIcon = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
    {children}
  </span>
);

export default function PosTerminal({
  gstRate,
  jobs,
  initialJobId,
  initialSales,
  stripeReady,
  userCanManageRefunds,
}: PosTerminalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { notify } = useToast();
  const [sales, setSales] = useState(initialSales);
  const [selectedJobId, setSelectedJobId] = useState(initialJobId ?? "");
  const [jobPickerOpen, setJobPickerOpen] = useState(!initialJobId);
  const [jobSearch, setJobSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "bank_transfer" | "other">("card");
  const [saving, setSaving] = useState(false);
  const [savingMode, setSavingMode] = useState<"paid" | "draft" | null>(null);
  const [statusUpdatingSaleId, setStatusUpdatingSaleId] = useState<string | null>(null);
  const [lines, setLines] = useState<LineDraft[]>([
    { id: crypto.randomUUID(), serviceId: null, name: "", quantity: "1", unitPrice: "" },
  ]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );
  const filteredJobs = useMemo(() => {
    const query = jobSearch.trim().toLowerCase();
    if (!query) return jobs.slice(0, 40);
    return jobs
      .filter((job) =>
        [job.title ?? "", job.customerName, job.siteSummary]
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 40);
  }, [jobs, jobSearch]);

  useEffect(() => {
    if (!selectedJob) return;
    applyJob(selectedJob, { importScope: hasNoDraftLines(lines) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;
    if (checkout === "success") {
      notify({
        tone: "success",
        title: "Payment complete",
        message: "Stripe confirmed payment. Sale has been marked paid.",
      });
    } else if (checkout === "cancelled") {
      notify({
        tone: "error",
        title: "Payment cancelled",
        message: "No charge was taken. You can retry Charge now.",
      });
    }
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("checkout");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [notify, pathname, router, searchParams]);

  const totals = useMemo(() => {
    const lineTotals = lines.map((line) => {
      const quantity = Number(line.quantity || 0);
      const unitPrice = Number(line.unitPrice || 0);
      return Number.isFinite(quantity) && Number.isFinite(unitPrice) ? quantity * unitPrice : 0;
    });
    const total = Number(lineTotals.reduce((sum, value) => sum + value, 0).toFixed(2));
    const gstAmount = Number((total * (gstRate / (1 + gstRate))).toFixed(2));
    const subtotal = Number((total - gstAmount).toFixed(2));
    return { subtotal, gstAmount, total };
  }, [lines, gstRate]);

  const importJobScope = (job: JobOption) => {
    if (!job.scopeItems.length) {
      notify({
        tone: "error",
        title: "No quoted items",
        message: "This job has no quote items to import.",
      });
      return;
    }
    setLines(
      job.scopeItems.map((item) => ({
        id: crypto.randomUUID(),
        serviceId: item.serviceId,
        name: item.name,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
      }))
    );
    notify({
      tone: "success",
      title: "Scope imported",
      message: `Loaded ${job.scopeItems.length} item${job.scopeItems.length === 1 ? "" : "s"} from job quote.`,
    });
  };

  const applyJob = (job: JobOption | null, options?: { importScope?: boolean }) => {
    setSelectedJobId(job?.id ?? "");
    if (!job) {
      setJobPickerOpen(true);
      return;
    }
    setJobPickerOpen(false);
    setJobSearch("");
    if (options?.importScope) {
      importJobScope(job);
    }
  };

  const createSale = async (saleStatus: "paid" | "draft") => {
    if (!selectedJob) {
      notify({ tone: "error", title: "Select a job", message: "Choose a job before creating a sale." });
      return;
    }
    if (saleStatus === "paid" && paymentMethod === "card" && !stripeReady) {
      notify({
        tone: "error",
        title: "Stripe setup required",
        message: "Configure Stripe first in Settings → POS setup to charge cards.",
      });
      return;
    }

    const payloadItems = lines
      .map((line) => ({
        serviceId: line.serviceId,
        name: line.name.trim(),
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      }))
      .filter((line) => line.name.length);

    if (!payloadItems.length) {
      notify({ tone: "error", title: "Missing items", message: "Add at least one line item." });
      return;
    }

    if (payloadItems.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0)) {
      notify({ tone: "error", title: "Invalid quantity", message: "All quantities must be greater than 0." });
      return;
    }

    if (payloadItems.some((line) => !Number.isFinite(line.unitPrice) || line.unitPrice < 0)) {
      notify({ tone: "error", title: "Invalid price", message: "All prices must be 0 or greater." });
      return;
    }

    setSaving(true);
    setSavingMode(saleStatus);
    try {
      const endpoint = saleStatus === "paid" && paymentMethod === "card" ? "/api/pos/sales/checkout" : "/api/pos/sales";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJobId || null,
          customerId: selectedJob.customerId,
          customerName: selectedJob.customerName,
          customerEmail: selectedJob.customerEmail,
          customerPhone: selectedJob.customerPhone,
          paymentMethod,
          status: saleStatus,
          reference: null,
          notes,
          items: payloadItems,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify({ tone: "error", title: "Charge failed", message: payload.error ?? "Unable to create sale." });
        return;
      }

      if (saleStatus === "paid" && paymentMethod === "card") {
        if (!payload.checkoutUrl) {
          notify({ tone: "error", title: "Checkout failed", message: "Missing Stripe checkout URL." });
          return;
        }
        window.location.href = String(payload.checkoutUrl);
        return;
      }

      const nextSale = payload.sale as SaleSummary;
      setSales((current) => [nextSale, ...current]);
      setNotes("");
      setLines([{ id: crypto.randomUUID(), serviceId: null, name: "", quantity: "1", unitPrice: "" }]);
      notify({
        tone: "success",
        title: saleStatus === "paid" ? "Payment recorded" : "Draft saved",
        message:
          saleStatus === "paid"
            ? `Sale charged for ${formatCurrency(nextSale.total)}`
            : `Draft saved for ${formatCurrency(nextSale.total)}`,
      });
    } catch {
      notify({ tone: "error", title: "Charge failed", message: "Unable to create sale." });
    } finally {
      setSaving(false);
      setSavingMode(null);
    }
  };

  const updateSaleStatus = async (saleId: string, action: "mark_paid" | "void" | "refund") => {
    setStatusUpdatingSaleId(saleId);
    try {
      const response = await fetch(`/api/pos/sales/${saleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify({
          tone: "error",
          title: "Sale update failed",
          message: payload.error ?? "Unable to update sale status.",
        });
        return;
      }
      const nextSale = payload.sale as SaleSummary;
      setSales((current) => current.map((sale) => (sale.id === saleId ? nextSale : sale)));
      notify({
        tone: "success",
        title: "Sale updated",
        message:
          action === "mark_paid"
            ? "Draft marked as paid."
            : action === "void"
              ? "Sale voided."
              : "Sale refunded.",
      });
    } catch {
      notify({ tone: "error", title: "Sale update failed", message: "Unable to update sale status." });
    } finally {
      setStatusUpdatingSaleId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Charge customer</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              {!jobPickerOpen && selectedJob ? (
                <div className="space-y-3">
                  <a
                    href={`/jobs/${selectedJob.id}`}
                    className="block rounded-lg border border-emerald-400/70 bg-emerald-50 px-3 py-2 text-left hover:bg-emerald-100 dark:border-emerald-500/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
                  >
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                      {selectedJob.title?.trim() || "Job"}
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                      {selectedJob.customerName} • {selectedJob.siteSummary || "No site address"}
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                      {selectedJob.customerEmail || "No email"} • {selectedJob.customerPhone || "No phone"}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      Open job
                    </p>
                  </a>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setJobPickerOpen(true)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      Change job
                    </button>
                    <button
                      type="button"
                      onClick={() => applyJob(null)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      Unlink job
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      value={jobSearch}
                      onChange={(event) => setJobSearch(event.target.value)}
                      placeholder="Find job by title, customer, or site"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                    {selectedJob ? (
                      <button
                        type="button"
                        onClick={() => setJobPickerOpen(false)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                      >
                        Close
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => applyJob(null)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                        !selectedJobId
                          ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-500/70 dark:bg-emerald-950/30 dark:text-emerald-200"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-950"
                      }`}
                    >
                      No linked job
                    </button>
                    {filteredJobs.map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => applyJob(job, { importScope: true })}
                        className={`w-full rounded-lg border px-3 py-2 text-left ${
                          selectedJobId === job.id
                            ? "border-emerald-400 bg-emerald-50 dark:border-emerald-500/70 dark:bg-emerald-950/30"
                            : "border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-950"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {job.title?.trim() || "Job"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{job.customerName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{job.siteSummary || "No site address"}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Quote {job.quotedTotal != null ? formatCurrency(job.quotedTotal) : "not set"} •{" "}
                          {job.scopeItems.length} item{job.scopeItems.length === 1 ? "" : "s"}
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Selected job</p>
              {selectedJob ? (
                <div className="mt-3 space-y-3">
                  <a
                    href={`/jobs/${selectedJob.id}`}
                    className="block rounded-xl border border-emerald-300/70 bg-emerald-50/80 p-3 transition hover:bg-emerald-100/80 dark:border-emerald-500/40 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/35"
                  >
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                      {selectedJob.title?.trim() || "Job"}
                    </p>
                    <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Open full job details
                    </p>
                  </a>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Amount</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {selectedJob.quotedTotal != null ? formatCurrency(selectedJob.quotedTotal) : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Items</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {selectedJob.scopeItems.length}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-start gap-2">
                      <MetaIcon>
                        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                          <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm0 2c-3.5 0-7 1.75-7 4v1h14v-1c0-2.25-3.5-4-7-4z" />
                        </svg>
                      </MetaIcon>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Customer</p>
                        <p className="text-sm text-slate-800 dark:text-slate-200">{selectedJob.customerName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MetaIcon>
                        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                          <path d="M2.5 5A2.5 2.5 0 015 2.5h10A2.5 2.5 0 0117.5 5v10A2.5 2.5 0 0115 17.5H5A2.5 2.5 0 012.5 15V5zm2.2.3l5.1 3.6a.5.5 0 00.6 0l5.1-3.6A1 1 0 0015 4H5a1 1 0 00-.3 1.3z" />
                        </svg>
                      </MetaIcon>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Email</p>
                        <p className="text-sm text-slate-800 dark:text-slate-200">{selectedJob.customerEmail || "No email"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MetaIcon>
                        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                          <path d="M2.5 4.5A2 2 0 014.5 2.5h2A1.5 1.5 0 018 3.7l.7 2.7a1.5 1.5 0 01-.4 1.5l-1 1a11 11 0 005 5l1-1a1.5 1.5 0 011.5-.4l2.7.7A1.5 1.5 0 0117.5 15v2a2 2 0 01-2 2h-.3c-7.1-.4-12.8-6.1-13.2-13.2V4.5z" />
                        </svg>
                      </MetaIcon>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Phone</p>
                        <p className="text-sm text-slate-800 dark:text-slate-200">{selectedJob.customerPhone || "No phone"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MetaIcon>
                        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                          <path d="M10 1.5a6.5 6.5 0 00-6.5 6.5c0 4.8 6.5 10.5 6.5 10.5s6.5-5.7 6.5-10.5A6.5 6.5 0 0010 1.5zm0 9a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                        </svg>
                      </MetaIcon>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Site</p>
                        <p className="text-sm text-slate-800 dark:text-slate-200">{selectedJob.siteSummary || "No site address"}</p>
                      </div>
                    </div>
                  </div>

                  {selectedJob.scopeItems.length ? (
                    <button
                      type="button"
                      onClick={() => importJobScope(selectedJob)}
                      className="mt-2 rounded-lg border border-emerald-400/70 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                    >
                      Use job items in this sale
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Choose a job to pull through its customer and quote scope.</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as "card" | "cash" | "bank_transfer" | "other")
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="card">Card</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="Internal note (optional)"
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />

          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-950">
                <tr>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const quantity = Number(line.quantity || 0);
                  const unitPrice = Number(line.unitPrice || 0);
                  const lineTotal = Number.isFinite(quantity) && Number.isFinite(unitPrice) ? quantity * unitPrice : 0;
                  return (
                    <tr key={line.id} className="border-t border-slate-200 dark:border-slate-800">
                      <td className="px-3 py-2">
                        <input
                          value={line.name}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item) => (item.id === line.id ? { ...item, name: event.target.value } : item))
                            )
                          }
                          placeholder="Item or service"
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={line.quantity}
                          type="number"
                          step="0.01"
                          min="0"
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item) =>
                                item.id === line.id ? { ...item, quantity: event.target.value } : item
                              )
                            )
                          }
                          className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={line.unitPrice}
                          type="number"
                          step="0.01"
                          min="0"
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item) =>
                                item.id === line.id ? { ...item, unitPrice: event.target.value } : item
                              )
                            )
                          }
                          className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold">{formatCurrency(lineTotal)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                          className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-500/50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {selectedJob ? (
            <VariationQuotePanel
              jobId={selectedJob.id}
              buttonLabel="Add more work"
              containerClassName="mt-3 flex items-end justify-end"
              buttonClassName="inline-flex items-center justify-center rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-500/50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
            />
          ) : null}

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Totals</p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">GST</span>
              <span>{formatCurrency(totals.gstAmount)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-lg font-semibold dark:border-slate-800">
              <span>Total</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={() => createSale("paid")}
              disabled={saving || (paymentMethod === "card" && !stripeReady)}
              className="w-full rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-300"
            >
              {savingMode === "paid"
                ? "Processing..."
                : paymentMethod === "card" && !stripeReady
                  ? "Stripe setup required"
                  : "Charge now"}
            </button>
            <p className="text-center text-[11px] text-slate-500">Marks this sale as paid immediately.</p>
            <button
              type="button"
              onClick={() => createSale("draft")}
              disabled={saving}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              {savingMode === "draft" ? "Processing..." : "Save draft"}
            </button>
            <p className="text-center text-[11px] text-slate-500">Stores it without taking payment yet.</p>
          </div>
          <p className="mt-2 text-xs text-slate-500">GST rate: {(gstRate * 100).toFixed(0)}%</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Recent POS sales</h2>
          <span className="text-xs text-slate-500">{sales.length} shown</span>
        </div>
        {sales.length ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-950">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Job</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Payment</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Items</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-2 text-slate-500">{new Date(sale.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      {sale.jobId ? (
                        <a href={`/jobs/${sale.jobId}`} className="font-medium text-emerald-700 hover:underline dark:text-emerald-300">
                          {sale.jobTitle ?? "Linked job"}
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium">{sale.customerName}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <span>{sale.paymentMethod.replace("_", " ")}</span>
                        {sale.status === "paid" &&
                        sale.paymentMethod === "card" &&
                        Boolean(sale.reference?.startsWith("pi_")) ? (
                          <span className="rounded-full border border-emerald-400/50 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Paid via Stripe
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                          sale.status === "paid"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : sale.status === "refunded"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                            : sale.status === "draft"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200"
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{sale.items.length}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatCurrency(sale.total)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/pos/sales/${sale.id}/receipt`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-950"
                        >
                          Receipt
                        </a>
                        {sale.status === "draft" ? (
                          <button
                            type="button"
                            onClick={() => updateSaleStatus(sale.id, "mark_paid")}
                            disabled={statusUpdatingSaleId === sale.id}
                            className="rounded-md border border-emerald-500/60 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                          >
                            Mark paid
                          </button>
                        ) : null}
                        {userCanManageRefunds && sale.status !== "void" ? (
                          <button
                            type="button"
                            onClick={() => updateSaleStatus(sale.id, "void")}
                            disabled={statusUpdatingSaleId === sale.id || sale.status === "refunded"}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-950"
                          >
                            Void
                          </button>
                        ) : null}
                        {userCanManageRefunds && sale.status === "paid" ? (
                          <button
                            type="button"
                            onClick={() => updateSaleStatus(sale.id, "refund")}
                            disabled={statusUpdatingSaleId === sale.id}
                            className="rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                          >
                            Refund
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No POS sales yet.</p>
        )}
      </section>
    </div>
  );
}
