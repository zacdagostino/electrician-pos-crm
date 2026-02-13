"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QuoteBuilder from "@/app/quotes/new/QuoteBuilder";
import { useToast } from "@/components/ToastProvider";

type VariationQuotePanelProps = {
  jobId: string;
  buttonLabel?: string;
  buttonClassName?: string;
  containerClassName?: string;
};

type QuotePayload = {
  id: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  siteLine1: string;
  siteLine2?: string | null;
  siteSuburb?: string | null;
  siteState?: string | null;
  sitePostcode?: string | null;
  notes?: string | null;
  travelSurchargeApplied: boolean;
  items: Array<{
    id: string;
    name: string;
    type: string;
    quantity: number | string;
    unitPrice: number | string;
    pricingItemId?: string | null;
  }>;
};

export default function VariationQuotePanel({
  jobId,
  buttonLabel = "Add variation",
  buttonClassName,
  containerClassName,
}: VariationQuotePanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [panelQuote, setPanelQuote] = useState<QuotePayload | null>(null);
  const { notify } = useToast();
  const closeTimeoutRef = useRef<number | null>(null);

  const openPanel = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/variation`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.quoteId) {
        notify({
          tone: "error",
          title: "Variation failed",
          message: payload.error ?? "Unable to create variation quote.",
        });
        return;
      }

      const quoteResponse = await fetch(`/api/quotes/${payload.quoteId}`);
      const quotePayload = await quoteResponse.json().catch(() => ({}));
      if (!quoteResponse.ok || !quotePayload.quote) {
        notify({
          tone: "error",
          title: "Variation failed",
          message: quotePayload.error ?? "Unable to load variation quote.",
        });
        return;
      }

      setPanelQuote(quotePayload.quote);
      setOpen(true);
    } catch {
      notify({
        tone: "error",
        title: "Variation failed",
        message: "Unable to create variation quote.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open && panelQuote) {
      closeTimeoutRef.current = window.setTimeout(() => {
        setPanelQuote(null);
        closeTimeoutRef.current = null;
      }, 300);
    }
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [open, panelQuote]);

  return (
    <>
      <div className={containerClassName ?? "flex flex-col items-end gap-2"}>
        <button
          type="button"
          onClick={openPanel}
          disabled={loading}
          className={
            buttonClassName ??
            "inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          }
        >
          {loading ? "Creating…" : buttonLabel}
        </button>
      </div>

      {panelQuote ? (
        <div
          className={`fixed inset-0 z-50 flex justify-start transition-opacity duration-300 ${
            open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          } bg-slate-950/60`}
        >
          <div
            className={`ml-4 mt-4 flex h-[calc(100%-2rem)] w-full max-w-3xl flex-col overflow-y-auto rounded-3xl bg-white shadow-2xl ${
              open
                ? "translate-x-0"
                : "-translate-x-full transition-transform duration-300 ease-out"
            } dark:bg-slate-950`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Variation quote
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Add work to this job
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              <QuoteBuilder
                mode="edit"
                collapseWhoWhereByDefault
                quoteId={panelQuote.id}
                initialQuote={{
                  id: panelQuote.id,
                  customerId: panelQuote.customerId ?? null,
                  customerName: panelQuote.customerName,
                  customerEmail: panelQuote.customerEmail ?? null,
                  customerPhone: panelQuote.customerPhone ?? null,
                  siteLine1: panelQuote.siteLine1,
                  siteLine2: panelQuote.siteLine2 ?? null,
                  siteSuburb: panelQuote.siteSuburb ?? null,
                  siteState: panelQuote.siteState ?? null,
                  sitePostcode: panelQuote.sitePostcode ?? null,
                  notes: panelQuote.notes ?? null,
                  travelSurchargeApplied: Boolean(panelQuote.travelSurchargeApplied),
                  items: panelQuote.items.map((item) => ({
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    quantity: Number(item.quantity ?? 0),
                    unitPrice: Number(item.unitPrice ?? 0),
                    pricingItemId: item.pricingItemId ?? null,
                  })),
                }}
                onSaved={() => {
                  setOpen(false);
                  router.refresh();
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
