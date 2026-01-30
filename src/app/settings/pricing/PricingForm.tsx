"use client";

import { useEffect, useMemo, useState } from "react";

type PricingItem = {
  id: string;
  name: string;
  price: number;
  type: "fixed" | "addon";
  isActive: boolean;
  sortOrder: number;
};

type PricingCategory = {
  id: string;
  name: string;
  sortOrder: number;
  items: PricingItem[];
};

type PricingProfile = {
  id: string;
  name: string;
  region: string | null;
  serviceAreaKm: number | null;
  travelSurchargeEnabled: boolean;
  travelSurchargeAmount: number | null;
  minimumCharge: number;
  calloutFirstHour: number;
  hourlyRate: number;
  intervalMinutes: number;
  intervalRate: number;
  afterHoursMultiplier: number;
  gstRate: number;
  pricesIncludeGst: boolean;
  complianceText: string | null;
  comparisonText: string | null;
  customerSummary: string | null;
  customerExplanation: string | null;
  categories: PricingCategory[];
};

const formatNumber = (value: number | null | undefined) =>
  value == null || Number.isNaN(value) ? "" : String(value);

export default function PricingForm() {
  const [profile, setProfile] = useState<PricingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [baseFields, setBaseFields] = useState({
    name: "",
    region: "",
    serviceAreaKm: "",
    travelSurchargeEnabled: false,
    travelSurchargeAmount: "",
    minimumCharge: "",
    calloutFirstHour: "",
    hourlyRate: "",
    intervalMinutes: "",
    intervalRate: "",
    afterHoursMultiplier: "",
    gstRate: "",
    pricesIncludeGst: true,
    complianceText: "",
    comparisonText: "",
    customerSummary: "",
    customerExplanation: "",
  });

  const [itemEdits, setItemEdits] = useState<Record<string, { price: string; isActive: boolean }>>(
    {}
  );

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/pricing");
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error ?? "Unable to load pricing profile.");
        return;
      }
      const nextProfile = payload.profile as PricingProfile;
      setProfile(nextProfile);
      setBaseFields({
        name: nextProfile.name ?? "",
        region: nextProfile.region ?? "",
        serviceAreaKm: formatNumber(nextProfile.serviceAreaKm),
        travelSurchargeEnabled: nextProfile.travelSurchargeEnabled ?? false,
        travelSurchargeAmount: formatNumber(nextProfile.travelSurchargeAmount),
        minimumCharge: formatNumber(nextProfile.minimumCharge),
        calloutFirstHour: formatNumber(nextProfile.calloutFirstHour),
        hourlyRate: formatNumber(nextProfile.hourlyRate),
        intervalMinutes: formatNumber(nextProfile.intervalMinutes),
        intervalRate: formatNumber(nextProfile.intervalRate),
        afterHoursMultiplier: formatNumber(nextProfile.afterHoursMultiplier),
        gstRate: formatNumber(nextProfile.gstRate),
        pricesIncludeGst: nextProfile.pricesIncludeGst ?? true,
        complianceText: nextProfile.complianceText ?? "",
        comparisonText: nextProfile.comparisonText ?? "",
        customerSummary: nextProfile.customerSummary ?? "",
        customerExplanation: nextProfile.customerExplanation ?? "",
      });

      const nextItemEdits: Record<string, { price: string; isActive: boolean }> = {};
      nextProfile.categories.forEach((category) => {
        category.items.forEach((item) => {
          nextItemEdits[item.id] = {
            price: formatNumber(item.price),
            isActive: item.isActive ?? true,
          };
        });
      });
      setItemEdits(nextItemEdits);
    } catch (err) {
      setError("Unable to load pricing profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const onSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const itemsPayload = Object.entries(itemEdits).map(([id, value]) => ({
      id,
      price: Number(value.price),
      isActive: value.isActive,
    }));

    try {
      const response = await fetch("/api/settings/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          ...baseFields,
          serviceAreaKm: baseFields.serviceAreaKm ? Number(baseFields.serviceAreaKm) : null,
          travelSurchargeAmount: baseFields.travelSurchargeAmount || null,
          minimumCharge: baseFields.minimumCharge,
          calloutFirstHour: baseFields.calloutFirstHour,
          hourlyRate: baseFields.hourlyRate,
          intervalMinutes: baseFields.intervalMinutes ? Number(baseFields.intervalMinutes) : null,
          intervalRate: baseFields.intervalRate,
          afterHoursMultiplier: baseFields.afterHoursMultiplier,
          gstRate: baseFields.gstRate,
          items: itemsPayload,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error ?? "Unable to save pricing.");
        return;
      }

      setSuccess("Pricing updated.");
      await loadProfile();
    } catch (err) {
      setError("Unable to save pricing.");
    } finally {
      setSaving(false);
    }
  };

  const categories = useMemo(() => profile?.categories ?? [], [profile]);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading pricing profile...</p>;
  }

  if (!profile) {
    return <p className="text-sm text-rose-400">Pricing profile unavailable.</p>;
  }

  const renderCategory = (type: "fixed" | "addon") =>
    categories
      .map((category) => ({
        ...category,
        items: category.items
          .filter((item) => item.type === type)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      }))
      .filter((category) => category.items.length);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Profile</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-100">{profile.name}</h2>
            <p className="text-sm text-slate-400">
              Pricing profiles define minimum charges, labour rates, and fixed-price services.
            </p>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save pricing"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
        {success ? <p className="mt-3 text-sm text-emerald-300">{success}</p> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <header className="mb-4 space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Base pricing</p>
            <h3 className="text-lg font-semibold text-slate-100">Minimums & labour</h3>
          </header>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-200">
              Profile name
              <input
                value={baseFields.name}
                onChange={(event) =>
                  setBaseFields((prev) => ({ ...prev, name: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-sm text-slate-200">
              Region
              <input
                value={baseFields.region}
                onChange={(event) =>
                  setBaseFields((prev) => ({ ...prev, region: event.target.value }))
                }
                placeholder="WA"
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-sm text-slate-200">
              Minimum charge (inc GST)
              <input
                value={baseFields.minimumCharge}
                onChange={(event) =>
                  setBaseFields((prev) => ({ ...prev, minimumCharge: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-sm text-slate-200">
              Call-out / first hour
              <input
                value={baseFields.calloutFirstHour}
                onChange={(event) =>
                  setBaseFields((prev) => ({ ...prev, calloutFirstHour: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-sm text-slate-200">
              Hourly rate
              <input
                value={baseFields.hourlyRate}
                onChange={(event) =>
                  setBaseFields((prev) => ({ ...prev, hourlyRate: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-sm text-slate-200">
              After-hours multiplier
              <input
                value={baseFields.afterHoursMultiplier}
                onChange={(event) =>
                  setBaseFields((prev) => ({ ...prev, afterHoursMultiplier: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-sm text-slate-200">
              Interval minutes
              <input
                value={baseFields.intervalMinutes}
                onChange={(event) =>
                  setBaseFields((prev) => ({ ...prev, intervalMinutes: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-sm text-slate-200">
              Interval rate
              <input
                value={baseFields.intervalRate}
                onChange={(event) =>
                  setBaseFields((prev) => ({ ...prev, intervalRate: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <header className="mb-4 space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Travel & tax</p>
            <h3 className="text-lg font-semibold text-slate-100">Service area & GST</h3>
          </header>
          <div className="grid gap-4">
            <label className="text-sm text-slate-200">
              Service area radius (km)
              <input
                value={baseFields.serviceAreaKm}
                onChange={(event) =>
                  setBaseFields((prev) => ({ ...prev, serviceAreaKm: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-sm text-slate-200">
              Travel surcharge enabled
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={baseFields.travelSurchargeEnabled}
                  onChange={(event) =>
                    setBaseFields((prev) => ({
                      ...prev,
                      travelSurchargeEnabled: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
                <span className="text-xs text-slate-400">Apply outside service area radius</span>
              </div>
            </label>
            <label className="text-sm text-slate-200">
              Travel surcharge amount (inc GST)
              <input
                value={baseFields.travelSurchargeAmount}
                onChange={(event) =>
                  setBaseFields((prev) => ({ ...prev, travelSurchargeAmount: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-sm text-slate-200">
              GST rate (e.g., 0.10)
              <input
                value={baseFields.gstRate}
                onChange={(event) =>
                  setBaseFields((prev) => ({ ...prev, gstRate: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-sm text-slate-200">
              Prices include GST
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={baseFields.pricesIncludeGst}
                  onChange={(event) =>
                    setBaseFields((prev) => ({
                      ...prev,
                      pricesIncludeGst: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
                <span className="text-xs text-slate-400">Display prices as GST-inclusive</span>
              </div>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <header className="mb-4 space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Customer copy</p>
          <h3 className="text-lg font-semibold text-slate-100">Quote language</h3>
        </header>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="text-sm text-slate-200">
            Compliance notes
            <textarea
              value={baseFields.complianceText}
              onChange={(event) =>
                setBaseFields((prev) => ({ ...prev, complianceText: event.target.value }))
              }
              rows={5}
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="text-sm text-slate-200">
            Why our pricing is fair
            <textarea
              value={baseFields.customerExplanation}
              onChange={(event) =>
                setBaseFields((prev) => ({ ...prev, customerExplanation: event.target.value }))
              }
              rows={5}
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="text-sm text-slate-200">
            When comparing prices
            <textarea
              value={baseFields.comparisonText}
              onChange={(event) =>
                setBaseFields((prev) => ({ ...prev, comparisonText: event.target.value }))
              }
              rows={4}
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="text-sm text-slate-200">
            One-line summary
            <textarea
              value={baseFields.customerSummary}
              onChange={(event) =>
                setBaseFields((prev) => ({ ...prev, customerSummary: event.target.value }))
              }
              rows={4}
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <header className="mb-4 space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Fixed-price services</p>
          <h3 className="text-lg font-semibold text-slate-100">Quote-ready items</h3>
        </header>
        <div className="grid gap-6 lg:grid-cols-2">
          {renderCategory("fixed").map((category) => (
            <div
              key={category.id}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <p className="text-sm font-semibold text-slate-100">{category.name}</p>
              <div className="mt-4 space-y-3">
                {category.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-200">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={itemEdits[item.id]?.isActive ?? true}
                        onChange={(event) =>
                          setItemEdits((prev) => ({
                            ...prev,
                            [item.id]: {
                              price: prev[item.id]?.price ?? formatNumber(item.price),
                              isActive: event.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                      />
                      <input
                        value={itemEdits[item.id]?.price ?? formatNumber(item.price)}
                        onChange={(event) =>
                          setItemEdits((prev) => ({
                            ...prev,
                            [item.id]: {
                              price: event.target.value,
                              isActive: prev[item.id]?.isActive ?? true,
                            },
                          }))
                        }
                        className="w-24 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <header className="mb-4 space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Add-ons</p>
          <h3 className="text-lg font-semibold text-slate-100">Same-visit pricing</h3>
          <p className="text-sm text-slate-400">
            Add-ons apply only after minimum charge is met.
          </p>
        </header>
        <div className="grid gap-6 lg:grid-cols-2">
          {renderCategory("addon").map((category) => (
            <div
              key={category.id}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <p className="text-sm font-semibold text-slate-100">{category.name}</p>
              <div className="mt-4 space-y-3">
                {category.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-200">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={itemEdits[item.id]?.isActive ?? true}
                        onChange={(event) =>
                          setItemEdits((prev) => ({
                            ...prev,
                            [item.id]: {
                              price: prev[item.id]?.price ?? formatNumber(item.price),
                              isActive: event.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                      />
                      <input
                        value={itemEdits[item.id]?.price ?? formatNumber(item.price)}
                        onChange={(event) =>
                          setItemEdits((prev) => ({
                            ...prev,
                            [item.id]: {
                              price: event.target.value,
                              isActive: prev[item.id]?.isActive ?? true,
                            },
                          }))
                        }
                        className="w-24 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
