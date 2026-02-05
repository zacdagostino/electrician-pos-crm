"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SelectMenu from "@/components/SelectMenu";
import { useToast } from "@/components/ToastProvider";

type JobEditFormProps = {
  job: {
    id: string;
    title: string | null;
    status: "pending" | "in_progress" | "completed" | "cancelled";
    assignedToMemberId: string | null;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    siteLine1: string;
    siteLine2: string | null;
    siteSuburb: string | null;
    siteState: string | null;
    sitePostcode: string | null;
    notes: string | null;
  };
  assignees: Array<{ value: string; label: string }>;
};

const statusOptions: JobEditFormProps["job"]["status"][] = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
];

export default function JobEditForm({ job, assignees }: JobEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { notify } = useToast();

  const [title, setTitle] = useState(job.title ?? "");
  const [status, setStatus] = useState<JobEditFormProps["job"]["status"]>(job.status);
  const [assignedToMemberId, setAssignedToMemberId] = useState(job.assignedToMemberId ?? "");
  const [customerName, setCustomerName] = useState(job.customerName);
  const [customerEmail, setCustomerEmail] = useState(job.customerEmail ?? "");
  const [customerPhone, setCustomerPhone] = useState(job.customerPhone ?? "");
  const [siteLine1, setSiteLine1] = useState(job.siteLine1);
  const [siteLine2, setSiteLine2] = useState(job.siteLine2 ?? "");
  const [siteSuburb, setSiteSuburb] = useState(job.siteSuburb ?? "");
  const [siteState, setSiteState] = useState(job.siteState ?? "");
  const [sitePostcode, setSitePostcode] = useState(job.sitePostcode ?? "");
  const [notes, setNotes] = useState(job.notes ?? "");

  const save = async () => {
    setSaving(true);

    try {
      if (!assignedToMemberId) {
        notify({
          tone: "error",
          title: "Missing assignee",
          message: "Assigned electrician is required.",
        });
        return;
      }
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          status,
          assignedToMemberId,
          customerName,
          customerEmail,
          customerPhone,
          siteLine1,
          siteLine2,
          siteSuburb,
          siteState,
          sitePostcode,
          notes,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify({
          tone: "error",
          title: "Update failed",
          message: payload.error ?? "Unable to update job.",
        });
        return;
      }
      notify({ tone: "success", title: "Job updated", message: "Changes saved." });
      router.push(`/jobs/${job.id}`);
      router.refresh();
    } catch (err) {
      notify({ tone: "error", title: "Update failed", message: "Unable to update job." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Job details</p>
        <div className="mt-4 grid gap-4">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Job title"
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <div className="text-xs text-slate-400">
            Status
            <SelectMenu
              value={status}
              onChange={(value) => setStatus(value as JobEditFormProps["job"]["status"])}
              options={statusOptions.map((option) => ({
                value: option,
                label: option.replace("_", " "),
              }))}
              className="mt-2 w-full"
            />
          </div>
          <div className="text-xs text-slate-400">
            Assigned electrician
            <SelectMenu
              value={assignedToMemberId}
              onChange={(value) => setAssignedToMemberId(value as string)}
              options={assignees}
              className="mt-2 w-full"
            />
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Job notes"
            rows={4}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
        </div>
      </section>

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
