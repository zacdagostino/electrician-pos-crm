"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

type ClientEditFormProps = {
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    siteLine1?: string | null;
    siteLine2?: string | null;
    siteSuburb?: string | null;
    siteState?: string | null;
    sitePostcode?: string | null;
  };
};

export default function ClientEditForm({ client }: ClientEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { notify } = useToast();

  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [siteLine1, setSiteLine1] = useState(client.siteLine1 ?? "");
  const [siteLine2, setSiteLine2] = useState(client.siteLine2 ?? "");
  const [siteSuburb, setSiteSuburb] = useState(client.siteSuburb ?? "");
  const [siteState, setSiteState] = useState(client.siteState ?? "");
  const [sitePostcode, setSitePostcode] = useState(client.sitePostcode ?? "");
  const [addressResults, setAddressResults] = useState<
    Array<{ description: string; line1: string; suburb: string; state: string; postcode: string }>
  >([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSelectionLock, setAddressSelectionLock] = useState(false);

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

  const save = async () => {
    setSaving(true);

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          siteLine1,
          siteLine2,
          siteSuburb,
          siteState,
          sitePostcode,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify({
          tone: "error",
          title: "Update failed",
          message: payload.error ?? "Unable to update client.",
        });
        return;
      }
      notify({ tone: "success", title: "Client updated", message: "Changes saved." });
      router.push(`/clients/${client.id}`);
      router.refresh();
    } catch (err) {
      notify({ tone: "error", title: "Update failed", message: "Unable to update client." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Client details</p>
      <div className="mt-4 grid gap-4">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Client name"
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Phone number"
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
        <div className="relative">
          <input
            value={siteLine1}
            onChange={(event) => setSiteLine1(event.target.value)}
            placeholder="Street address"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
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
                  onClick={() => {
                    setAddressSelectionLock(true);
                    setSiteLine1(result.line1 ?? "");
                    setSiteSuburb(result.suburb ?? "");
                    setSiteState(result.state ?? "");
                    setSitePostcode(result.postcode ?? "");
                    setAddressResults([]);
                  }}
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
          value={siteLine2}
          onChange={(event) => setSiteLine2(event.target.value)}
          placeholder="Unit / suite (optional)"
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
  );
}
