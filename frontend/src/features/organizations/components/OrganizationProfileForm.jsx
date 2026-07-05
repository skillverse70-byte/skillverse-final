import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Save } from "lucide-react";
import { organizationTypes } from "@/lib/domain-enums";

const organizationTypeOptions = [
  { value: organizationTypes.company, label: "Company" },
  { value: organizationTypes.ngo, label: "NGO" },
  { value: organizationTypes.institution, label: "Institution" },
  { value: organizationTypes.trainingCenter, label: "Training Center" },
  { value: organizationTypes.community, label: "Community" },
  { value: organizationTypes.other, label: "Other" },
];

export default function OrganizationProfileForm({
  form,
  setField,
  saving,
  onSave,
  organization,
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Organization Name</Label>
          <Input
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Organization Type</Label>
          <select
            value={form.type}
            onChange={(event) => setField("type", event.target.value)}
            className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            {organizationTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(event) => setField("description", event.target.value)}
          className="mt-1.5"
          rows={3}
        />
      </div>
      <div>
        <Label>What you provide</Label>
        <Textarea
          value={form.offerings_summary}
          onChange={(event) => setField("offerings_summary", event.target.value)}
          className="mt-1.5"
          rows={4}
          placeholder="Summarize your courses, events, programs, opportunities, or areas of support."
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Contact Email</Label>
          <Input
            value={form.contact_email}
            onChange={(event) => setField("contact_email", event.target.value)}
            className="mt-1.5"
            placeholder="contact@org.com"
          />
        </div>
        <div>
          <Label>Contact Phone</Label>
          <Input
            value={form.contact_phone}
            onChange={(event) => setField("contact_phone", event.target.value)}
            className="mt-1.5"
            placeholder="+2519..."
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Country</Label>
          <Input
            value={form.country}
            onChange={(event) => setField("country", event.target.value)}
            className="mt-1.5"
            placeholder="Ethiopia"
          />
        </div>
        <div>
          <Label>Location</Label>
          <Input
            value={form.location}
            onChange={(event) => setField("location", event.target.value)}
            className="mt-1.5"
            placeholder="Addis Ababa"
          />
        </div>
      </div>
      <div>
        <Label>Website</Label>
        <Input
          value={form.website_url}
          onChange={(event) => setField("website_url", event.target.value)}
          className="mt-1.5"
          placeholder="https://..."
        />
      </div>
      <div className="rounded-2xl border border-border/60 bg-slate-50/60 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-sm font-medium text-foreground">
              Business license or supporting document
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Uploading documentation helps future verification workflows, but does not automatically mark the organization as verified.
            </p>
          </div>
          {organization?.has_business_license ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <FileText className="h-3.5 w-3.5" />
              On file
            </span>
          ) : null}
        </div>
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(event) => setField("business_license", event.target.files?.[0] || null)}
          className="mt-4"
        />
        {form.business_license ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Selected: {form.business_license.name}
          </p>
        ) : null}
      </div>
      <Button
        onClick={onSave}
        disabled={saving}
        className="bg-teal-600 hover:bg-teal-700 gap-2 w-full"
      >
        <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
