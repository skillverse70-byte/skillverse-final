import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function LessonDialog({ lesson, onSave, onClose }) {
  const [form, setForm] = useState({
    title: lesson?.title || "",
    type: lesson?.type || "video",
    content_url: lesson?.content_url || "",
    duration_minutes: lesson?.duration_minutes || "",
    description: lesson?.description || "",
    is_required: lesson?.is_required ?? true,
    progression_gate: lesson?.progression_gate ?? false,
  });

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      return;
    }

    onSave({
      ...form,
      duration_minutes: form.duration_minutes
        ? Number(form.duration_minutes)
        : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="mt-1.5"
              placeholder="Lesson title"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(value) => set("type", value)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="resource">Resource</SelectItem>
                <SelectItem value="checklist">Checklist</SelectItem>
                <SelectItem value="assessment">Assessment</SelectItem>
                <SelectItem value="quiz">Quiz</SelectItem>
                <SelectItem value="assignment">Assignment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => set("duration_minutes", e.target.value)}
                className="mt-1.5"
                placeholder="15"
              />
            </div>
            <div>
              <Label>Content URL</Label>
              <Input
                value={form.content_url}
                onChange={(e) => set("content_url", e.target.value)}
                className="mt-1.5"
                placeholder="https://..."
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="mt-1.5"
              rows={2}
              placeholder="What will students learn?"
            />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(e) => set("is_required", e.target.checked)}
                className="rounded"
              />
              Required for completion
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.progression_gate}
                onChange={(e) => set("progression_gate", e.target.checked)}
                className="rounded"
              />
              Gate next content until complete
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              className="bg-teal-600 hover:bg-teal-700 flex-1"
            >
              {lesson ? "Update Lesson" : "Add Lesson"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
