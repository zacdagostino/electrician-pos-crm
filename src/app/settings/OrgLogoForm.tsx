"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

type OrgLogoFormProps = {
  orgLogoUrl: string | null;
};

const MAX_MB = 2;

export default function OrgLogoForm({ orgLogoUrl }: OrgLogoFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(orgLogoUrl);
  const [saving, setSaving] = useState(false);
  const { notify } = useToast();

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);

    if (selected) {
      if (selected.size > MAX_MB * 1024 * 1024) {
        notify({
          tone: "error",
          title: "File too large",
          message: `Logo must be under ${MAX_MB}MB.`,
        });
        setFile(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selected);
    } else {
      setPreview(orgLogoUrl);
    }
  };

  const onUpload = async () => {
    if (!file) {
      notify({ tone: "error", title: "Missing file", message: "Choose a logo file first." });
      return;
    }

    setSaving(true);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/settings/org-logo", {
      method: "POST",
      body: formData,
    });

    setSaving(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      notify({
        tone: "error",
        title: "Upload failed",
        message: payload.error || "Unable to upload logo.",
      });
      return;
    }

    notify({ tone: "success", title: "Logo updated", message: "Logo uploaded." });
    router.refresh();
  };

  const onRemove = async () => {
    setSaving(true);

    const formData = new FormData();
    formData.append("remove", "1");

    const response = await fetch("/api/settings/org-logo", {
      method: "POST",
      body: formData,
    });

    setSaving(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      notify({
        tone: "error",
        title: "Remove failed",
        message: payload.error || "Unable to remove logo.",
      });
      return;
    }

    setFile(null);
    setPreview(null);
    notify({ tone: "success", title: "Logo removed", message: "Logo removed." });
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Company branding</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-100">Organization logo</h2>
        <p className="text-sm text-slate-400">
          Upload a square logo to show in the navigation sidebar.
        </p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          {preview ? (
            <img src={preview} alt="Org logo preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-slate-500">No logo</span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onUpload}
              disabled={saving}
              className="rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Upload logo"}
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={saving || !preview}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-950 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
