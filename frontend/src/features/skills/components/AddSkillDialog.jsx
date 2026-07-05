import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

export default function AddSkillDialog({
  open,
  onOpenChange,
  form,
  setField,
  onSubmit,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-teal-600 hover:bg-teal-700 gap-2">
          <Plus className="w-4 h-4" /> Add Skill
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Skill</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Skill Name</Label>
            <Input
              value={form.skill_name}
              onChange={(event) => setField("skill_name", event.target.value)}
              className="mt-1.5"
              placeholder="e.g. Python"
            />
          </div>
          <div>
            <Label>Proficiency Level</Label>
            <Select value={form.level} onValueChange={(value) => setField("level", value)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.can_teach}
                onChange={(event) => setField("can_teach", event.target.checked)}
                className="rounded"
              />{" "}
              I can teach this skill
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.wants_to_learn}
                onChange={(event) =>
                  setField("wants_to_learn", event.target.checked)
                }
                className="rounded"
              />{" "}
              I want to learn this skill
            </label>
          </div>
          <Button onClick={onSubmit} className="w-full bg-teal-600 hover:bg-teal-700">
            Add Skill
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
