import React from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const experienceLevelOptions = [
  { value: "", label: "Select experience level" },
  { value: "student", label: "Student" },
  { value: "early_career", label: "Early Career" },
  { value: "mid_career", label: "Mid Career" },
  { value: "experienced", label: "Experienced" },
];

export default function ProfileForm({
  form,
  setForm,
  fieldInterests,
  availableFieldCatalog,
  newFieldInterest,
  setNewFieldInterest,
  onAddFieldInterest,
  onDeleteFieldInterest,
  onSave,
  onCancel,
  savingProfile,
  savingField,
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-sm font-medium">Full Name</Label>
          <Input
            value={form.full_name}
            onChange={(event) =>
              setForm({ ...form, full_name: event.target.value })
            }
            className="mt-1.5"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Experience Level</Label>
          <select
            value={form.experience_level}
            onChange={(event) =>
              setForm({ ...form, experience_level: event.target.value })
            }
            className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            {experienceLevelOptions.map((option) => (
              <option key={option.value || "blank"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Bio</Label>
        <Textarea
          value={form.bio}
          onChange={(event) => setForm({ ...form, bio: event.target.value })}
          className="mt-1.5 resize-none"
          rows={4}
          placeholder="Tell other learners and future matching flows a bit about yourself."
        />
      </div>

      <div>
        <Label className="text-sm font-medium">Interests Summary</Label>
        <Textarea
          value={form.interests_summary}
          onChange={(event) =>
            setForm({ ...form, interests_summary: event.target.value })
          }
          className="mt-1.5 resize-none"
          rows={3}
          placeholder="Summarize the topics, communities, or activities you care about."
        />
      </div>

      <div className="rounded-2xl border border-border/60 bg-slate-50/60 p-4">
        <div className="mb-3">
          <div className="text-sm font-medium text-foreground">Field Interests</div>
          <p className="text-xs text-muted-foreground">
            Add the academic, professional, or domain areas you want your profile to signal.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {fieldInterests.length ? (
            fieldInterests.map((entry) => (
              <span
                key={entry.id}
                className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-700"
              >
                {entry.field_interest.name}
                <button
                  type="button"
                  onClick={() => onDeleteFieldInterest(entry.id)}
                  className="rounded-full p-0.5 text-teal-700 transition hover:bg-teal-100"
                  disabled={savingField}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No field interests added yet.
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              list="field-interest-suggestions"
              value={newFieldInterest}
              onChange={(event) => setNewFieldInterest(event.target.value)}
              placeholder="e.g. Computer Science"
            />
            <datalist id="field-interest-suggestions">
              {availableFieldCatalog.map((entry) => (
                <option key={entry.id} value={entry.name} />
              ))}
            </datalist>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onAddFieldInterest}
            disabled={savingField || !newFieldInterest.trim()}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add field
          </Button>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          onClick={onSave}
          disabled={savingProfile}
          className="gap-1.5 bg-teal-600 hover:bg-teal-700"
        >
          <Save className="h-4 w-4" />
          {savingProfile ? "Saving..." : "Save Changes"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={savingProfile}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
