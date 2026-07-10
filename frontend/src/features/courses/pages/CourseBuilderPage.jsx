import React from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen, Building, Edit2, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import CourseEditor from "@/features/courses/course-builder/components/CourseEditor";
import { useCourseBuilder } from "@/hooks/courses/useCourseBuilder";
import { isVerifiedOrganization } from "@/lib/trust-state";

export default function CourseBuilderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCourseId = searchParams.get("course") || "";
  const requestedTab = searchParams.get("tab") || "details";
  const {
    organization,
    courses,
    editing,
    setEditing,
    loading,
    handleSaved,
  } = useCourseBuilder({ courseId: requestedCourseId });

  const newCourseTemplate = {
    title: "",
    description: "",
    category: "",
    difficulty: "beginner",
    is_free: true,
    price: 0,
    price_currency: "ETB",
    status: "draft",
    enrollment_open: true,
    tags: [],
    modules: [],
    instructor_name: "",
  };

  const updateEditorParams = ({ courseId = "", tab = "" } = {}) => {
    const nextParams = new URLSearchParams(searchParams);
    if (courseId) {
      nextParams.set("course", String(courseId));
    } else {
      nextParams.delete("course");
    }
    if (tab) {
      nextParams.set("tab", tab);
    } else {
      nextParams.delete("tab");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const openNewCourse = () => {
    updateEditorParams({ tab: "details" });
    setEditing(newCourseTemplate);
  };

  const openCourseEditor = (course, tab = "details") => {
    updateEditorParams({ courseId: course.id, tab });
    setEditing(course);
  };

  const handleEditorSaved = (course) => {
    handleSaved(course);
    updateEditorParams();
  };

  const handleEditorCancel = () => {
    updateEditorParams();
    setEditing(null);
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!organization) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <EmptyState
          icon={Building}
          title="No organization found"
          description="You need an organization before you can build courses."
          actionLabel="Set Up Organization"
          onAction={() => {
            window.location.href = "/organization-profile";
          }}
        />
      </div>
    );
  }

  if (editing) {
    return (
      <CourseEditor
        course={editing}
        org={organization}
        onSaved={handleEditorSaved}
        onCancel={handleEditorCancel}
        activeTab={requestedTab}
        onTabChange={(tab) =>
          updateEditorParams({
            courseId: editing?.id || requestedCourseId,
            tab,
          })
        }
      />
    );
  }

  const organizationVerified = isVerifiedOrganization(organization);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Course Builder"
        description={`Create and manage courses for ${organization.name}.`}
        actions={
          <Button
            className="bg-teal-600 hover:bg-teal-700 gap-2"
            onClick={openNewCourse}
          >
            <Plus className="w-4 h-4" /> New Course
          </Button>
        }
      />

      {!organizationVerified ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your organization is currently unverified, so course publishing is limited to free offerings.
          Paid course creation becomes available after verification is approved.
        </div>
      ) : null}

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Create your first course to start reaching learners."
          actionLabel="Create Course"
          onAction={openNewCourse}
        />
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="rounded-xl border border-border/50 bg-white p-4 card-hover"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50">
                    <BookOpen className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{course.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {course.category || "Uncategorized"} · {course.modules?.length || 0} modules ·{" "}
                      {course.total_lessons || 0} lessons
                      {course.instructors?.length
                        ? ` · ${course.instructors.length} instructors`
                        : ""}
                    </div>
                    {course.instructors?.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {course.instructors.slice(0, 3).map((instructor) => (
                          <span
                            key={instructor.id || instructor.email || instructor.full_name}
                            className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground"
                          >
                            {instructor.full_name || instructor.email}
                          </span>
                        ))}
                        {course.instructors.length > 3 ? (
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                            +{course.instructors.length - 3} more
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={course.status} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openCourseEditor(course, "instructors")}
                    className="gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" /> Instructors
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openCourseEditor(course, "details")}
                    className="gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
