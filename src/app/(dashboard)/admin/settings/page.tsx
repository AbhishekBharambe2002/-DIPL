"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/ui/form-field";

export default function SettingsPage() {
  const [form, setForm] = useState({
    companyName: "",
    phone: "",
    email: "",
    address: "",
    gstNumber: "",
  });
  const [saved, setSaved] = useState(false);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Administration"
        title="Settings"
        description="Company information and system defaults."
      />

      <div className="max-w-2xl card-pad !p-6">
        <h2 className="mb-4 text-lg font-medium text-gray-900">
          Company Information
        </h2>
        <div className="space-y-4">
          <FormInput
            label="Company Name"
            value={form.companyName}
            onChange={(e) => set("companyName", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
            <FormInput
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <FormTextarea
            label="Address"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
          <FormInput
            label="GST Number"
            value={form.gstNumber}
            onChange={(e) => set("gstNumber", e.target.value)}
          />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleSave}>Save Settings</Button>
          {saved && (
            <span className="text-sm font-medium text-emerald-600">
              Settings saved successfully!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
