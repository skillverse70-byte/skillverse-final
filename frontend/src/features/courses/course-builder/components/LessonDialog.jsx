import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function parseChecklistItems(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function LessonDialog({ lesson, onSave, onClose }) {
  const [form, setForm] = useState({
    id: lesson?.id,
    client_key: lesson?.client_key,
    title: lesson?.title || "",
    type: lesson?.type || "video",
    content_url: lesson?.content_url || "",
    content_file: lesson?.content_file || null,
    content_file_url: lesson?.content_file_url || "",
    content_file_name: lesson?.content_file_name || "",
    duration_minutes: lesson?.duration_minutes || "",
    description: lesson?.description || "",
    checklist_text: (lesson?.checklist_items || []).join("\n"),
    is_required: lesson?.is_required ?? true,
    progression_gate: lesson?.progression_gate ?? false,
  });

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const contentHint = useMemo(() => {
    if (form.type === "video") {
      return "Paste a YouTube or Vimeo share/embed URL. Learners will watch it inline.";
    }
    if (form.type === "resource") {
      return "Upload the document learners should open or download.";
    }
    if (form.type === "checklist") {
      return "Add one checklist item per line. Learners will see each step with completion state.";
    }
    return "Use the description and optional external URL to guide the learner.";
  }, [form.type]);

  const handleSave = () => {
    if (!form.title.trim()) {
      return;
    }

    onSave({
      id: form.id,
      client_key: form.client_key,
      title: form.title.trim(),
      type: form.type,
      content_url: form.content_url,
      content_file: form.content_file,
      content_file_url: form.content_file_url,
      content_file_name: form.content_file_name,
      checklist_items: parseChecklistItems(form.checklist_text),
      duration_minutes: form.duration_minutes
        ? Number(form.duration_minutes)
        : undefined,
      description: form.description,
      is_required: form.is_required,
      progression_gate: form.progression_gate,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
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
                <SelectItem value="resource">Document / Resource</SelectItem>
                <SelectItem value="checklist">Checklist</SelectItem>
                <SelectItem value="assessment">Assessment</SelectItem>
                <SelectItem value="quiz">Quiz</SelectItem>
                <SelectItem value="assignment">Assignment</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">{contentHint}</p>
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

            {form.type === "video" || form.type === "reading" || form.type === "assessment" || form.type === "quiz" || form.type === "assignment" ? (
              <div>
                <Label>External URL</Label>
                <Input
                  value={form.content_url}
                  onChange={(e) => set("content_url", e.target.value)}
                  className="mt-1.5"
                  placeholder="https://..."
                />
              </div>
            ) : null}

            {form.type === "resource" ? (
              <div className="col-span-2">
                <Label>Upload document</Label>
                <Input
                  type="file"
                  className="mt-1.5"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    set("content_file", file);
                    if (file) {
                      set("content_file_name", file.name);
                    }
                  }}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
                />
                {form.content_file_name || form.content_file_url ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Current file: {form.content_file_name || "Existing uploaded file"}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="mt-1.5"
              rows={3}
              placeholder="What should the learner know or do here?"
            />
          </div>

          {form.type === "checklist" ? (
            <div>
              <Label>Checklist items</Label>
              <Textarea
                value={form.checklist_text}
                onChange={(e) => set("checklist_text", e.target.value)}
                className="mt-1.5"
                rows={6}
                placeholder={"Add one checklist step per line\nExample:\nReview the brief\nDownload the worksheet\nSubmit reflection"}
              />
            </div>
          ) : null}

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
              className="flex-1 bg-teal-600 hover:bg-teal-700"
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
