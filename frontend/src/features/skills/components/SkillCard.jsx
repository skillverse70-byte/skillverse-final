import React, { useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const directionConfig = {
  offering: {
    label: "Offering",
    pill: "bg-amber-50 text-amber-700",
  },
  requesting: {
    label: "Learning",
    pill: "bg-blue-50 text-blue-700",
  },
  both: {
    label: "Both",
    pill: "bg-emerald-50 text-emerald-700",
  },
};

export default function SkillCard({ skill, onSave, onDelete, saving }) {
  const [direction, setDirection] = useState(skill.direction);
  const [experienceNote, setExperienceNote] = useState(skill.experience_note || "");
  const directionState = directionConfig[skill.direction] || directionConfig.requesting;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-sm font-medium">{skill.skill.name}</div>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${directionState.pill}`}
          >
            {directionState.label}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(skill.id)}
          disabled={saving}
          className="shrink-0 text-red-500 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Direction
          </div>
          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="offering">Offering</SelectItem>
              <SelectItem value="requesting">Requesting</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Experience Note
          </div>
          <Input
            value={experienceNote}
            onChange={(event) => setExperienceNote(event.target.value)}
            placeholder="Optional context for this skill"
          />
        </div>
        <Button
          onClick={() =>
            onSave(skill.id, {
              direction,
              experience_note: experienceNote,
            })
          }
          disabled={saving}
          className="gap-1.5 bg-teal-600 hover:bg-teal-700"
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
}
