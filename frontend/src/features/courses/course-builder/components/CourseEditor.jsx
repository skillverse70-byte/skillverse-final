import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Save,
  Settings2,
  Users,
} from "lucide-react";
import CourseDetailsForm from "@/features/courses/course-builder/components/CourseDetailsForm";
import CourseInstructorAssignmentPanel from "@/features/courses/course-builder/components/CourseInstructorAssignmentPanel";
import ModuleEditor from "@/features/courses/course-builder/components/ModuleEditor";
import { useToast } from "@/components/ui/use-toast";
import { useCourseEditor } from "@/hooks/courses/useCourseEditor";
import { isVerifiedOrganization } from "@/lib/trust-state";

const editorTabs = [
  {
    value: "details",
    label: "Course",
    icon: Settings2,
    description: "Core course setup and pricing.",
  },
  {
    value: "curriculum",
    label: "Curriculum",
    icon: BookOpen,
    description: "Modules, lessons, and progression.",
  },
  {
    value: "instructors",
    label: "Instructors",
    icon: Users,
    description: "Invites and assignment visibility.",
  },
];

export default function CourseEditor({
  course,
  org,
  onSaved,
  onCancel,
  activeTab = "details",
  onTabChange = () => {},
}) {
  const {
    isNew,
    form,
    setField,
    tagInput,
    setTagInput,
    saving,
    addModule,
    updateModule,
    deleteModule,
    persistCourse,
  } = useCourseEditor({
    course,
    organization: org,
    onSaved,
  });
  const { toast } = useToast();

  const validateCourseForm = () => {
    if (!form.title.trim()) {
      return "Title is required";
    }

    if (!form.is_free && Number(form.price || 0) <= 0) {
      return "Paid courses must have a positive price.";
    }

    if (!form.is_free && !isVerifiedOrganization(org)) {
      return "Only verified organizations can create or edit paid courses.";
    }

    for (let moduleIndex = 0; moduleIndex < form.modules.length; moduleIndex += 1) {
      const module = form.modules[moduleIndex];
      if (!module.title?.trim()) {
        return `Module ${moduleIndex + 1} needs a title.`;
      }

      const lessons = module.lessons || [];
      for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex += 1) {
        const lesson = lessons[lessonIndex];
        if (!lesson.title?.trim()) {
          return `Lesson ${lessonIndex + 1} in module ${moduleIndex + 1} needs a title.`;
        }
        if (lesson.type === "video" && !lesson.content_url?.trim()) {
          return `Video lesson ${lessonIndex + 1} in module ${moduleIndex + 1} needs a video URL.`;
        }
        if (lesson.type === "resource" && !lesson.content_file && !lesson.content_file_url) {
          return `Document/resource lesson ${lessonIndex + 1} in module ${moduleIndex + 1} needs an uploaded file.`;
        }
        if (lesson.type === "checklist" && !(lesson.checklist_items || []).some((item) => item?.trim())) {
          return `Checklist lesson ${lessonIndex + 1} in module ${moduleIndex + 1} needs at least one checklist item.`;
        }
      }
    }

    return null;
  };

  const handleSave = async () => {
    const validationMessage = validateCourseForm();
    if (validationMessage) {
      toast({
        title: validationMessage,
        variant: "destructive",
      });
      return;
    }

    try {
      await persistCourse();
      toast({ title: "Course saved!" });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to save course",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to courses
      </button>
      <h1 className="font-heading font-bold text-2xl mb-6">
        {isNew ? "Create Course" : "Edit Course"}
      </h1>
      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
        <div className="rounded-3xl border border-border/60 bg-white p-3 shadow-sm shadow-black/5">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 md:grid-cols-3">
            {editorTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-2xl border border-transparent px-4 py-3 text-left data-[state=active]:border-teal-200 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-900"
                >
                  <div className="flex w-full items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-white/80 p-2 text-teal-700 shadow-sm shadow-teal-100">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium">{tab.label}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {tab.description}
                      </div>
                    </div>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="details" className="mt-0">
          <CourseDetailsForm
            form={form}
            set={setField}
            tagInput={tagInput}
            setTagInput={setTagInput}
            organization={org}
          />
        </TabsContent>

        <TabsContent value="curriculum" className="mt-0">
          <div className="bg-white rounded-2xl border border-border/50 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Modules & Lessons
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={addModule}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Module
              </Button>
            </div>
            {form.modules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No modules yet. Add your first module to start building the
                curriculum.
              </p>
            ) : (
              <div className="space-y-3">
                {form.modules.map((module, index) => (
                  <ModuleEditor
                    key={index}
                    module={module}
                    index={index}
                    onUpdate={(updated) => updateModule(index, updated)}
                    onDelete={() => deleteModule(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="instructors" className="mt-0">
          <CourseInstructorAssignmentPanel course={course} />
        </TabsContent>
      </Tabs>

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-700 gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Course"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
