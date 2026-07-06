import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Video,
  FileText,
  HelpCircle,
  ClipboardList,
  Link as LinkIcon,
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
  resource: LinkIcon,
  checklist: ListChecks,
  assessment: NotebookPen,
};

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
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-secondary/30">
        <span className="text-xs font-bold text-muted-foreground w-6 text-center">
          {index + 1}
        </span>
        <Input
          value={module.title}
          onChange={(e) => onUpdate({ ...module, title: e.target.value })}
          placeholder="Module title"
          className="border-0 bg-transparent focus-visible:ring-0 font-medium"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-red-500 hover:bg-red-50 flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
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
      <div className="p-3 space-y-1">
        {module.lessons?.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            No lessons yet.
          </p>
        ) : (
          module.lessons?.map((lesson, lessonIndex) => {
            const Icon = lessonIcons[lesson.type] || FileText;

            return (
              <div
                key={lessonIndex}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 group"
              >
                <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{lesson.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {lesson.type}
                    {lesson.progression_gate ? " · gated" : ""}
                    {lesson.is_required === false ? " · optional" : ""}
                  </div>
                </div>
                {lesson.duration_minutes && (
                  <span className="text-xs text-muted-foreground">
                    {lesson.duration_minutes}m
                  </span>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(lesson, lessonIndex)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:bg-red-50"
                    onClick={() => deleteLesson(lessonIndex)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
          className="w-full text-muted-foreground gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add Lesson
        </Button>
      </div>
      {showDialog && (
        <LessonDialog lesson={editingLesson} onSave={handleSave} onClose={close} />
      )}
    </div>
  );
}
