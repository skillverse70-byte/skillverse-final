import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, PlayCircle } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import ParticipationReviewDialog from "@/features/reviews/components/ParticipationReviewDialog";

export default function LearningEnrollmentCard({
  enrollment,
  primaryLabel = "Open course",
  showModuleHint = true,
}) {
  const course = enrollment.course_program;
  const nextLesson = enrollment.next_lesson;
  const isCompleted = enrollment.status === "completed";

  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <BookOpen className="h-5 w-5" />
              )}
            </div>
            <StatusBadge status={enrollment.status} />
          </div>

          <h3 className="font-heading text-lg font-semibold text-foreground">
            {course?.title || "Course"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {course?.organization_name || "Organization"}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-secondary/35 px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Progress
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {enrollment.progress_percent || 0}%
              </div>
            </div>
            <div className="rounded-xl bg-secondary/35 px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Completed
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {enrollment.completed_lessons || 0} / {enrollment.total_lessons || 0} lessons
              </div>
            </div>
            <div className="rounded-xl bg-secondary/35 px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Next step
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {isCompleted ? "Course complete" : nextLesson?.title || "Continue learning"}
              </div>
            </div>
          </div>

          {showModuleHint && nextLesson && !isCompleted ? (
            <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/70 px-3 py-3 text-sm text-teal-900">
              <div className="inline-flex items-center gap-2 font-medium">
                <PlayCircle className="h-4 w-4" />
                Next unlocked lesson
              </div>
              <div className="mt-1">
                {nextLesson.title}
                {nextLesson.module_title ? ` in ${nextLesson.module_title}` : ""}
              </div>
            </div>
          ) : null}
        </div>

        {course?.id ? (
          <div className="flex flex-col gap-2 sm:pl-4">
            {isCompleted ? (
              <ParticipationReviewDialog
                context="course"
                sourceId={enrollment.id}
                title="Review this course"
                description="Share feedback after finishing the course. Reviews stay tied to the completed enrollment record."
                triggerLabel="Review course"
                triggerVariant="default"
                triggerClassName="bg-teal-600 hover:bg-teal-700"
                triggerSize="default"
              />
            ) : null}
            <Link to={`/courses/${course.id}`}>
              <Button variant={isCompleted ? "outline" : "default"} className="gap-2">
                {isCompleted ? "Open course" : primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : null}
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-teal-600 transition-all"
          style={{ width: `${enrollment.progress_percent || 0}%` }}
        />
      </div>
    </div>
  );
}
