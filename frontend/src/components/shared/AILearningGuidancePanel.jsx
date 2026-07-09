import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookMarked,
  ClipboardCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { aiRolloutStates } from "@/lib/domain-enums";

function ModePill({ label, active, fallback }) {
  const className = active
    ? "border-teal-200 bg-teal-50 text-teal-700"
    : fallback
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-border/60 bg-secondary/20 text-muted-foreground";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function readinessLabel(value) {
  if (value === "ready") {
    return "Ready now";
  }
  if (value === "completed") {
    return "Completed";
  }
  return "Coming up";
}

export default function AILearningGuidancePanel({
  title = "Learning guidance",
  description = "",
  guidance,
  guidanceFeature,
  assignmentFeature,
  loading = false,
  error = "",
  emptyTitle = "Learning guidance will appear here",
  emptyDescription = "As course progress and skill signals grow, more targeted guidance will show up here.",
  action = null,
  compact = false,
}) {
  if (loading) {
    return (
      <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
        <div className="h-6 w-56 animate-pulse rounded-full bg-secondary/50" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-secondary/40" />
        <div className="mt-2 h-4 w-4/5 animate-pulse rounded-full bg-secondary/30" />
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="h-28 animate-pulse rounded-2xl bg-secondary/30" />
          <div className="h-28 animate-pulse rounded-2xl bg-secondary/20" />
        </div>
      </section>
    );
  }

  const safeGuidance = guidance || {};
  const skillGaps = Array.isArray(safeGuidance.skill_gaps) ? safeGuidance.skill_gaps : [];
  const nextActions = Array.isArray(safeGuidance.next_actions) ? safeGuidance.next_actions : [];
  const assignmentFeedback = Array.isArray(safeGuidance.assignment_feedback)
    ? safeGuidance.assignment_feedback
    : [];
  const courseContext = safeGuidance.course_context || null;
  const enrollment = safeGuidance.enrollment || null;
  const lessonFocus = safeGuidance.lesson_focus || null;
  const hasContent =
    Boolean(safeGuidance.guidance_summary) ||
    Boolean(courseContext) ||
    skillGaps.length > 0 ||
    nextActions.length > 0 ||
    assignmentFeedback.length > 0;

  if (!hasContent && !error) {
    return (
      <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-teal-600" />
          <h2 className="font-heading text-lg font-semibold text-foreground">{emptyTitle}</h2>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{emptyDescription}</p>
      </section>
    );
  }

  const guidanceReady =
    guidanceFeature?.rollout_state === aiRolloutStates.ready && guidanceFeature?.available;
  const assignmentReady =
    assignmentFeature?.rollout_state === aiRolloutStates.ready && assignmentFeature?.available;

  return (
    <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
          </div>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <ModePill
            label={safeGuidance.used_ai ? "AI guidance active" : "Fallback guidance"}
            active={Boolean(safeGuidance.used_ai)}
            fallback={Boolean(safeGuidance.fallback_active)}
          />
          <ModePill
            label={assignmentReady ? "Assignment feedback ready" : "Assignment fallback"}
            active={assignmentReady}
            fallback={!assignmentReady}
          />
        </div>
      </div>

      {action ? <div className="mt-5">{action}</div> : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {safeGuidance.guidance_summary ? (
        <div className="mt-5 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-emerald-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            Guidance summary
          </div>
          <p className="mt-2 text-sm leading-6 text-foreground">{safeGuidance.guidance_summary}</p>
        </div>
      ) : null}

      <div className={`mt-5 ${compact ? "space-y-4" : "grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]"}`}>
        <div className="space-y-4">
          {(courseContext || enrollment || lessonFocus) ? (
            <div className="rounded-2xl border border-border/60 bg-secondary/10 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BookMarked className="h-4 w-4 text-teal-700" />
                Course focus
              </div>
              {courseContext ? (
                <div className="mt-3">
                  <div className="font-medium text-foreground">{courseContext.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {courseContext.category || "General"} · {courseContext.difficulty || "All levels"}
                  </div>
                </div>
              ) : null}
              {enrollment ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Progress</div>
                    <div className="mt-1 font-heading text-2xl font-bold text-foreground">
                      {enrollment.progress_percent}%
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Lessons done</div>
                    <div className="mt-1 font-heading text-2xl font-bold text-foreground">
                      {enrollment.completed_lessons}/{enrollment.total_lessons}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
                    <div className="mt-1 font-medium capitalize text-foreground">{enrollment.status}</div>
                  </div>
                </div>
              ) : null}
              {lessonFocus ? (
                <div className="mt-4 rounded-2xl bg-white px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Next lesson focus
                  </div>
                  <div className="mt-2 font-medium text-foreground">{lessonFocus.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {lessonFocus.module_title || "Module"} · {lessonFocus.item_type}
                    {lessonFocus.duration_minutes ? ` · ${lessonFocus.duration_minutes} min` : ""}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-2xl border border-border/60 bg-white p-5">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-600" />
              <h3 className="font-medium text-foreground">Skill-gap analysis</h3>
            </div>
            {skillGaps.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                More skill-gap data will appear here once learning signals grow.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {skillGaps.map((gap) => (
                  <div key={gap.skill} className="rounded-2xl bg-secondary/15 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-foreground">{gap.skill}</div>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {gap.priority} priority
                      </span>
                      {gap.used_ai ? (
                        <span className="rounded-full bg-teal-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                          AI tuned
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{gap.rationale}</p>
                    {gap.suggested_actions?.length ? (
                      <div className="mt-3 space-y-2">
                        {gap.suggested_actions.map((item) => (
                          <div key={item} className="text-sm text-foreground">
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-white p-5">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-teal-600" />
              <h3 className="font-medium text-foreground">Next actions</h3>
            </div>
            {nextActions.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Clear next actions will appear here as the learner builds more activity.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {nextActions.map((item) => (
                  <Link
                    key={item.key}
                    to={item.route}
                    className="block rounded-2xl border border-border/50 bg-secondary/10 p-4 transition hover:border-teal-200 hover:bg-teal-50/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">{item.title}</div>
                        <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                      </div>
                      <ArrowRight className="mt-0.5 h-4 w-4 text-teal-700" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-white p-5">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-sky-600" />
              <h3 className="font-medium text-foreground">Assignment feedback</h3>
            </div>
            {assignmentFeedback.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Assignment-aware coaching will appear once this course includes practice checkpoints.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {assignmentFeedback.map((item) => (
                  <div key={item.lesson_id} className="rounded-2xl bg-secondary/15 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-foreground">{item.lesson_title}</div>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {readinessLabel(item.readiness)}
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {item.item_type}
                      </span>
                      {item.used_ai ? (
                        <span className="rounded-full bg-teal-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                          AI tuned
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.feedback}</p>
                    {item.checklist?.length ? (
                      <div className="mt-3 space-y-2">
                        {item.checklist.map((entry) => (
                          <div key={entry} className="text-sm text-foreground">
                            {entry}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
