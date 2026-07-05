import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

export default function ProfileForm({ form, setForm, onSave, onCancel }) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Display Name</Label>
        <Input
          value={form.display_name}
          onChange={(event) =>
            setForm({ ...form, display_name: event.target.value })
          }
          className="mt-1.5"
        />
      </div>
      <div>
        <Label className="text-sm font-medium">Bio</Label>
        <Textarea
          value={form.bio}
          onChange={(event) => setForm({ ...form, bio: event.target.value })}
          className="mt-1.5 resize-none"
          rows={3}
        />
      </div>
      <div>
        <Label className="text-sm font-medium">Location</Label>
        <Input
          value={form.location}
          onChange={(event) =>
            setForm({ ...form, location: event.target.value })
          }
          className="mt-1.5"
          placeholder="City, Country"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={onSave} className="bg-teal-600 hover:bg-teal-700 gap-1.5">
          <Save className="w-4 h-4" /> Save Changes
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
