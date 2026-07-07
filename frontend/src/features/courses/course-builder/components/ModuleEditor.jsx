import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Video,
  FileText,
  FileUp,
  HelpCircle,
  ClipboardList,
  ListChecks,
  NotebookPen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LessonDialog from "@/features/courses/course-builder/components/LessonDialog";

const lessonIcons = {
  video: Video,
  reading: FileText,
  quiz: HelpCircle,
  assignment: ClipboardList,
  resource: FileUp,
  checklist: ListChecks,
  assessment: NotebookPen,
};

function lessonMeta(lesson) {
  const parts = [lesson.type === "resource" ? "document" : lesson.type];
  if (lesson.progression_gate) {
    parts.push("gated");
  }
  if (lesson.is_required === false) {
    parts.push("optional");
  }
  if (lesson.type === "resource" && (lesson.content_file_name || lesson.content_file_url)) {
    parts.push("file attached");
  }
  if (lesson.type === "video" && lesson.content_url) {
    parts.push("embedded");
  }
  if (lesson.type === "checklist" && lesson.checklist_items?.length) {
    parts.push(`${lesson.checklist_items.length} items`);
  }
  return parts.join(" · ");
}

export default function ModuleEditor({ module, index, onUpdate, onDelete }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editingIdx, setEditingIdx] = useState(null);

  const handleSave = (lessonData) => {
    if (editingIdx !== null) {
      onUpdate({
        ...module,
        lessons: module.lessons.map((lesson, lessonIndex) =>
          lessonIndex === editingIdx ? lessonData : lesson,
        ),
      });
    } else {
      onUpdate({
        ...module,
        lessons: [...(module.lessons || []), lessonData],
      });
    }
    close();
  };

  const openAdd = () => {
    setEditingLesson(null);
    setEditingIdx(null);
    setShowDialog(true);
  };

  const openEdit = (lesson, lessonIndex) => {
    setEditingLesson(lesson);
    setEditingIdx(lessonIndex);
    setShowDialog(true);
  };

  const close = () => {
    setShowDialog(false);
    setEditingLesson(null);
    setEditingIdx(null);
  };

  const deleteLesson = (lessonIndex) => {
    onUpdate({
      ...module,
      lessons: module.lessons.filter((_, currentIndex) => currentIndex !== lessonIndex),
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border/50">
      <div className="flex items-center gap-2 bg-secondary/30 p-3">
        <span className="w-6 text-center text-xs font-bold text-muted-foreground">
          {index + 1}
        </span>
        <Input
          value={module.title}
          onChange={(e) => onUpdate({ ...module, title: e.target.value })}
          placeholder="Module title"
          className="border-0 bg-transparent font-medium focus-visible:ring-0"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="flex-shrink-0 text-red-500 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="px-3 pt-3">
        <Input
          value={module.description || ""}
          onChange={(e) => onUpdate({ ...module, description: e.target.value })}
          placeholder="Module description (optional)"
          className="text-sm"
        />
      </div>
      <div className="space-y-1 p-3">
        {module.lessons?.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">No lessons yet.</p>
        ) : (
          module.lessons?.map((lesson, lessonIndex) => {
            const Icon = lessonIcons[lesson.type] || FileText;

            return (
              <div
                key={lesson.client_key || lesson.id || lessonIndex}
                className="group flex items-center gap-2 rounded-lg p-2 hover:bg-secondary/50"
              >
                <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{lesson.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {lessonMeta(lesson)}
                  </div>
                </div>
                {lesson.duration_minutes ? (
                  <span className="text-xs text-muted-foreground">{lesson.duration_minutes}m</span>
                ) : null}
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(lesson, lessonIndex)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:bg-red-50"
                    onClick={() => deleteLesson(lessonIndex)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={openAdd}
          className="w-full gap-1.5 text-muted-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add Lesson
        </Button>
      </div>
      {showDialog ? (
        <LessonDialog lesson={editingLesson} onSave={handleSave} onClose={close} />
      ) : null}
    </div>
  );
}
