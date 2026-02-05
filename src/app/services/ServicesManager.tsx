"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";

type Service = {
  id: string;
  name: string;
  price: number | null;
};

const formatMoney = (value: number | null) =>
  value == null || Number.isNaN(value) ? "" : value.toFixed(2);

export default function ServicesManager() {
  const { notify } = useToast();
  const { confirm } = useConfirm();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/services");
      const payload = await response.json();
      if (!response.ok) {
        notify({
          tone: "error",
          title: "Load failed",
          message: payload?.error ?? "Unable to load services.",
        });
        return;
      }
      setServices(payload.services ?? []);
    } catch (err) {
      notify({ tone: "error", title: "Load failed", message: "Unable to load services." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createService = async () => {
    if (!newName.trim()) {
      notify({ tone: "error", title: "Missing name", message: "Enter a service name." });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          price: newPrice ? Number(newPrice) : null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify({ tone: "error", title: "Create failed", message: payload.error ?? "Unable to create service." });
        return;
      }
      setNewName("");
      setNewPrice("");
      notify({ tone: "success", title: "Service added", message: "Service created." });
      await load();
    } catch (err) {
      notify({ tone: "error", title: "Create failed", message: "Unable to create service." });
    } finally {
      setSaving(false);
    }
  };

  const updateService = async (service: Service) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: service.name,
          price: service.price,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify({ tone: "error", title: "Update failed", message: payload.error ?? "Unable to update service." });
        return;
      }
      notify({ tone: "success", title: "Service updated", message: "Changes saved." });
      await load();
    } catch (err) {
      notify({ tone: "error", title: "Update failed", message: "Unable to update service." });
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (service: Service) => {
    const ok = await confirm({
      title: "Delete service",
      message: `Delete ${service.name}?`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/services/${service.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify({ tone: "error", title: "Delete failed", message: payload.error ?? "Unable to delete service." });
        return;
      }
      notify({ tone: "success", title: "Service deleted", message: "Service removed." });
      await load();
    } catch (err) {
      notify({ tone: "error", title: "Delete failed", message: "Unable to delete service." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Add service</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Service name"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <input
            value={newPrice}
            onChange={(event) => setNewPrice(event.target.value)}
            placeholder="Price (optional)"
            type="number"
            step="0.01"
            min="0"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={createService}
            disabled={saving}
            className="rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-60 dark:text-emerald-300"
          >
            {saving ? "Saving..." : "Add"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Your services</p>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading services…</p>
        ) : services.length ? (
          <div className="mt-4 grid gap-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto_auto] sm:items-center">
                  <input
                    value={service.name}
                    onChange={(event) =>
                      setServices((current) =>
                        current.map((item) =>
                          item.id === service.id ? { ...item, name: event.target.value } : item
                        )
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <input
                    value={service.price == null ? "" : String(service.price)}
                    onChange={(event) =>
                      setServices((current) =>
                        current.map((item) =>
                          item.id === service.id
                            ? {
                                ...item,
                                price: event.target.value === "" ? null : Number(event.target.value),
                              }
                            : item
                        )
                      )
                    }
                    placeholder="Price"
                    type="number"
                    step="0.01"
                    min="0"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => updateService(service)}
                    disabled={saving}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteService(service)}
                    disabled={saving}
                    className="rounded-lg border border-rose-400/60 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-500/10 disabled:opacity-60 dark:text-rose-300"
                  >
                    Delete
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {service.price == null ? "Price not set" : `$${formatMoney(service.price)}`}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No services yet.</p>
        )}
      </section>
    </div>
  );
}
