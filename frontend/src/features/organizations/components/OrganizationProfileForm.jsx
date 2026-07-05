import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

export default function OrganizationProfileForm({
  form,
  setField,
  saving,
  onSave,
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Organization Name</Label>
        <Input
          value={form.name}
          onChange={(event) => setField("name", event.target.value)}
          className="mt-1.5"
        />
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
        <Label>Category</Label>
        <Input
          value={form.category}
          onChange={(event) => setField("category", event.target.value)}
          className="mt-1.5"
          placeholder="e.g. Education"
        />
      </div>
      <div>
        <Label>Website</Label>
        <Input
          value={form.website}
          onChange={(event) => setField("website", event.target.value)}
          className="mt-1.5"
          placeholder="https://..."
        />
      </div>
      <div>
        <Label>Contact Email</Label>
        <Input
          value={form.contact_email}
          onChange={(event) => setField("contact_email", event.target.value)}
          className="mt-1.5"
          placeholder="contact@org.com"
        />
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
