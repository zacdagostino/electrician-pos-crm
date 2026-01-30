"use client";

import { useState } from "react";

type ProfileFormProps = {
  name: string | null;
  email: string;
  phone: string | null;
};

export default function ProfileForm({ name, email, phone }: ProfileFormProps) {
  const [fullName, setFullName] = useState(name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    const response = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fullName,
        phone: phoneNumber,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error || "Unable to update profile.");
      return;
    }

    setSuccess("Profile updated.");
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm">
        Name
        <input
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Email (login)
        <input
          type="email"
          value={email}
          readOnly
          className="cursor-not-allowed rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-slate-400"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Phone
        <input
          type="tel"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
