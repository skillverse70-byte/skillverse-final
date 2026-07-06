import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clipboard,
  Download,
  FileText,
  HelpCircle,
  Lock,
  PlayCircle,
  Users,
  Video,
  ListChecks,
  NotebookPen,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import BookmarkButton from "@/components/shared/BookmarkButton";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { roles } from "@/lib/domain-enums";
import { ApiError } from "@/lib/http-client";
import { getPaidCourseEnrollmentGate } from "@/lib/trust-state";
import {
  completeCourseLesson,
  enrollInCourse,
  fetchLearnerCourseProgress,
  fetchPublicCourseDetail,
} from "@/services/courses/courses.service";

const lessonIcons = {
  video: Video,
  reading: FileText,
  quiz: HelpCircle,
  assignment: Clipboard,
  resource: Download,
  checklist: ListChecks,
  assessment: NotebookPen,
};

export default function CourseDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, actorRole, navigateToLogin } = useAuth();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [completingLessonId, setCompletingLessonId] = useState(null);

  const isLearner = actorRole === roles.regularUser;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const publicCourse = await fetchPublicCourseDetail(id);
        if (!active) {
          return;
        }
        setCourse(publicCourse);

        if (isAuthenticated && isLearner) {
          try {
            const learnerEnrollment = await fetchLearnerCourseProgress(id);
            if (active) {
              setEnrollment(learnerEnrollment);
            }
          } catch (error) {
            if (!(error instanceof ApiError) || error.status !== 404) {
              throw error;
            }
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [id, isAuthenticated, isLearner]);

  const contentModules = enrollment?.modules?.length ? enrollment.modules : course?.modules || [];
  const totalLessons = enrollment?.total_lessons || course?.total_lessons || 0;
  const organization = course
    ? {
        id: course.organization_id,
        verification_status: course.organization_verification_status,
        is_verified: course.is_verified,
      }
    : null;

  const enrollmentGate = useMemo(
    () =>
      getPaidCourseEnrollmentGate({
        organization,
        financialAccount: course?.financial_account || null,
        isFree: course?.is_free,
        enrollmentOpen: course?.enrollment_open,
      }),
    [course, organization],
  );

  const cta = useMemo(() => {
    if (!course) {
      return { label: "Loading...", disabled: true, action: null };
    }

    if (!isAuthenticated) {
      return {
        label: "Log in to Enroll",
        disabled: false,
        action: navigateToLogin,
      };
    }

    if (!isLearner) {
      return {
        label: "Learner enrollment only",
        disabled: true,
        action: null,
      };
    }

    if (enrollment) {
      return {
        label:
          enrollment.status === "completed" ? "Course Completed" : "Continue Learning",
        disabled: enrollment.status === "completed",
        action: null,
      };
    }

    return {
      label: enrollmentGate.label,
      disabled: !enrollmentGate.canEnroll,
      action: async () => {
        setEnrolling(true);
        try {
          const nextEnrollment = await enrollInCourse(id);
          setEnrollment(nextEnrollment);
          toast({ title: "You are enrolled and ready to learn." });
        } catch (error) {
          console.error(error);
          toast({
            title: "Unable to enroll",
            description: error?.message || "Something went wrong.",
            variant: "destructive",
          });
        } finally {
          setEnrolling(false);
        }
      },
    };
  }, [course, enrollment, enrollmentGate, id, isAuthenticated, isLearner, navigateToLogin, toast]);

  if (loading) {
    return <PageLoader />;
  }

  if (!course) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="font-heading font-bold text-xl mb-2">Course not found</h2>
        <Link to="/courses">
          <Button variant="outline">Back to Courses</Button>
        </Link>
      </div>
    );
  }

  const handleLessonComplete = async (lessonId) => {
    setCompletingLessonId(lessonId);
    try {
      const nextEnrollment = await completeCourseLesson(id, lessonId);
      setEnrollment(nextEnrollment);
      toast({ title: "Lesson marked complete." });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to update progress",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setCompletingLessonId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link
        to="/courses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="aspect-video bg-gradient-to-br from-teal-100 to-emerald-50 rounded-2xl overflow-hidden mb-6">
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-16 h-16 text-teal-300" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <StatusBadge
              status={course.is_free ? "free" : "paid"}
              label={
                course.is_free
                  ? "Free"
                  : `${course.price_currency || "ETB"} ${course.price || 0}`
              }
            />
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
              {course.category || "General"}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground capitalize">
              {course.difficulty}
            </span>
            {!enrollmentGate.canEnroll && !enrollment && (
              <StatusBadge
                status={enrollmentGate.status}
                label={enrollmentGate.label}
              />
            )}
            {enrollment && (
              <StatusBadge
                status={enrollment.status}
                label={enrollment.status.replace("_", " ")}
              />
            )}
          </div>

          <h1 className="font-heading font-bold text-2xl sm:text-3xl mb-3">
            {course.title}
          </h1>

          {course.organization_name && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-4">
              by{" "}
              {course.organization_id ? (
                <Link
                  to={`/organizations/${course.organization_id}`}
                  className="font-medium text-foreground hover:text-teal-700 hover:underline"
                >
                  {course.organization_name}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{course.organization_name}</span>
              )}
              <StatusBadge organization={organization} />
            </p>
          )}

          {course.instructor_name && (
            <p className="text-sm text-muted-foreground mb-6">
              Instructor:{" "}
              <span className="font-medium text-foreground">{course.instructor_name}</span>
            </p>
          )}

          <p className="text-foreground leading-relaxed mb-8">{course.description}</p>

          {enrollment && (
            <div className="mb-8 rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-heading font-semibold text-lg">Your Progress</h2>
                  <p className="text-sm text-muted-foreground">
                    {enrollment.completed_lessons} of {enrollment.total_lessons} lessons completed.
                  </p>
                </div>
                <div className="min-w-[180px]">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{enrollment.progress_percent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/80">
                    <div
                      className="h-full rounded-full bg-teal-600 transition-all"
                      style={{ width: `${enrollment.progress_percent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h2 className="font-heading font-semibold text-xl mb-4">Course Content</h2>
            {contentModules.length === 0 ? (
              <div className="bg-secondary/50 rounded-xl p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Course content is being prepared. Check back soon!
                </p>
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-3">
                {[...contentModules]
                  .sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0))
                  .map((module, moduleIndex) => (
                    <AccordionItem
                      key={module.id || moduleIndex}
                      value={`mod-${module.id || moduleIndex}`}
                      className="bg-white rounded-xl border border-border/50 px-5 overflow-hidden"
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 font-semibold text-sm flex-shrink-0">
                            {moduleIndex + 1}
                          </div>
                          <div>
                            <div className="font-heading font-semibold text-sm">{module.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {module.lessons?.length || 0} lessons
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="space-y-2 pl-11">
                          {(module.lessons || [])
                            .sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0))
                            .map((lesson, lessonIndex) => {
                              const LessonIcon = lessonIcons[lesson.type] || FileText;
                              const isLocked = enrollment ? !lesson.is_unlocked : false;
                              const isCompleted = lesson.is_completed;
                              const canComplete =
                                Boolean(enrollment) &&
                                lesson.is_unlocked &&
                                !lesson.is_completed;

                              return (
                                <div
                                  key={lesson.id || lessonIndex}
                                  className={`rounded-lg border p-3 transition-colors ${
                                    isLocked
                                      ? "border-border/40 bg-secondary/20 opacity-70"
                                      : "border-border/50 hover:bg-secondary/40"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                      {isCompleted ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                      ) : isLocked ? (
                                        <Lock className="w-4 h-4 text-muted-foreground" />
                                      ) : (
                                        <LessonIcon className="w-4 h-4 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="text-sm font-medium">{lesson.title}</div>
                                        <span className="text-[11px] text-muted-foreground capitalize bg-secondary px-2 py-0.5 rounded">
                                          {lesson.type}
                                        </span>
                                        {lesson.progression_gate && (
                                          <span className="text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                                            Gate
                                          </span>
                                        )}
                                        {isCompleted && (
                                          <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                            Completed
                                          </span>
                                        )}
                                        {isLocked && (
                                          <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                                            Locked
                                          </span>
                                        )}
                                      </div>
                                      {lesson.description && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {lesson.description}
                                        </div>
                                      )}
                                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                                        {lesson.duration_minutes > 0 && (
                                          <span>{lesson.duration_minutes} min</span>
                                        )}
                                        {lesson.progression_gate && (
                                          <span>Complete this to unlock later lessons</span>
                                        )}
                                      </div>
                                    </div>
                                    {canComplete && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5"
                                        disabled={completingLessonId === lesson.id}
                                        onClick={() => handleLessonComplete(lesson.id)}
                                      >
                                        <PlayCircle className="w-3.5 h-3.5" />
                                        {completingLessonId === lesson.id
                                          ? "Saving..."
                                          : "Mark complete"}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-2xl border border-border/50 p-6">
            <div className="text-center mb-5">
              {course.is_free ? (
                <div className="font-heading font-bold text-3xl text-teal-600">Free</div>
              ) : (
                <div className="font-heading font-bold text-3xl">
                  {course.price_currency || "ETB"} {course.price || 0}
                </div>
              )}
            </div>

            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 h-11 text-base mb-4"
              disabled={cta.disabled || enrolling}
              onClick={cta.action || undefined}
            >
              {enrolling ? "Enrolling..." : cta.label}
            </Button>

            {isAuthenticated && !isLearner && (
              <p className="mb-4 text-xs text-muted-foreground text-center">
                Course progression is a regular-user learning flow.
              </p>
            )}

            <BookmarkButton
              itemType="course"
              itemId={course.id}
              itemTitle={course.title}
              itemSubtitle={course.organization_name}
              itemCategory={course.category}
              className="w-full mb-4 justify-center"
            />

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Lessons
                </span>
                <span className="font-medium">{totalLessons}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" /> Enrolled
                </span>
                <span className="font-medium">{course.enrolled_count || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Level</span>
                <span className="font-medium capitalize">{course.difficulty}</span>
              </div>
            </div>

            {course.tags?.length > 0 && (
              <div className="mt-5 pt-4 border-t border-border/50">
                <div className="flex flex-wrap gap-1.5">
                  {course.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
