"use client";

import { useMemo } from "react";
import { useToast } from "@/components/ToastProvider";

type AddressCardProps = {
  label?: string;
  line1?: string | null;
  line2?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
};

export default function AddressCard({
  label = "Site address",
  line1,
  line2,
  suburb,
  state,
  postcode,
}: AddressCardProps) {
  const { notify } = useToast();

  const address = useMemo(() => {
    return [line1, line2, suburb, state, postcode]
      .filter((value) => value && String(value).trim().length > 0)
      .join(", ");
  }, [line1, line2, suburb, state, postcode]);

  const mapsHref = useMemo(() => {
    if (!address) return "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }, [address]);

  const mapsEmbedSrc = useMemo(() => {
    if (!address) return "";
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=12&output=embed`;
  }, [address]);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      notify({ tone: "success", title: "Copied", message: "Address copied to clipboard." });
    } catch (err) {
      notify({ tone: "error", title: "Copy failed", message: "Unable to copy address." });
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-900 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {label ? (
                <>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s7-7.6 7-12a7 7 0 0 0-14 0c0 4.4 7 12 7 12z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {label}
                  </p>
                </>
              ) : null}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s7-7.6 7-12a7 7 0 0 0-14 0c0 4.4 7 12 7 12z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {[line1, line2].filter(Boolean).join(", ") || "—"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[suburb, state, postcode].filter(Boolean).join(" ")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!address}
                className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                aria-label="Copy address"
                title="Copy address"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {mapsEmbedSrc ? (
          <div className="w-full lg:w-64">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <iframe
                title="Address map"
                src={mapsEmbedSrc}
                className="h-40 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <a
              href={mapsHref}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Open in Maps
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
