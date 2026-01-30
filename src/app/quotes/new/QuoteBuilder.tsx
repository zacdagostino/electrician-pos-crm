"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PricingItem = {
  id: string;
  name: string;
  price: number;
  type: "fixed" | "addon";
  isActive: boolean;
};

type PricingCategory = {
  id: string;
  name: string;
  items: PricingItem[];
};

type PricingProfile = {
  id: string;
  name: string;
  minimumCharge: number;
  travelSurchargeEnabled: boolean;
  travelSurchargeAmount: number | null;
  gstRate: number;
  pricesIncludeGst: boolean;
  categories: PricingCategory[];
  customerSummary?: string | null;
  customerExplanation?: string | null;
  comparisonText?: string | null;
  complianceText?: string | null;
};

type QuoteItem = {
  id: string;
  name: string;
  type: "fixed" | "addon" | "labour" | "adjustment";
  quantity: number;
  unitPrice: number;
  pricingItemId?: string;
};

type QuoteExtra = {
  id: string;
  description: string;
  amount: number;
};

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

const computeTotals = (
  items: QuoteItem[],
  profile: PricingProfile | null,
  travelSurchargeApplied: boolean
) => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const minimumCharge = profile?.minimumCharge ?? 0;
  const minimumChargeApplied = subtotal < minimumCharge;
  const travelAmount =
    travelSurchargeApplied && profile?.travelSurchargeEnabled
      ? Number(profile?.travelSurchargeAmount ?? 0)
      : 0;
  let totalBeforeTax = (minimumChargeApplied ? minimumCharge : subtotal) + travelAmount;
  const gstRate = profile?.gstRate ?? 0.1;
  let gstAmount = 0;
  let total = totalBeforeTax;

  if (profile?.pricesIncludeGst) {
    gstAmount = totalBeforeTax - totalBeforeTax / (1 + gstRate);
  } else {
    gstAmount = totalBeforeTax * gstRate;
    total = totalBeforeTax + gstAmount;
  }

  return { subtotal, total, gstAmount, minimumChargeApplied, travelAmount };
};

export default function QuoteBuilder() {
  const router = useRouter();
  const [profile, setProfile] = useState<PricingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [siteLine1, setSiteLine1] = useState("");
  const [siteLine2, setSiteLine2] = useState("");
  const [siteSuburb, setSiteSuburb] = useState("");
  const [siteState, setSiteState] = useState("");
  const [sitePostcode, setSitePostcode] = useState("");
  const [notes, setNotes] = useState("");

  const [travelSurchargeApplied, setTravelSurchargeApplied] = useState(false);
  const [items, setItems] = useState<QuoteItem[]>([]);

  const [search, setSearch] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualOpen, setManualOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [travelSurchargeOverride, setTravelSurchargeOverride] = useState<string>("");
  const [extrasByItem, setExtrasByItem] = useState<Record<string, QuoteExtra[]>>({});
  const [extraDrafts, setExtraDrafts] = useState<
    Record<string, { description: string; amount: string }>
  >({});
  const [extraOpen, setExtraOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
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
        const normalizedCategories = nextProfile.categories.map((category) => ({
          ...category,
          items: category.items.map((item) => ({
            ...item,
            price: Number(item.price),
          })),
        }));
        setProfile({
          ...nextProfile,
          categories: normalizedCategories,
          minimumCharge: Number(nextProfile.minimumCharge),
          travelSurchargeAmount:
            nextProfile.travelSurchargeAmount != null
              ? Number(nextProfile.travelSurchargeAmount)
              : null,
          gstRate: Number(nextProfile.gstRate),
        });
        setTravelSurchargeApplied(Boolean(nextProfile.travelSurchargeEnabled));
      } catch (err) {
        setError("Unable to load pricing profile.");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);


  const availableItems = useMemo(() => {
    if (!profile) return [];
    return profile.categories
      .flatMap((category) =>
        category.items
          .filter((item) => item.isActive)
          .map((item) => ({ ...item, category: category.name }))
      )
      .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  }, [profile, search]);

  const extraLineItems = items.flatMap((item) =>
    (extrasByItem[item.id] ?? []).map((extra) => ({
      name: `${item.name} — ${extra.description}`,
      type: "adjustment" as const,
      quantity: 1,
      unitPrice: extra.amount,
    }))
  );

  const derivedProfile =
    profile && travelSurchargeOverride.trim()
      ? {
          ...profile,
          travelSurchargeAmount: Number(travelSurchargeOverride),
        }
      : profile;

  const totals = computeTotals(
    [...items, ...extraLineItems],
    derivedProfile,
    travelSurchargeApplied
  );
  const travelSurchargeAmount =
    travelSurchargeApplied && derivedProfile?.travelSurchargeEnabled
      ? Number(derivedProfile?.travelSurchargeAmount ?? 0)
      : 0;

  const addPricingItem = (item: PricingItem) => {
    setItems((prev) => {
      const existing = prev.find((line) => line.pricingItemId === item.id);
      if (existing) {
        return prev.map((line) =>
          line.pricingItemId === item.id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: item.name,
          type: item.type,
          quantity: 1,
          unitPrice: Number(item.price),
          pricingItemId: item.id,
        },
      ];
    });
    setAddedIds((prev) => new Set(prev).add(item.id));
    setRecentlyAdded((prev) => new Set(prev).add(item.id));
    setTimeout(() => {
      setRecentlyAdded((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 700);
    setToast(`Added "${item.name}" to quote items.`);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1800);
    setTimeout(() => setToast(null), 2200);
  };

  const decrementPricingItem = (item: PricingItem) => {
    setItems((prev) => {
      const existing = prev.find((line) => line.pricingItemId === item.id);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((line) => line.pricingItemId !== item.id);
      }
      return prev.map((line) =>
        line.pricingItemId === item.id
          ? { ...line, quantity: Math.max(1, line.quantity - 1) }
          : line
      );
    });
  };

  const getCatalogQty = (pricingItemId: string) =>
    items.find((line) => line.pricingItemId === pricingItemId)?.quantity ?? 0;

  const addManualItem = () => {
    if (!manualName.trim()) return;
    const price = Number(manualPrice);
    const quantity = Number(manualQty);
    if (Number.isNaN(price) || Number.isNaN(quantity)) return;

    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: manualName.trim(),
        type: "labour",
        quantity,
        unitPrice: price,
      },
    ]);
    setManualName("");
    setManualPrice("");
    setManualQty("1");
    setManualOpen(false);
  };

  const addExtra = (itemId: string) => {
    const draft = extraDrafts[itemId];
    if (!draft?.description?.trim()) return;
    const amount = Number(draft.amount);
    if (Number.isNaN(amount) || amount <= 0) return;

    setExtrasByItem((prev) => ({
      ...prev,
      [itemId]: [
        ...(prev[itemId] ?? []),
        { id: crypto.randomUUID(), description: draft.description.trim(), amount },
      ],
    }));
    setExtraDrafts((prev) => ({
      ...prev,
      [itemId]: { description: "", amount: "" },
    }));
  };

  const removeExtra = (itemId: string, extraId: string) => {
    setExtrasByItem((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? []).filter((extra) => extra.id !== extraId),
    }));
  };

  const updateItem = (id: string, updates: Partial<QuoteItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setExtrasByItem((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setExtraDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setExtraOpen((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveQuote = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          siteLine1,
          siteLine2,
          siteSuburb,
          siteState,
          sitePostcode,
          notes,
          travelSurchargeApplied,
          items: [
            ...items.map((item) => ({
              name: item.name,
              type: item.type,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              pricingItemId: item.pricingItemId,
            })),
            ...extraLineItems.map((extra) => ({
              name: extra.name,
              type: extra.type,
              quantity: extra.quantity,
              unitPrice: extra.unitPrice,
            })),
          ],
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error ?? "Unable to save quote.");
        return;
      }

      router.push("/quotes");
    } catch (err) {
      setError("Unable to save quote.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-400">Loading pricing profile...</p>;
  }

  if (!profile) {
    return <p className="text-sm text-rose-400">Pricing profile unavailable.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 1</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-100">What’s the job?</h2>
            <p className="text-sm text-slate-400">
              Add fixed services, add-ons, or labour to build the scope.
            </p>
          </div>
          <div className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-xs text-slate-400">
            {items.length} items
          </div>
        </div>

        <div className="mt-6 grid gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Add from catalog</p>
          <input
            placeholder="Search services..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mt-3 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <div className="mt-4 max-h-64 overflow-y-auto space-y-3">
            {availableItems.map((item) => {
              const qty = getCatalogQty(item.id);
              const isRecentlyAdded = recentlyAdded.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`relative flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm text-slate-200 transition-all duration-300 ${
                    qty > 0
                      ? "border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
                      : "border-slate-800 bg-slate-950"
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-emerald-300/10 to-transparent transition-opacity duration-700 ${
                      qty > 0 ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                  <span className="flex items-center gap-3 text-xs text-emerald-300">
                    {formatCurrency(Number(item.price))}
                    {qty > 0 ? (
                      <span className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950 px-1 py-0.5 text-slate-200">
                        <button
                          type="button"
                          onClick={() => decrementPricingItem(item)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-slate-300 hover:border-emerald-400/50"
                        >
                          -
                        </button>
                        <span className="min-w-[1.5rem] text-center text-xs text-slate-300">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => addPricingItem(item)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-slate-300 hover:border-emerald-400/50"
                        >
                          +
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addPricingItem(item)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-slate-300 hover:border-emerald-400/50"
                      >
                        +
                      </button>
                    )}
                    {qty > 0 ? (
                      isRecentlyAdded ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-400 text-slate-900">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4 transition-transform duration-300"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path
                              d="M5 13l4 4L19 7"
                              className="tick-draw"
                            />
                          </svg>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => decrementPricingItem(item)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-rose-400/70 bg-rose-500 text-slate-100 hover:bg-rose-400"
                          aria-label="Remove item"
                        >
                          -
                        </button>
                      )
                    ) : null}
                  </span>
                </div>
              );
            })}
            {!availableItems.length ? (
              <p className="text-sm text-slate-500">No matches.</p>
            ) : null}
          </div>
        </div>

        <div className="relative flex items-center justify-center py-2">
          <div className="h-px w-full bg-slate-800" />
          <span className="absolute rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">
            or
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Manual line item</p>
            <button
              type="button"
              onClick={() => setManualOpen((prev) => !prev)}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-950"
            >
              {manualOpen ? "Hide" : "Add custom"}
            </button>
          </div>
          {manualOpen ? (
            <>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1.3fr_0.6fr_0.4fr]">
                <input
                  placeholder="Item name"
                  value={manualName}
                  onChange={(event) => setManualName(event.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  placeholder="Unit price"
                  value={manualPrice}
                  onChange={(event) => setManualPrice(event.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  placeholder="Qty"
                  value={manualQty}
                  onChange={(event) => setManualQty(event.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <button
                type="button"
                onClick={addManualItem}
                className="mt-3 rounded-lg border border-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-950"
              >
                Add line item
              </button>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Add one-off labour or custom parts not in your catalog.
            </p>
          )}
        </div>

        <div className="relative flex items-center justify-center py-2">
          <div className="h-px w-full bg-slate-800" />
          <span className="absolute rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">
            quote items
          </span>
        </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Quote items</p>
            <div className="mt-4 space-y-3">
              {travelSurchargeAmount > 0 ? (
                <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-emerald-100">Travel surcharge</p>
                      <p className="text-xs text-emerald-200/80">Auto-added</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={travelSurchargeOverride}
                        onChange={(event) => setTravelSurchargeOverride(event.target.value)}
                        placeholder={formatCurrency(travelSurchargeAmount)}
                        className="w-24 rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-100 placeholder:text-emerald-200/70"
                      />
                      <button
                        type="button"
                        onClick={() => setTravelSurchargeApplied(false)}
                        className="rounded-full border border-rose-400/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-rose-200"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                      Qty 1
                    </div>
                    <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                      {formatCurrency(
                        travelSurchargeOverride
                          ? Number(travelSurchargeOverride)
                          : travelSurchargeAmount
                      )}
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                      <span>Line total</span>
                      <span>{formatCurrency(travelSurchargeAmount)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setTravelSurchargeApplied(true)}
                  className="w-full rounded-xl border border-dashed border-emerald-400/40 bg-emerald-500/5 px-4 py-3 text-left text-sm text-emerald-200 hover:bg-emerald-500/10"
                >
                  + Add travel surcharge
                </button>
              )}
              {items.length ? (
                items.map((item) => {
                  const extras = extrasByItem[item.id] ?? [];
                  const extrasSum = extras.reduce((sum, extra) => sum + extra.amount, 0);
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-500">{item.type}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-xs uppercase tracking-[0.2em] text-rose-300"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <input
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.id, { quantity: Number(event.target.value) })
                          }
                          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                        />
                        <input
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(item.id, { unitPrice: Number(event.target.value) })
                          }
                          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                        />
                        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                          <span>Item total</span>
                          <span>
                            {formatCurrency(item.quantity * item.unitPrice + extrasSum)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            Extra costs
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setExtraOpen((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                            className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-200"
                          >
                            {extraOpen[item.id] ? "Hide" : "Add extra"}
                          </button>
                        </div>
                        {extraOpen[item.id] ? (
                          <>
                            <div className="mt-2 space-y-2">
                              {extras.length ? (
                                extras.map((extra) => (
                                  <div
                                    key={extra.id}
                                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                                  >
                                    <span className="truncate">{extra.description}</span>
                                    <span className="flex items-center gap-3">
                                      {formatCurrency(extra.amount)}
                                      <button
                                        type="button"
                                        onClick={() => removeExtra(item.id, extra.id)}
                                        className="text-[10px] uppercase tracking-[0.2em] text-rose-300"
                                      >
                                        Remove
                                      </button>
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-slate-500">No extra costs added.</p>
                              )}
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-[1.4fr_0.6fr_auto]">
                              <input
                                placeholder="Extra description"
                                value={extraDrafts[item.id]?.description ?? ""}
                                onChange={(event) =>
                                  setExtraDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      description: event.target.value,
                                      amount: prev[item.id]?.amount ?? "",
                                    },
                                  }))
                                }
                                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                              />
                              <input
                                placeholder="Amount"
                                value={extraDrafts[item.id]?.amount ?? ""}
                                onChange={(event) =>
                                  setExtraDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      description: prev[item.id]?.description ?? "",
                                      amount: event.target.value,
                                    },
                                  }))
                                }
                                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                              />
                              <button
                                type="button"
                                onClick={() => addExtra(item.id)}
                                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-950"
                              >
                                Add
                              </button>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">No quote items yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 2</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-100">Who & where</h2>
          <div className="mt-4 grid gap-4">
            <input
              placeholder="Customer name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                placeholder="Customer email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
              <input
                placeholder="Customer phone"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <input
              placeholder="Street address"
              value={siteLine1}
              onChange={(event) => setSiteLine1(event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <input
              placeholder="Unit / suite (optional)"
              value={siteLine2}
              onChange={(event) => setSiteLine2(event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <input
                placeholder="Suburb"
                value={siteSuburb}
                onChange={(event) => setSiteSuburb(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
              <input
                placeholder="State"
                value={siteState}
                onChange={(event) => setSiteState(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
              <input
                placeholder="Postcode"
                value={sitePostcode}
                onChange={(event) => setSitePostcode(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={travelSurchargeApplied}
                onChange={(event) => setTravelSurchargeApplied(event.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950"
              />
              Apply travel surcharge
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 3</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-100">Review & save</h2>
          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Quote summary</p>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              {travelSurchargeAmount > 0 ? (
                <div className="flex items-center justify-between rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-emerald-100">
                  <span>Travel surcharge</span>
                  <span>{formatCurrency(travelSurchargeAmount)}</span>
                </div>
              ) : null}
              {items.length ? (
                items.map((item) => {
                  const extras = extrasByItem[item.id] ?? [];
                  const extrasSum = extras.reduce((sum, extra) => sum + extra.amount, 0);
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-100">{item.name}</span>
                        <span>
                          {formatCurrency(item.quantity * item.unitPrice + extrasSum)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </p>
                      {extras.length ? (
                        <div className="mt-2 space-y-1 text-xs text-slate-400">
                          {extras.map((extra) => (
                            <div key={extra.id} className="flex items-center justify-between">
                              <span>{extra.description}</span>
                              <span>{formatCurrency(extra.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">No quote items yet.</p>
              )}
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-200">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.minimumChargeApplied ? (
              <div className="flex items-center justify-between text-amber-300">
                <span>Minimum charge applied</span>
                <span>{formatCurrency(profile.minimumCharge)}</span>
              </div>
            ) : null}
            {travelSurchargeApplied && profile.travelSurchargeEnabled ? (
              <div className="flex items-center justify-between">
                <span>Travel surcharge</span>
                <span>{formatCurrency(totals.travelAmount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span>GST</span>
              <span>{formatCurrency(totals.gstAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-slate-100">
              <span>Total</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Quote notes</p>
            <textarea
              rows={4}
              placeholder="Add scope notes or exclusions..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-3 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
          <button
            type="button"
            onClick={saveQuote}
            disabled={saving}
            className="mt-4 w-full rounded-lg border border-emerald-400/60 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save quote"}
          </button>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Quote copy</p>
          <p className="mt-3">{profile.customerSummary}</p>
          <p className="mt-3 text-slate-400">{profile.customerExplanation}</p>
          <p className="mt-3 text-slate-400">{profile.comparisonText}</p>
          <p className="mt-3 text-slate-400">{profile.complianceText}</p>
        </div>
      </section>
      {toast ? (
        <div
          className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full border border-emerald-400/50 bg-slate-950 px-5 py-2 text-xs font-semibold text-emerald-200 shadow-lg transition-all duration-300 ${
            toastVisible ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
          }`}
        >
          {toast}
        </div>
      ) : null}
      <style jsx>{`
        @keyframes tick-draw {
          from {
            stroke-dashoffset: 20;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .tick-draw {
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
          animation: tick-draw 300ms ease forwards;
        }
      `}</style>
    </div>
  );
}
