import React from "react";
import { Plus, BookOpen, Edit2, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import CourseEditor from "@/features/courses/course-builder/components/CourseEditor";
import { useCourseBuilder } from "@/hooks/courses/useCourseBuilder";
import { isVerifiedOrganization } from "@/lib/trust-state";

export default function CourseBuilderPage() {
  const { organization, courses, editing, setEditing, loading, handleSaved } =
    useCourseBuilder();

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
        onSaved={handleSaved}
        onCancel={() => setEditing(null)}
      />
    );
  }

  const organizationVerified = isVerifiedOrganization(organization);

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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Course Builder"
        description={`Create and manage courses for ${organization.name}.`}
        actions={
          <Button
            className="bg-teal-600 hover:bg-teal-700 gap-2"
            onClick={() => setEditing(newCourseTemplate)}
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
          onAction={() => setEditing(newCourseTemplate)}
        />
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl border border-border/50 p-4 flex items-center gap-4 card-hover"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{course.title}</div>
                <div className="text-xs text-muted-foreground">
                  {course.category || "Uncategorized"} · {course.modules?.length || 0} modules ·{" "}
                  {course.total_lessons || 0} lessons
                </div>
              </div>
              <StatusBadge status={course.status} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(course)}
                className="gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
