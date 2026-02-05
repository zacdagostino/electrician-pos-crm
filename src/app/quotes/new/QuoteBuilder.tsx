"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SendQuotePrompt from "@/app/quotes/SendQuotePrompt";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";

type ServiceItem = {
  id: string;
  name: string;
  price: number;
};

type PricingProfile = {
  id: string;
  name: string;
  minimumCharge: number;
  travelSurchargeEnabled: boolean;
  travelSurchargeAmount: number | null;
  gstRate: number;
  pricesIncludeGst: boolean;
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
  serviceId?: string;
};

type QuoteExtra = {
  id: string;
  description: string;
  amount: number;
};

type CustomerResult = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

const formatRelativeTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 5000) return "Saved just now";
  if (diff < 60000) return `Saved ${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `Saved ${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `Saved ${Math.floor(diff / 3600000)}h ago`;
  return `Saved ${new Date(timestamp).toLocaleDateString()}`;
};

const computeTotals = (
  items: QuoteItem[],
  profile: PricingProfile | null,
  travelSurchargeApplied: boolean
) => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const minimumChargeApplied = false;
  const travelAmount =
    travelSurchargeApplied && profile?.travelSurchargeEnabled
      ? Number(profile?.travelSurchargeAmount ?? 0)
      : 0;
  let totalBeforeTax = subtotal + travelAmount;
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

type QuoteBuilderProps = {
  mode?: "new" | "edit";
  quoteId?: string;
  activeJob?: {
    isActive: boolean;
    jobId?: string | null;
    jobStatus?: string | null;
  };
  onSaved?: (quoteId: string) => void;
  initialQuote?: {
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
      type: QuoteItem["type"] | string;
      quantity: number;
      unitPrice: number;
      pricingItemId?: string | null;
    }>;
  };
};

export default function QuoteBuilder({
  mode = "new",
  quoteId,
  activeJob,
  initialQuote,
  onSaved,
}: QuoteBuilderProps) {
  const router = useRouter();
  const isEditMode = mode === "edit";
  const [profile, setProfile] = useState<PricingProfile | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { notify } = useToast();
  const { confirm } = useConfirm();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const customerNameRef = useRef<HTMLInputElement | null>(null);
  const siteLine1Ref = useRef<HTMLInputElement | null>(null);
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [siteLine1, setSiteLine1] = useState("");
  const [siteLine2, setSiteLine2] = useState("");
  const [siteSuburb, setSiteSuburb] = useState("");
  const [siteState, setSiteState] = useState("");
  const [sitePostcode, setSitePostcode] = useState("");
  const [addressResults, setAddressResults] = useState<
    Array<{ description: string; line1: string; suburb: string; state: string; postcode: string }>
  >([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSelectionLock, setAddressSelectionLock] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<
    Array<{
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      siteLine1: string | null;
      siteSuburb: string | null;
      siteState: string | null;
      sitePostcode: string | null;
      reasons: string[];
    }>
  >([]);
  const [skipDuplicateCheck, setSkipDuplicateCheck] = useState(false);
  const [forceNewCustomer, setForceNewCustomer] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [showDuplicateSuggestion, setShowDuplicateSuggestion] = useState(false);
  const [notes, setNotes] = useState("");

  const [travelSurchargeApplied, setTravelSurchargeApplied] = useState(false);
  const [items, setItems] = useState<QuoteItem[]>([]);

  const [search, setSearch] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualOpen, setManualOpen] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [travelSurchargeOverride, setTravelSurchargeOverride] = useState<string>("");
  const [extrasByItem, setExtrasByItem] = useState<Record<string, QuoteExtra[]>>({});
  const [extraDrafts, setExtraDrafts] = useState<
    Record<string, { description: string; amount: string }>
  >({});
  const [extraOpen, setExtraOpen] = useState<Record<string, boolean>>({});

  // Draft state for autosave
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [savedTickVisible, setSavedTickVisible] = useState(false);
  const savedTickTimeoutRef = useRef<number | null>(null);
  const [showSendPrompt, setShowSendPrompt] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(0); // used to refresh relative time display

  useEffect(() => {
    const interval = setInterval(() => setNowTick((v) => v + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (savedTickTimeoutRef.current) window.clearTimeout(savedTickTimeoutRef.current);
    };
  }, []);

  const searchParams = useSearchParams();
  const initialLoadRef = useRef(false);
  const lastDraftErrorRef = useRef(0);

  const notifyDraftError = (message: string) => {
    const now = Date.now();
    if (now - lastDraftErrorRef.current < 6000) return;
    lastDraftErrorRef.current = now;
    notify({ tone: "error", title: "Draft error", message });
  };

  const buildRedirectUrl = (nextQuoteId: string) => {
    const params = new URLSearchParams();
    params.set("highlight", nextQuoteId);
    params.set("toast", isEditMode ? "updated" : "created");
    if (isEditMode && activeJob?.isActive) {
      params.set("jobToast", "updated");
    }
    return `/quotes?${params.toString()}`;
  };

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const [profileResponse, servicesResponse] = await Promise.all([
          fetch("/api/settings/pricing"),
          fetch("/api/services"),
        ]);
        const payload = await profileResponse.json();
        const servicesPayload = await servicesResponse.json().catch(() => ({}));
        if (!profileResponse.ok) {
          notify({
            tone: "error",
            title: "Load failed",
            message: payload?.error ?? "Unable to load pricing profile.",
          });
          return;
        }
        const nextProfile = payload.profile as PricingProfile;
        setProfile({
          ...nextProfile,
          minimumCharge: Number(nextProfile.minimumCharge),
          travelSurchargeAmount:
            nextProfile.travelSurchargeAmount != null
              ? Number(nextProfile.travelSurchargeAmount)
              : null,
          gstRate: Number(nextProfile.gstRate),
        });
        if (servicesResponse.ok) {
          const serviceList = servicesPayload.services ?? [];
          setServices(
            serviceList
              .filter((service: { price: number | null }) => service.price != null)
              .map((service: { id: string; name: string; price: number | null }) => ({
                id: service.id,
                name: service.name,
                price: Number(service.price ?? 0),
              }))
          );
        } else {
          setServices([]);
        }
        if (!isEditMode) {
          setTravelSurchargeApplied(Boolean(nextProfile.travelSurchargeEnabled));
        }

        // If a draftId was passed in the URL, fetch and load it
        const paramDraft = searchParams?.get?.("draftId");
        if (!isEditMode && paramDraft) {
          try {
            const dresp = await fetch(`/api/quotes/drafts/${paramDraft}`);
            if (dresp.ok) {
              const pd = await dresp.json();
              const draft = pd?.draft;
              if (draft) {
                setDraftId(draft.id);
                setCustomerName(draft.customerName ?? "");
                setCustomerEmail(draft.customerEmail ?? "");
                setCustomerPhone(draft.customerPhone ?? "");
                setSiteLine1(draft.siteLine1 ?? "");
                setSiteLine2(draft.siteLine2 ?? "");
                setSiteSuburb(draft.siteSuburb ?? "");
                setSiteState(draft.siteState ?? "");
                setSitePostcode(draft.sitePostcode ?? "");
                setNotes(draft.notes ?? "");
                setTravelSurchargeApplied(Boolean(draft.travelSurchargeApplied));
                setDraftSavedAt(draft.updatedAt ? Date.parse(draft.updatedAt) : Date.now());

                // Load items
                const mappedItems: QuoteItem[] = (draft.items ?? []).map((it: any) => ({
                  id: it.id,
                  name: it.name,
                  type: it.type as QuoteItem["type"],
                  quantity: Number(it.quantity ?? 1),
                  unitPrice: Number(it.unitPrice ?? 0),
                  pricingItemId: it.pricingItemId ?? undefined,
                  serviceId: it.pricingItemId ?? undefined,
                }));
                setItems(mappedItems);
              }
            }
          } catch (err) {
            console.warn("Unable to load draft", err);
          }
        }
      } catch (err) {
        notify({ tone: "error", title: "Load failed", message: "Unable to load pricing profile." });
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, searchParams]);

  useEffect(() => {
    if (initialLoadRef.current || !initialQuote) return;
    initialLoadRef.current = true;
    setCustomerId(initialQuote.customerId ?? null);
    setCustomerName(initialQuote.customerName ?? "");
    setCustomerEmail(initialQuote.customerEmail ?? "");
    setCustomerPhone(initialQuote.customerPhone ?? "");
    setCustomerSearch(initialQuote.customerName ?? "");
    setSiteLine1(initialQuote.siteLine1 ?? "");
    setSiteLine2(initialQuote.siteLine2 ?? "");
    setSiteSuburb(initialQuote.siteSuburb ?? "");
    setSiteState(initialQuote.siteState ?? "");
    setSitePostcode(initialQuote.sitePostcode ?? "");
    setNotes(initialQuote.notes ?? "");
    setTravelSurchargeApplied(Boolean(initialQuote.travelSurchargeApplied));
    setItems(
      (initialQuote.items ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        type: (item.type as QuoteItem["type"]) ?? "labour",
        quantity: Number(item.quantity ?? 1),
        unitPrice: Number(item.unitPrice ?? 0),
        pricingItemId: item.pricingItemId ?? undefined,
        serviceId: item.pricingItemId ?? undefined,
      }))
    );
  }, [initialQuote]);

  useEffect(() => {
    const query = siteLine1.trim();
    if (addressSelectionLock) {
      setAddressSelectionLock(false);
      setAddressResults([]);
      setAddressLoading(false);
      return;
    }
    if (query.length < 3) {
      setAddressResults([]);
      setAddressLoading(false);
      return;
    }

    const handle = window.setTimeout(async () => {
      setAddressLoading(true);
      try {
        const response = await fetch(
          `/api/address/autocomplete?q=${encodeURIComponent(query)}`
        );
        const payload = await response.json().catch(() => ({}));
        setAddressResults(payload.suggestions ?? []);
      } catch (err) {
        setAddressResults([]);
      } finally {
        setAddressLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [siteLine1]);

  const applyAddress = (result: {
    line1: string;
    suburb: string;
    state: string;
    postcode: string;
  }) => {
    setAddressSelectionLock(true);
    setSiteLine1(result.line1 ?? "");
    setSiteSuburb(result.suburb ?? "");
    setSiteState(result.state ?? "");
    setSitePostcode(result.postcode ?? "");
    setAddressResults([]);
  };

  useEffect(() => {
    if (isEditMode || customerId || skipDuplicateCheck) {
      setDuplicateMatches([]);
      setShowDuplicateSuggestion(false);
      return;
    }

    const hasSignals =
      Boolean(customerEmail?.trim()) ||
      Boolean(customerPhone?.trim()) ||
      Boolean(siteLine1?.trim());

    if (!hasSignals || !customerName.trim()) {
      setDuplicateMatches([]);
      setShowDuplicateSuggestion(false);
      return;
    }

    const handle = window.setTimeout(async () => {
      setCheckingDuplicate(true);
      try {
        const response = await fetch("/api/customers/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            siteLine1,
            siteSuburb,
            siteState,
            sitePostcode,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok && payload.matches?.length) {
          setDuplicateMatches(payload.matches);
          setShowDuplicateSuggestion(true);
        } else {
          setDuplicateMatches([]);
          setShowDuplicateSuggestion(false);
        }
      } catch (err) {
        setDuplicateMatches([]);
        setShowDuplicateSuggestion(false);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 400);

    return () => window.clearTimeout(handle);
  }, [
    isEditMode,
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    siteLine1,
    siteSuburb,
    siteState,
    sitePostcode,
    skipDuplicateCheck,
  ]);

  useEffect(() => {
    const query = customerSearch.trim();
    if (query.length < 2) {
      setCustomerResults([]);
      setCustomerLoading(false);
      return;
    }

    setCustomerLoading(true);
    const handle = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/customers/search?q=${encodeURIComponent(query)}`
        );
        const payload = await response.json();
        if (response.ok) {
          setCustomerResults(payload.customers ?? []);
        } else {
          setCustomerResults([]);
        }
      } catch (err) {
        setCustomerResults([]);
      } finally {
        setCustomerLoading(false);
      }
    }, 200);

    return () => clearTimeout(handle);
  }, [customerSearch]);


  const availableItems = useMemo(() => {
    if (!profile) return [];
    const rawSearch = search.toLowerCase().trim();
    const normalizedSearch = rawSearch.replace(/\s+/g, "");
    const tokens = rawSearch.split(/\s+/).filter(Boolean);

    const levenshtein = (a: string, b: string) => {
      const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
      for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
      for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
      for (let i = 1; i <= a.length; i += 1) {
        for (let j = 1; j <= b.length; j += 1) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + cost
          );
        }
      }
      return matrix[a.length][b.length];
    };

    const fuzzyMatch = (text: string, query: string) => {
      if (!query) return true;
      if (text.includes(query)) return true;
      const distance = levenshtein(text, query);
      const similarity = 1 - distance / Math.max(text.length, query.length, 1);
      return similarity >= 0.72;
    };

    return services.filter((item) => {
        const name = item.name.toLowerCase();
        const normalizedName = name.replace(/\s+/g, "");
        if (!rawSearch) return true;
        if (normalizedName.includes(normalizedSearch)) return true;
        if (tokens.every((token) => name.includes(token))) return true;
        return fuzzyMatch(normalizedName, normalizedSearch);
      });
  }, [profile, search, services]);

  const extraLineItems = items.flatMap((item) =>
    (extrasByItem[item.id] ?? []).map((extra) => ({
      name: `${item.name} — ${extra.description}`,
      type: "adjustment" as const,
      quantity: 1,
      unitPrice: extra.amount,
    }))
  );

  // Create a new draft on the server
  const createDraft = async () => {
    setDraftSaving(true);
    try {
      const body = {
        customerId,
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
      };

      const response = await fetch("/api/quotes/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        let msg = response.statusText ?? "Unable to create draft";
        try {
          const body = await response.json().catch(() => null);
          if (body?.error) msg = body.error;
        } catch (err) {
          // ignore
        }
        notifyDraftError(msg);
        return null;
      }
      const payload = await response.json().catch(() => null);
      if (payload?.draftId) {
        setDraftId(payload.draftId);
        setDraftSavedAt(Date.now());

        // show a tick briefly
        setSavedTickVisible(true);
        if (savedTickTimeoutRef.current) window.clearTimeout(savedTickTimeoutRef.current);
        savedTickTimeoutRef.current = window.setTimeout(() => setSavedTickVisible(false), 2500);

        return payload.draftId;
      }
      notifyDraftError("Unable to create draft");
      return null;
    } catch (err) {
      // ignore: draft creation failure shouldn't block the UX
      console.warn("createDraft error", err);
      return null;
    } finally {
      setDraftSaving(false);
    }
  };

  // Update an existing draft (debounced by the caller)
  const updateDraft = async (id: string) => {
    setDraftSaving(true);
    try {
      const body = {
        customerId,
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
      };

      const response = await fetch(`/api/quotes/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setDraftSavedAt(Date.now());

        // show a tick briefly
        setSavedTickVisible(true);
        if (savedTickTimeoutRef.current) window.clearTimeout(savedTickTimeoutRef.current);
        savedTickTimeoutRef.current = window.setTimeout(() => setSavedTickVisible(false), 2500);
      } else {
        let msg = response.statusText ?? "Unable to save draft";
        try {
          const body = await response.json().catch(() => null);
          if (body?.error) msg = body.error;
        } catch (err) {
          // ignore
        }
        notifyDraftError(msg);
      }
    } catch (err) {
      console.warn("updateDraft error", err);
    } finally {
      setDraftSaving(false);
    }
  };

  const deleteDraft = async (id: string | null) => {
    if (!id) return;
    try {
      await fetch(`/api/quotes/drafts/${id}`, { method: "DELETE" });
      setDraftId(null);
    } catch (err) {
      console.warn("deleteDraft error", err);
    }
  };

  // Create draft when profile loads (so we have pricing defaults) or on mount if not already created
  useEffect(() => {
    if (isEditMode) return;
    if (!draftId && !loading && profile) {
      void createDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, loading, isEditMode]);

  // Auto-save draft when important fields change (debounced). If we don't yet have a draft, create one.
  useEffect(() => {
    if (isEditMode || loading) return;

    const handle = setTimeout(async () => {
      try {
        if (!draftId) {
          const id = await createDraft();
          if (id) {
            await updateDraft(id);
          }
        } else {
          await updateDraft(draftId);
        }
      } catch (err) {
        console.warn("autosave error", err);
        notifyDraftError("Autosave failed");
      }
    }, 900);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerName, customerEmail, customerPhone, siteLine1, siteLine2, siteSuburb, siteState, sitePostcode, notes, travelSurchargeApplied, items, extrasByItem, isEditMode]);

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

  const addPricingItem = (item: ServiceItem) => {
    setItems((prev) => {
      const existing = prev.find((line) => (line.serviceId ?? line.pricingItemId) === item.id);
      if (existing) {
        return prev.map((line) =>
          (line.serviceId ?? line.pricingItemId) === item.id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: item.name,
          type: "fixed",
          quantity: 1,
          unitPrice: Number(item.price),
          serviceId: item.id,
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
    notify({ tone: "success", title: "Added", message: `Added "${item.name}" to quote items.` });
  };

  const decrementPricingItem = (item: ServiceItem) => {
    setItems((prev) => {
      const existing = prev.find((line) => (line.serviceId ?? line.pricingItemId) === item.id);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((line) => (line.serviceId ?? line.pricingItemId) !== item.id);
      }
      return prev.map((line) =>
        (line.serviceId ?? line.pricingItemId) === item.id
          ? { ...line, quantity: Math.max(1, line.quantity - 1) }
          : line
      );
    });
  };

  const getCatalogQty = (catalogId: string) =>
    items.find((line) => (line.serviceId ?? line.pricingItemId) === catalogId)?.quantity ?? 0;

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

  const handleCustomerSelect = (customer: CustomerResult) => {
    setCustomerId(customer.id);
    setCustomerName(customer.name ?? "");
    setCustomerEmail(customer.email ?? "");
    setCustomerPhone(customer.phone ?? "");
    setCustomerSearch(customer.name ?? "");
    setCustomerResults([]);
  };

  const clearCustomerSelection = () => {
    setCustomerId(null);
    setCustomerResults([]);
  };

  const saveQuote = async () => {
    // Client-side validation
    if (!customerName.trim()) {
      notify({ tone: "error", title: "Missing customer", message: "Customer name is required." });
      customerNameRef.current?.focus();
      return;
    }
    if (!siteLine1.trim() && !customerId) {
      notify({ tone: "error", title: "Missing address", message: "Site address is required." });
      siteLine1Ref.current?.focus();
      return;
    }

    try {
      if (isEditMode && !quoteId) {
        notify({ tone: "error", title: "Missing quote", message: "Missing quote id." });
        return;
      }
      if (isEditMode && activeJob?.isActive) {
        const ok = await confirm({
          title: "Update job scope",
          message:
            "This quote is linked to an active job. Updating it will update the job scope. Continue?",
          confirmLabel: "Update quote",
          tone: "danger",
        });
        if (!ok) {
          return;
        }
      }

      setSaving(true);

      const response = await fetch(isEditMode ? `/api/quotes/${quoteId}` : "/api/quotes", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEditMode ? {} : { draftId, customerId, forceNewCustomer }),
          customerName,
          customerEmail,
          customerPhone,
          siteLine1: customerId && !siteLine1.trim() ? "" : siteLine1,
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

      // Try to parse server JSON safely
      let payload: any = null;
      try {
        payload = await response.json();
      } catch (parseErr) {
        payload = null;
      }

      if (!response.ok) {
        notify({
          tone: "error",
          title: "Save failed",
          message: payload?.error ?? `Server error (${response.status} ${response.statusText})`,
        });
        return;
      }

      // Delete the draft if one exists (best-effort)
      if (!isEditMode && draftId) {
        try {
          await deleteDraft(draftId);
        } catch (err) {
          console.warn("Failed to delete draft after save", err);
        }
      }

      const nextQuoteId = isEditMode ? payload?.quote?.id ?? quoteId : payload?.quoteId ?? null;
      if (nextQuoteId) {
        if (onSaved) {
          onSaved(nextQuoteId);
          return;
        }
        setSavedQuoteId(nextQuoteId);
        setShowSendPrompt(true);
      } else {
        router.push(buildRedirectUrl(quoteId ?? ""));
      }
    } catch (err) {
      notify({
        tone: "error",
        title: "Save failed",
        message: "Unable to save quote. Please check your connection and try again.",
      });
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
      {showSendPrompt && savedQuoteId ? (
        <SendQuotePrompt
          quoteId={savedQuoteId}
          customerEmail={customerEmail}
          customerName={customerName}
          onClose={() => {
            setShowSendPrompt(false);
            router.push(buildRedirectUrl(savedQuoteId));
          }}
          onSent={() => {
            setShowSendPrompt(false);
            router.push(buildRedirectUrl(savedQuoteId));
          }}
        />
      ) : null}
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
              services.length ? (
                <p className="text-sm text-slate-500">No matches.</p>
              ) : (
                <p className="text-sm text-slate-500">
                  No services yet. Add them in the Services page.
                </p>
              )
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
                <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-slate-100 sm:px-4 sm:py-3 sm:text-sm">
                  {(() => {
                    const parsedOverride = Number(travelSurchargeOverride);
                    const hasOverride =
                      travelSurchargeOverride.trim().length > 0 && !Number.isNaN(parsedOverride);
                    const effectiveTravelSurcharge = hasOverride
                      ? parsedOverride
                      : travelSurchargeAmount;

                    return (
                      <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-emerald-100">Travel surcharge</p>
                      <p className="text-[10px] text-emerald-200/80 sm:text-xs">Auto-added</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTravelSurchargeApplied(false)}
                      className="rounded-full border border-rose-400/70 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-rose-200 sm:text-[10px]"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-emerald-100 sm:text-sm">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-1">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/70">
                        Qty
                      </span>
                      <span>1</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-1">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/70">
                        Price
                      </span>
                      <input
                        aria-label="Travel surcharge price"
                        value={travelSurchargeOverride}
                        onChange={(event) => setTravelSurchargeOverride(event.target.value)}
                        placeholder={formatCurrency(travelSurchargeAmount)}
                        inputMode="decimal"
                        className="w-20 bg-transparent text-[11px] text-emerald-100 placeholder:text-emerald-200/70 outline-none sm:w-24 sm:text-sm"
                      />
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-1">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/70">
                        Total
                      </span>
                      <span>{formatCurrency(effectiveTravelSurcharge)}</span>
                    </div>
                  </div>
                      </>
                    );
                  })()}
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
                      className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 sm:px-4 sm:py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-500 sm:text-xs">{item.type}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-[10px] uppercase tracking-[0.2em] text-rose-300 sm:text-xs"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-200 sm:text-sm">
                        <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 sm:text-xs">
                            Qty.
                          </span>
                          <input
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(item.id, { quantity: Number(event.target.value) })
                            }
                            inputMode="numeric"
                            size={Math.max(String(item.quantity).length, 1)}
                            style={{ width: `${Math.max(String(item.quantity).length, 2)}ch` }}
                            className="flex-none min-w-[2ch] w-auto bg-transparent text-xs text-slate-100 outline-none sm:text-sm"
                          />
                        </label>
                        <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 sm:text-xs">
                            Price
                          </span>
                          <input
                            value={item.unitPrice}
                            onChange={(event) =>
                              updateItem(item.id, { unitPrice: Number(event.target.value) })
                            }
                            inputMode="decimal"
                            size={Math.max(String(item.unitPrice).length, 1)}
                            style={{ width: `${Math.max(String(item.unitPrice).length, 6)}ch` }}
                            className="flex-none min-w-[6ch] w-auto bg-transparent text-xs text-slate-100 outline-none sm:text-sm"
                          />
                        </label>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 sm:text-xs">
                            Total
                          </span>
                          <span>{formatCurrency(item.quantity * item.unitPrice + extrasSum)}</span>
                        </div>
                      </div>

                      {extraOpen[item.id] ? (
                        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 sm:p-3">
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
                              className="rounded-full border border-slate-800/70 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-slate-400 transition hover:bg-slate-950/60 hover:text-slate-200 sm:text-[10px]"
                            >
                              Hide
                            </button>
                          </div>
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
                        </div>
                      ) : (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExtraOpen((prev) => ({
                                ...prev,
                                [item.id]: true,
                              }))
                            }
                            className="rounded-full border border-slate-800/70 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-slate-400 transition hover:bg-slate-950/60 hover:text-slate-200 sm:text-[10px]"
                          >
                            Add extra
                          </button>
                        </div>
                      )}
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
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Customer
              </label>
              <p className="text-sm text-slate-400">Search for an existing customer above, or enter new customer details below. Selecting a customer will link their saved details to this quote.</p>
              <div className="relative">
                <input
                  placeholder="Search customers by name, email, or phone"
                  value={customerSearch}
                  onChange={(event) => {
                    setCustomerSearch(event.target.value);
                    if (customerId) setCustomerId(null);
                  }}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
                {customerLoading ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                    Searching…
                  </span>
                ) : null}
                {customerResults.length ? (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-lg">
                    {customerResults.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => handleCustomerSelect(customer)}
                        className="flex w-full flex-col gap-1 px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-900"
                      >
                        <span className="font-semibold">{customer.name}</span>
                        <span className="text-xs text-slate-400">
                          {customer.email ?? "No email"} · {customer.phone ?? "No phone"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {customerId ? (
                <div className="flex items-center justify-between rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                  <span>Selected customer linked to this quote.</span>
                  <button
                    type="button"
                    onClick={clearCustomerSelection}
                    className="rounded-full border border-emerald-300/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-200"
                  >
                    Clear
                  </button>
                </div>
              ) : null}
              {showDuplicateSuggestion && duplicateMatches.length ? (
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/70">
                        Possible match
                      </p>
                      <p className="mt-1 text-sm text-amber-100">
                        This client already exists. Use it?
                      </p>
                    </div>
                    {checkingDuplicate ? (
                      <span className="text-[10px] text-amber-200/70">Checking…</span>
                    ) : null}
                  </div>
                  <div className="mt-3 space-y-2">
                    {duplicateMatches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => {
                          setCustomerId(match.id);
                          setCustomerName(match.name ?? "");
                          setCustomerEmail(match.email ?? "");
                          setCustomerPhone(match.phone ?? "");
                          setCustomerSearch(match.name ?? "");
                          setSiteLine1(match.siteLine1 ?? "");
                          setSiteLine2("");
                          setSiteSuburb(match.siteSuburb ?? "");
                          setSiteState(match.siteState ?? "");
                          setSitePostcode(match.sitePostcode ?? "");
                          setCustomerResults([]);
                          setShowDuplicateSuggestion(false);
                          setSkipDuplicateCheck(true);
                          setForceNewCustomer(false);
                        }}
                        className="w-full rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-100 hover:bg-amber-500/20"
                      >
                        <p className="font-semibold">{match.name}</p>
                        <p className="text-[10px] text-amber-200/80">
                          {match.email ?? "No email"} · {match.phone ?? "No phone"}
                        </p>
                        <p className="text-[10px] text-amber-200/70">
                          {[match.siteLine1, match.siteSuburb, match.siteState, match.sitePostcode]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDuplicateSuggestion(false);
                      }}
                      className="rounded-lg border border-amber-400/40 px-3 py-1.5 text-[10px] font-semibold text-amber-100 hover:bg-amber-500/20"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDuplicateSuggestion(false);
                        setSkipDuplicateCheck(true);
                        setForceNewCustomer(true);
                      }}
                      className="rounded-lg border border-emerald-400/60 px-3 py-1.5 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/10"
                    >
                      Create new client
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="flex items-center my-2">
                <div className="flex-1 border-t border-slate-800" />
                <span className="mx-3 text-xs text-slate-500 uppercase tracking-[0.3em]">OR</span>
                <div className="flex-1 border-t border-slate-800" />
              </div>
              <details
                className={`rounded-xl border border-slate-800 bg-slate-950/40 p-4 transition-opacity ${
                  customerId ? "opacity-60" : "opacity-100"
                }`}
                open={!customerId}
              >
                <summary
                  className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500"
                >
                  Enter customer details
                  <span className="text-[10px]">▼</span>
                </summary>
                <p className="mt-2 text-xs text-slate-500">
                  {customerId
                    ? "Linked customer selected. Clear selection to edit details."
                    : "Enter customer details to create a new customer."}
                </p>
              </details>
            </div>
            <input
              placeholder="Customer name"
              value={customerName}
              onChange={(event) => {
                setCustomerName(event.target.value);
                if (customerId) setCustomerId(null);
              }}
              ref={customerNameRef}
              disabled={Boolean(customerId)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                placeholder="Customer email"
                value={customerEmail}
                onChange={(event) => {
                  setCustomerEmail(event.target.value);
                  if (customerId) setCustomerId(null);
                }}
                disabled={Boolean(customerId)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <input
                placeholder="Customer phone"
                value={customerPhone}
                onChange={(event) => {
                  setCustomerPhone(event.target.value);
                  if (customerId) setCustomerId(null);
                }}
                disabled={Boolean(customerId)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            <div className="relative">
              <input
                placeholder="Street address"
                value={siteLine1}
                onChange={(event) => setSiteLine1(event.target.value)}
                ref={siteLine1Ref}
                disabled={Boolean(customerId)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
              {addressLoading ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  Searching…
                </span>
              ) : null}
              {addressResults.length ? (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-lg">
                  {addressResults.map((result) => (
                    <button
                      key={result.description}
                      type="button"
                      onClick={() => applyAddress(result)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-900"
                    >
                      <span className="text-slate-500">📍</span>
                      <span className="font-semibold">{result.description}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <input
              placeholder="Unit / suite (optional)"
              value={siteLine2}
              onChange={(event) => setSiteLine2(event.target.value)}
              disabled={Boolean(customerId)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <input
                placeholder="Suburb"
                value={siteSuburb}
                onChange={(event) => setSiteSuburb(event.target.value)}
                disabled={Boolean(customerId)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <input
                placeholder="State"
                value={siteState}
                onChange={(event) => setSiteState(event.target.value)}
                disabled={Boolean(customerId)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <input
                placeholder="Postcode"
                value={sitePostcode}
                onChange={(event) => setSitePostcode(event.target.value)}
                disabled={Boolean(customerId)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
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
          {!isEditMode ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <p className="text-xs text-slate-500 inline-flex items-center gap-2">
                  {draftId ? (
                    draftSaving ? (
                      <>
                        <svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        <span>Saving draft…</span>
                      </>
                    ) : draftSavedAt ? (
                      <>
                        {savedTickVisible ? (
                          <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path fill="currentColor" d="M9.29 16.29 4.7 11.7 6.11 10.29 9.29 13.46 17.89 4.86 19.3 6.27z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path fill="currentColor" d="M9.29 16.29 4.7 11.7 6.11 10.29 9.29 13.46 17.89 4.86 19.3 6.27z" />
                          </svg>
                        )}
                        <span>{formatRelativeTime(draftSavedAt)}</span>
                      </>
                    ) : (
                      "Draft saved"
                    )
                  ) : (
                    "Draft not created yet"
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (draftSaving) return;

                    // optimistic timestamp and tick so UI feels immediate
                    const optimistic = Date.now();
                    setDraftSavedAt(optimistic);
                    setSavedTickVisible(true);

                    if (draftId) {
                      try {
                        await updateDraft(draftId);
                      } catch (err) {
                        // show error and clear optimistic tick
                        notifyDraftError("Unable to save draft");
                        setSavedTickVisible(false);
                      }
                    } else {
                      try {
                        const id = await createDraft();
                        if (id) {
                          // make sure totals update on server
                          await updateDraft(id);
                        }
                      } catch (err) {
                        notifyDraftError("Unable to save draft");
                        setSavedTickVisible(false);
                      }
                    }
                  }}
                  disabled={draftSaving}
                  className="rounded-full border border-slate-700/50 bg-slate-900/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-200 disabled:opacity-50"
                >
                  {draftSaving ? "Saving..." : "Save draft"}
                </button>

                {draftId ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteDraft(draftId);
                      setDraftId(null);
                      setDraftSavedAt(null);
                      setSavedTickVisible(false);
                    }}
                    className="rounded-full border border-rose-400/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-rose-200"
                  >
                    Discard
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={saveQuote}
            disabled={saving}
            className="mt-4 w-full rounded-lg border border-emerald-400/60 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
          >
            {saving ? "Saving..." : isEditMode ? "Update quote" : "Save quote"}
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
