import { useState } from "react";
import { saveCourse } from "@/services/courses/courses.service";

export function useCourseEditor({ course, onSaved }) {
  const isNew = !course?.id;
  const [form, setForm] = useState({
    title: course?.title || "",
    description: course?.description || "",
    category: course?.category || "",
    difficulty: course?.difficulty || "beginner",
    is_free: course?.is_free ?? true,
    price: course?.price || 0,
    price_currency: course?.price_currency || "ETB",
    status: course?.status || "draft",
    enrollment_open: course?.enrollment_open ?? true,
    instructor_name: course?.instructor_name || "",
    tags: course?.tags || [],
    modules: course?.modules || [],
  });
  const [tagInput, setTagInput] = useState((course?.tags || []).join(", "));
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addModule = () => {
    setForm((current) => ({
      ...current,
      modules: [
        ...current.modules,
        {
          title: "",
          description: "",
          sort_order: current.modules.length,
          lessons: [],
        },
      ],
    }));
  };

  const updateModule = (index, updatedModule) => {
    setForm((current) => ({
      ...current,
      modules: current.modules.map((module, currentIndex) =>
        currentIndex === index ? updatedModule : module,
      ),
    }));
  };

  const deleteModule = (index) => {
    setForm((current) => ({
      ...current,
      modules: current.modules.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const persistCourse = async () => {
    setSaving(true);
    try {
      const tags = tagInput.split(",").map((tag) => tag.trim()).filter(Boolean);
      const totalLessons = form.modules.reduce(
        (sum, module) => sum + (module.lessons?.length || 0),
        0,
      );
      const totalDuration =
        form.modules.reduce(
          (sum, module) =>
            sum +
            (module.lessons?.reduce(
              (lessonSum, lesson) => lessonSum + (lesson.duration_minutes || 0),
              0,
            ) || 0),
          0,
        ) / 60;

      const payload = {
        ...form,
        tags,
        total_lessons: totalLessons,
        total_duration_hours: Math.round(totalDuration * 10) / 10,
      };

      const result = await saveCourse({
        course,
        payload,
        isNew,
      });
      onSaved(result);
      return result;
    } finally {
      setSaving(false);
    }
  };

  return {
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
  };
}
