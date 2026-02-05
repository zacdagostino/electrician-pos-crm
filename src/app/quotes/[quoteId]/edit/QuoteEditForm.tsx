"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

type QuoteItem = {
  id: string;
  name: string;
  type: "fixed" | "addon" | "labour" | "adjustment";
  quantity: number;
  unitPrice: number;
  pricingItemId?: string | null;
};

type QuoteEditFormProps = {
  quote: {
    id: string;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    siteLine1: string;
    siteLine2: string | null;
    siteSuburb: string | null;
    siteState: string | null;
    sitePostcode: string | null;
    travelSurchargeApplied: boolean;
    notes: string | null;
    items: Array<{
      id: string;
      name: string;
      type: string;
      quantity: any;
      unitPrice: any;
      pricingItemId?: string | null;
    }>;
  };
};

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

export default function QuoteEditForm({ quote }: QuoteEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { notify } = useToast();

  const [customerName, setCustomerName] = useState(quote.customerName ?? "");
  const [customerEmail, setCustomerEmail] = useState(quote.customerEmail ?? "");
  const [customerPhone, setCustomerPhone] = useState(quote.customerPhone ?? "");
  const [siteLine1, setSiteLine1] = useState(quote.siteLine1 ?? "");
  const [siteLine2, setSiteLine2] = useState(quote.siteLine2 ?? "");
  const [siteSuburb, setSiteSuburb] = useState(quote.siteSuburb ?? "");
  const [siteState, setSiteState] = useState(quote.siteState ?? "");
  const [sitePostcode, setSitePostcode] = useState(quote.sitePostcode ?? "");
  const [travelSurchargeApplied, setTravelSurchargeApplied] = useState(
    Boolean(quote.travelSurchargeApplied)
  );
  const [notes, setNotes] = useState(quote.notes ?? "");

  const [items, setItems] = useState<QuoteItem[]>(
    quote.items.map((item) => ({
      id: item.id,
      name: item.name,
      type: (item.type as QuoteItem["type"]) ?? "labour",
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.unitPrice ?? 0),
      pricingItemId: item.pricingItemId ?? null,
    }))
  );

  const addLineItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "Custom item",
        type: "labour",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const updateItem = (id: string, updates: Partial<QuoteItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
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
          travelSurchargeApplied,
          notes,
          items: items.map((item) => ({
            name: item.name,
            type: item.type,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            pricingItemId: item.pricingItemId ?? null,
          })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify({
          tone: "error",
          title: "Update failed",
          message: payload.error ?? "Unable to update quote.",
        });
        return;
      }
      notify({ tone: "success", title: "Quote updated", message: "Changes saved." });
      router.push(`/quotes/${quote.id}`);
    } catch (err) {
      notify({ tone: "error", title: "Update failed", message: "Unable to update quote." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Customer & site</p>
        <div className="mt-4 grid gap-4">
          <input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Customer name"
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              placeholder="Customer email"
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <input
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="Customer phone"
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <input
            value={siteLine1}
            onChange={(event) => setSiteLine1(event.target.value)}
            placeholder="Street address"
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <input
            value={siteLine2}
            onChange={(event) => setSiteLine2(event.target.value)}
            placeholder="Unit / suite"
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <input
              value={siteSuburb}
              onChange={(event) => setSiteSuburb(event.target.value)}
              placeholder="Suburb"
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <input
              value={siteState}
              onChange={(event) => setSiteState(event.target.value)}
              placeholder="State"
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <input
              value={sitePostcode}
              onChange={(event) => setSitePostcode(event.target.value)}
              placeholder="Postcode"
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
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes"
            rows={4}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Quote items</p>
          <button
            type="button"
            onClick={addLineItem}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-950"
          >
            Add item
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <input
                  value={item.name}
                  onChange={(event) => updateItem(item.id, { name: event.target.value })}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
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
                  <span>Line total</span>
                  <span>{formatCurrency(item.quantity * item.unitPrice)}</span>
                </div>
              </div>
            </div>
          ))}
          {!items.length ? <p className="text-sm text-slate-500">No items yet.</p> : null}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-200">
          <span>Estimated subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-4 w-full rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </section>
    </div>
  );
}
