import React, { useMemo, useState } from "react";
import { BookOpen, GraduationCap, LineChart, Users } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";

function formatPercent(value) {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${Math.round(numeric)}%`;
}

function getStatusLabel(status) {
  if (status === "completed") {
    return "Completed";
  }
  if (status === "active" || status === "enrolled") {
    return "Active";
  }
  return status || "Unknown";
}

function buildCourseAnalytics(courses, enrollments) {
  const courseMap = new Map();

  courses.forEach((course) => {
    courseMap.set(course.id, {
      id: course.id,
      title: course.title,
      category: course.category || "General",
      enrollments: 0,
      active: 0,
      completed: 0,
      progressTotal: 0,
    });
  });

  enrollments.forEach((enrollment) => {
    const course = enrollment.course_program || {};
    const current = courseMap.get(course.id) || {
      id: course.id,
      title: course.title || "Untitled course",
      category: course.category || "General",
      enrollments: 0,
      active: 0,
      completed: 0,
      progressTotal: 0,
    };

    current.enrollments += 1;
    current.progressTotal += Number(enrollment.progress_percent || 0);
    if (enrollment.status === "completed") {
      current.completed += 1;
    } else {
      current.active += 1;
    }

    courseMap.set(current.id, current);
  });

  return Array.from(courseMap.values())
    .map((course) => ({
      ...course,
      averageProgress: course.enrollments
        ? Math.round(course.progressTotal / course.enrollments)
        : 0,
      completionRate: course.enrollments
        ? Math.round((course.completed / course.enrollments) * 100)
        : 0,
    }))
    .sort((left, right) => {
      if (right.completionRate !== left.completionRate) {
        return right.completionRate - left.completionRate;
      }
      if (right.averageProgress !== left.averageProgress) {
        return right.averageProgress - left.averageProgress;
      }
      return right.enrollments - left.enrollments;
    });
}

export default function OrganizationEnrollmentPanel({
  courses,
  enrollments,
  onOpenCourses,
}) {
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const courseAnalytics = useMemo(
    () => buildCourseAnalytics(courses, enrollments),
    [courses, enrollments],
  );

  const filteredEnrollments = useMemo(
    () =>
      enrollments.filter((enrollment) => {
        if (
          selectedCourseId !== "all" &&
          String(enrollment.course_program?.id || "") !== selectedCourseId
        ) {
          return false;
        }

        if (selectedStatus !== "all" && enrollment.status !== selectedStatus) {
          return false;
        }

        return true;
      }),
    [enrollments, selectedCourseId, selectedStatus],
  );

  const summary = useMemo(() => {
    const total = filteredEnrollments.length;
    const completed = filteredEnrollments.filter(
      (enrollment) => enrollment.status === "completed",
    ).length;
    const active = total - completed;
    const averageProgress = total
      ? Math.round(
          filteredEnrollments.reduce(
            (sum, enrollment) => sum + Number(enrollment.progress_percent || 0),
            0,
          ) / total,
        )
      : 0;

    return {
      total,
      active,
      completed,
      averageProgress,
    };
  }, [filteredEnrollments]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsCard icon={Users} label="Learners" value={summary.total} accent="text-teal-700" />
        <AnalyticsCard
          icon={GraduationCap}
          label="Active"
          value={summary.active}
          accent="text-amber-600"
        />
        <AnalyticsCard
          icon={BookOpen}
          label="Completed"
          value={summary.completed}
          accent="text-emerald-600"
        />
        <AnalyticsCard
          icon={LineChart}
          label="Avg. progress"
          value={formatPercent(summary.averageProgress)}
          accent="text-sky-600"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <div className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
          <div className="flex flex-col gap-4 border-b border-border/60 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Enrollment management
              </h2>
              <p className="text-sm text-muted-foreground">
                Filter by course and monitor learner progress.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex min-w-[180px] flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Course
                <select
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground"
                >
                  <option value="all">All courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={String(course.id)}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-[160px] flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="enrolled">Enrolled</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>
          </div>

          {filteredEnrollments.length === 0 ? (
            <div className="pt-6">
              <EmptyState
                icon={Users}
                title="No learners match this view"
                description="Adjust the filters or publish a course to start tracking progress."
                actionLabel="Manage courses"
                onAction={onOpenCourses}
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredEnrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="rounded-2xl border border-border/50 bg-secondary/15 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-foreground">
                          {enrollment.learner?.full_name || enrollment.learner?.email}
                        </h3>
                        <StatusBadge
                          status={enrollment.status}
                          label={getStatusLabel(enrollment.status)}
                        />
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {enrollment.learner?.email}
                      </div>
                      <div className="mt-2 text-sm text-foreground">
                        {enrollment.course_program?.title || "Course"}
                      </div>
                    </div>

                    <div className="min-w-[220px] space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-foreground">
                          {formatPercent(enrollment.progress_percent)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-teal-600 transition-all"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, Number(enrollment.progress_percent || 0)),
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {enrollment.completed_lessons || 0}/{enrollment.total_lessons || 0} lessons
                        </span>
                        <span>{getStatusLabel(enrollment.status)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Best-performing courses
                </h2>
                <p className="text-sm text-muted-foreground">
                  Ranked by completion rate, then average progress.
                </p>
              </div>
              <Button type="button" variant="outline" className="shrink-0" onClick={onOpenCourses}>
                Courses
              </Button>
            </div>

            {courseAnalytics.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Course analytics will appear after learners enroll.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {courseAnalytics.slice(0, 5).map((course) => (
                  <div
                    key={course.id}
                    className="rounded-2xl border border-border/50 bg-secondary/15 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{course.title}</div>
                        <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                          {course.category}
                        </div>
                      </div>
                      <StatusBadge
                        status={course.completionRate >= 70 ? "verified" : "pending"}
                        label={formatPercent(course.completionRate)}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <MiniStat label="Learners" value={course.enrollments} />
                      <MiniStat label="Completed" value={course.completed} />
                      <MiniStat label="Avg. progress" value={formatPercent(course.averageProgress)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
            <h2 className="font-heading text-lg font-semibold text-foreground">Course roster</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {courses.length} course{courses.length === 1 ? "" : "s"} in your workspace.
            </p>
            <div className="mt-4 space-y-3">
              {courses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Publish a course to start enrolling learners.
                </p>
              ) : (
                courses.slice(0, 6).map((course) => {
                  const analytics = courseAnalytics.find((item) => item.id === course.id);
                  return (
                    <div
                      key={course.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/15 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">
                          {course.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {analytics?.enrollments || 0} learners
                        </div>
                      </div>
                      <div className="text-sm font-medium text-teal-700">
                        {formatPercent(analytics?.averageProgress || 0)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function AnalyticsCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
      <div className={`inline-flex rounded-2xl bg-secondary/40 p-3 ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-heading text-3xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium text-foreground">{value}</div>
    </div>
  );
}
