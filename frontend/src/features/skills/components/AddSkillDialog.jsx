import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AddSkillDialog({
  open,
  onOpenChange,
  form,
  setField,
  catalog,
  saving,
  onSubmit,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4" />
          Add Skill
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Skill</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div>
            <Label>Skill Name</Label>
            <Input
              list="skill-catalog-suggestions"
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
              className="mt-1.5"
              placeholder="e.g. Python"
            />
            <datalist id="skill-catalog-suggestions">
              {catalog.map((entry) => (
                <option key={entry.id} value={entry.name} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Direction</Label>
            <Select
              value={form.direction}
              onValueChange={(value) => setField("direction", value)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="offering">I can offer this</SelectItem>
                <SelectItem value="requesting">I want to learn this</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Experience Note</Label>
            <Input
              value={form.experience_note}
              onChange={(event) => setField("experience_note", event.target.value)}
              className="mt-1.5"
              placeholder="Optional context like projects, years, or focus area"
            />
          </div>
          <Button
            onClick={onSubmit}
            disabled={saving}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {saving ? "Adding..." : "Add Skill"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
