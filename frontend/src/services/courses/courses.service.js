import { ApiError, apiRequest } from "@/lib/http-client";
import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";
import { fetchOrganizationProfileData } from "@/services/organizations/organization.service";

function normalizeLesson(lesson, index = 0) {
  return {
    id: lesson.id,
    title: lesson.title || "",
    type: lesson.type || "reading",
    description: lesson.description || "",
    content_url: lesson.content_url || "",
    duration_minutes: lesson.duration_minutes ?? "",
    sort_order: lesson.sort_order ?? index,
    is_required: lesson.is_required ?? true,
    progression_gate: lesson.progression_gate ?? false,
    is_completed: lesson.is_completed ?? false,
    is_unlocked: lesson.is_unlocked ?? true,
  };
}

function normalizeModule(module, index = 0) {
  const lessons = Array.isArray(module.lessons) ? module.lessons : [];

  return {
    id: module.id,
    title: module.title || "",
    description: module.description || "",
    sort_order: module.sort_order ?? index,
    lessons: lessons.map((lesson, lessonIndex) =>
      normalizeLesson(lesson, lessonIndex),
    ),
  };
}

function normalizeCourse(course) {
  const modules = Array.isArray(course.modules) ? course.modules : [];
  const totalLessons =
    course.total_lessons ??
    modules.reduce(
      (sum, module) =>
        sum + (Array.isArray(module.lessons) ? module.lessons.length : 0),
      0,
    );

  return {
    ...course,
    description: course.description || "",
    category: course.category || "",
    difficulty: course.difficulty || "beginner",
    instructor_name: course.instructor_name || "",
    tags: Array.isArray(course.tags) ? course.tags : [],
    is_free: course.is_free ?? true,
    price_amount: course.price_amount ?? "0.00",
    price_currency: course.price_currency || "ETB",
    price:
      typeof course.price_amount === "number"
        ? course.price_amount
        : Number.parseFloat(course.price_amount || "0") || 0,
    enrollment_open: course.enrollment_open ?? true,
    modules: modules.map((module, index) => normalizeModule(module, index)),
    total_lessons: totalLessons,
    enrolled_count: course.enrolled_count ?? 0,
  };
}

function normalizeEnrollment(enrollment) {
  return {
    ...enrollment,
    enrolled_date: enrollment.enrolled_date || enrollment.enrolled_at || null,
    course_program: enrollment.course_program
      ? normalizeCourse(enrollment.course_program)
      : null,
    modules: Array.isArray(enrollment.modules)
      ? enrollment.modules.map((module, index) => normalizeModule(module, index))
      : [],
    total_lessons: enrollment.total_lessons ?? 0,
    completed_lessons: enrollment.completed_lessons ?? 0,
    progress_percent: enrollment.progress_percent ?? 0,
    next_lesson_id: enrollment.next_lesson_id ?? null,
  };
}

function buildCourseWritePayload(payload) {
  return {
    title: payload.title?.trim() || "",
    description: payload.description || "",
    category: payload.category || "",
    difficulty: payload.difficulty || "beginner",
    instructor_name: payload.instructor_name || "",
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    is_free: payload.is_free ?? true,
    price_amount: payload.is_free ? "0.00" : Number(payload.price || 0).toFixed(2),
    price_currency: payload.price_currency || "ETB",
    enrollment_open: payload.enrollment_open ?? true,
    status: payload.status || "draft",
    modules: (payload.modules || []).map((module, moduleIndex) => ({
      title: module.title?.trim() || "",
      description: module.description || "",
      sort_order: module.sort_order ?? moduleIndex,
      lessons: (module.lessons || []).map((lesson, lessonIndex) => ({
        title: lesson.title?.trim() || "",
        type: lesson.type || "reading",
        description: lesson.description || "",
        content_url: lesson.content_url || "",
        duration_minutes:
          lesson.duration_minutes === "" || lesson.duration_minutes === undefined
            ? null
            : Number(lesson.duration_minutes),
        sort_order: lesson.sort_order ?? lessonIndex,
        is_required: lesson.is_required ?? true,
        progression_gate: lesson.progression_gate ?? false,
      })),
    })),
  };
}

export async function fetchPublishedCourses() {
  const courses = await apiRequest("/courses/", { method: "GET" });
  return courses.map(normalizeCourse);
}

export async function fetchPublicCourseDetail(courseId) {
  const course = await apiRequest(`/courses/${courseId}/`, { method: "GET" });
  return normalizeCourse(course);
}

export async function fetchLearnerCourseProgress(courseId) {
  const enrollment = await authenticatedApiRequest(`/courses/${courseId}/progress/`, {
    method: "GET",
  });
  return normalizeEnrollment(enrollment);
}

export async function enrollInCourse(courseId) {
  const enrollment = await authenticatedApiRequest(`/courses/${courseId}/enroll/`, {
    method: "POST",
  });
  return normalizeEnrollment(enrollment);
}

export async function completeCourseLesson(courseId, lessonId) {
  const enrollment = await authenticatedApiRequest(
    `/courses/${courseId}/lessons/${lessonId}/complete/`,
    {
      method: "POST",
    },
  );
  return normalizeEnrollment(enrollment);
}

export async function fetchLearnerEnrollments() {
  const enrollments = await authenticatedApiRequest("/courses/enrollments/", {
    method: "GET",
  });
  return enrollments.map(normalizeEnrollment);
}

export async function fetchCourseBuilderData() {
  let organization = null;

  try {
    const organizationData = await fetchOrganizationProfileData();
    organization = organizationData.organization;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }
  }

  const courses = organization
    ? await authenticatedApiRequest("/courses/manage/", { method: "GET" })
    : [];

  return {
    organization,
    courses: courses.map(normalizeCourse),
  };
}

export async function saveCourse({ course, payload, isNew }) {
  const result = await authenticatedApiRequest(
    isNew ? "/courses/manage/" : `/courses/manage/${course.id}/`,
    {
      method: isNew ? "POST" : "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildCourseWritePayload(payload)),
    },
  );

  return normalizeCourse(result);
}
