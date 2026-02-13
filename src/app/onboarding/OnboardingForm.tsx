"use client";

import { useState } from "react";
import SelectMenu from "@/components/SelectMenu";
import { useToast } from "@/components/ToastProvider";

const locationTypes = [
  { value: "van", label: "Van" },
  { value: "warehouse", label: "Warehouse" },
  { value: "store", label: "Shopfront" },
  { value: "site", label: "Job Site" },
];

export default function OnboardingForm() {
  const [step, setStep] = useState(0);
  const [orgName, setOrgName] = useState("");
  const [abn, setAbn] = useState("");
  const [defaultGstRate, setDefaultGstRate] = useState("0.10");
  const [gstPreset, setGstPreset] = useState("0.10");
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState("van");
  const [posSetupChoice, setPosSetupChoice] = useState<"record_only" | "stripe">("record_only");
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgName,
        abn: abn || null,
        defaultGstRate: Number(defaultGstRate),
        locationName,
        locationType,
        posSetupChoice,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      notify({
        tone: "error",
        title: "Onboarding failed",
        message:
          [payload.error, payload.detail].filter(Boolean).join(" · ") ||
          "Unable to complete onboarding.",
      });
      setLoading(false);
      return;
    }

    window.location.href = posSetupChoice === "stripe" ? "/settings/pos" : "/dashboard";
  };

  const totalSteps = 6;
  const canContinue = () => {
    if (step === 0) return orgName.trim().length > 0;
    if (step === 1) return true;
    if (step === 2) return defaultGstRate.trim().length > 0;
    if (step === 3) return locationName.trim().length > 0;
    if (step === 4) return true;
    return true;
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
        <span>
          Step {step + 1} of {totalSteps}
        </span>
        <span className="h-px flex-1 bg-slate-800" />
      </div>

      {step === 0 ? (
        <label className="flex flex-col gap-2 text-sm">
          Company name
          <input
            type="text"
            value={orgName}
            onChange={(event) => setOrgName(event.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
            placeholder="Dagostino Electrical"
            required
          />
          <span className="text-xs text-slate-400">
            This is how your business appears on invoices, quotes, and staff invites.
          </span>
        </label>
      ) : null}

      {step === 1 ? (
        <label className="flex flex-col gap-2 text-sm">
          ABN (optional)
          <input
            type="text"
            value={abn}
            onChange={(event) => setAbn(event.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
            placeholder="11 222 333 444"
          />
          <span className="text-xs text-slate-400">
            Add it now if you want it auto-filled on tax invoices. You can add it later.
          </span>
        </label>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-3 text-sm">
          <label className="flex flex-col gap-2">
            Default GST rate (Australia)
            <SelectMenu
              value={gstPreset}
              onChange={(value) => {
                setGstPreset(value);
                if (value !== "custom") {
                  setDefaultGstRate(value);
                }
              }}
              options={[
                { value: "0.10", label: "10% GST (standard)" },
                { value: "0.00", label: "0% GST (GST-free)" },
                { value: "custom", label: "Custom rate" },
              ]}
              className="w-full"
            />
          </label>
          {gstPreset === "custom" ? (
            <label className="flex flex-col gap-2 text-sm">
              Custom GST rate (decimal)
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={defaultGstRate}
                onChange={(event) => setDefaultGstRate(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
              />
            </label>
          ) : null}
          <span className="text-xs text-slate-400">
            Used when creating POS sales and invoices. 10% GST is the standard rate in
            Australia.
          </span>
        </div>
      ) : null}

      {step === 3 ? (
        <label className="flex flex-col gap-2 text-sm">
          Primary stock location
          <input
            type="text"
            value={locationName}
            onChange={(event) => setLocationName(event.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
            placeholder="Van 1"
            required
          />
          <span className="text-xs text-slate-400">
            This is where most of your stock lives day-to-day (e.g. Van 1 or Warehouse).
            You can add job sites later per sale or invoice.
          </span>
        </label>
      ) : null}

      {step === 4 ? (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-sm">How do you want to take POS payments?</p>
          <button
            type="button"
            onClick={() => setPosSetupChoice("record_only")}
            className={`rounded-lg border px-3 py-2 text-left ${
              posSetupChoice === "record_only"
                ? "border-emerald-400 bg-emerald-400/10 text-emerald-100"
                : "border-slate-800 bg-slate-900 text-slate-200"
            }`}
          >
            <p className="font-semibold">Record payments only</p>
            <p className="text-xs text-slate-400">Use POS to log paid cash/bank/card manually.</p>
          </button>
          <button
            type="button"
            onClick={() => setPosSetupChoice("stripe")}
            className={`rounded-lg border px-3 py-2 text-left ${
              posSetupChoice === "stripe"
                ? "border-emerald-400 bg-emerald-400/10 text-emerald-100"
                : "border-slate-800 bg-slate-900 text-slate-200"
            }`}
          >
            <p className="font-semibold">Take real card payments (Stripe)</p>
            <p className="text-xs text-slate-400">
              You&apos;ll finish Stripe keys/webhook in Settings after setup.
            </p>
          </button>
        </div>
      ) : null}

      {step === 5 ? (
        <label className="flex flex-col gap-2 text-sm">
          Location type
          <SelectMenu
            value={locationType}
            onChange={(value) => setLocationType(value)}
            options={locationTypes.map((type) => ({
              value: type.value,
              label: type.label,
            }))}
            className="w-full"
          />
          <span className="text-xs text-slate-400">
            Helps filter inventory and reporting by the type of location.
          </span>
        </label>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0 || loading}
          className="rounded-lg border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-40"
        >
          Back
        </button>
        {step < totalSteps - 1 ? (
          <button
            type="button"
            onClick={() => setStep((current) => Math.min(totalSteps - 1, current + 1))}
            disabled={!canContinue() || loading}
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canContinue() || loading}
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create company"}
          </button>
        )}
      </div>
    </form>
  );
}
