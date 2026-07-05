import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

const levelColors = {
  beginner: "bg-blue-50 text-blue-700",
  intermediate: "bg-amber-50 text-amber-700",
  advanced: "bg-emerald-50 text-emerald-700",
};

export default function SkillCard({ skill, onLevelChange, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-border/50 p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm mb-1">{skill.skill_name}</div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${levelColors[skill.level]} font-medium capitalize`}
        >
          {skill.level}
        </span>
      </div>
      <Select
        value={skill.level}
        onValueChange={(value) => onLevelChange(skill.id, value)}
      >
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="beginner">Beginner</SelectItem>
          <SelectItem value="intermediate">Intermediate</SelectItem>
          <SelectItem value="advanced">Advanced</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(skill.id)}
        className="text-red-500 hover:bg-red-50 flex-shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
