"use client";

import { useState } from "react";
import type { OrgRole, TradeRole } from "@prisma/client";
import SelectMenu from "@/components/SelectMenu";
import { useToast } from "@/components/ToastProvider";

type ProfileFormProps = {
  name: string | null;
  email: string;
  phone: string | null;
  tradeRole: TradeRole;
  accessRole: OrgRole;
};

export default function ProfileForm({ name, email, phone, tradeRole, accessRole }: ProfileFormProps) {
  const [fullName, setFullName] = useState(name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(phone ?? "");
  const [role, setRole] = useState<TradeRole>(tradeRole);
  const [orgRole, setOrgRole] = useState<OrgRole>(accessRole);
  const [saving, setSaving] = useState(false);
  const { notify } = useToast();

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const response = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fullName,
        phone: phoneNumber,
        tradeRole: role,
        accessRole: orgRole,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      notify({
        tone: "error",
        title: "Update failed",
        message: payload.error || "Unable to update profile.",
      });
      return;
    }

    notify({ tone: "success", title: "Profile updated", message: "Changes saved." });
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
      <label className="flex flex-col gap-2 text-sm">
        Trade role
        <SelectMenu
          value={role}
          onChange={(value) => setRole(value as ProfileFormProps["tradeRole"])}
          options={[
            { value: "electrician", label: "Electrician" },
            { value: "apprentice", label: "Apprentice" },
            { value: "office", label: "Office / Admin" },
          ]}
          className="w-full"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Access role
        <SelectMenu
          value={orgRole}
          onChange={(value) => setOrgRole(value as OrgRole)}
          options={
            accessRole === "owner"
              ? [{ value: "owner", label: "Owner (full access)" }]
              : [
                  { value: "admin", label: "Admin" },
                  { value: "staff", label: "Staff" },
                ]
          }
          className="w-full"
        />
      </label>
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
