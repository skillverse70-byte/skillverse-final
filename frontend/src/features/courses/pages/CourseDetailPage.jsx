import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clipboard,
  CreditCard,
  Download,
  FileText,
  HelpCircle,
  Lock,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Target,
  Users,
  Video,
  ListChecks,
  NotebookPen,
} from "lucide-react";
import AIAdaptiveMonitoringPanel from "@/components/shared/AIAdaptiveMonitoringPanel";
import ModuleDetailShell from "@/components/shared/ModuleDetailShell";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TabsContent } from "@/components/ui/tabs";
import AILearningGuidancePanel from "@/components/shared/AILearningGuidancePanel";
import AIRecommendationDeck from "@/components/shared/AIRecommendationDeck";
import BookmarkButton from "@/components/shared/BookmarkButton";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import PaidEnrollmentStatus from "@/features/courses/components/PaidEnrollmentStatus";
import ParticipationReviewDialog from "@/features/reviews/components/ParticipationReviewDialog";
import { useAIAdaptiveMonitoring } from "@/hooks/ai/useAIAdaptiveMonitoring";
import { useAILearningGuidance } from "@/hooks/ai/useAILearningGuidance";
import { useAIRecommendationFeed } from "@/hooks/ai/useAIRecommendationFeed";
import { useDetailPageTab } from "@/hooks/dashboard/useDetailPageTab";
import {
  buildCourseRecommendationItems,
  buildEventRecommendationItems,
  buildOpportunityRecommendationItems,
} from "@/lib/ai-recommendation-items";
import { paymentTransactionStatuses, roles } from "@/lib/domain-enums";
import { ApiError } from "@/lib/http-client";
import { getPaidCourseEnrollmentGate } from "@/lib/trust-state";
import {
  completeCourseLesson,
  createCourseCheckout,
  enrollInCourse,
  fetchCourseCheckouts,
  fetchLearnerCourseProgress,
  fetchPublicCourseDetail,
  syncVerifiedCourseEnrollment,
  verifyCourseCheckout,
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

function getEmbeddedVideoUrl(url) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }
    if (host === "youtu.be") {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }
    if (host === "youtube-nocookie.com") {
      return url;
    }
    if (host === "vimeo.com") {
      const videoId = parsed.pathname.split("/").filter(Boolean).pop();
      return videoId ? `https://player.vimeo.com/video/${videoId}` : "";
    }
    if (host === "player.vimeo.com") {
      return url;
    }
  } catch {
    return "";
  }

  return "";
}

function isPdfFile(url) {
  return /\.pdf($|\?)/i.test(url || "");
}

function countRecommendationItems(sections) {
  return sections.reduce((total, section) => total + (section.items?.length || 0), 0);
}

export default function CourseDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAuthenticated, actorRole, navigateToLogin } = useAuth();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [paymentTransaction, setPaymentTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [completingLessonId, setCompletingLessonId] = useState(null);
  const handledPaymentReturn = useRef(null);
  const isLearner = actorRole === roles.regularUser;
  const {
    adaptiveState,
    loading: adaptiveLoading,
    submitting: adaptiveSubmitting,
    error: adaptiveError,
    submitCheckIn,
  } = useAIAdaptiveMonitoring({
    enabled: isAuthenticated && isLearner,
    courseId: id,
    surface: "/courses/:id",
  });
  const {
    feature: recommendationFeature,
    feed: recommendationFeed,
    loading: recommendationsLoading,
    error: recommendationsError,
  } = useAIRecommendationFeed({
    enabled: isAuthenticated && isLearner,
    limitPerType: 2,
  });
  const {
    guidanceFeature,
    assignmentFeature,
    guidance,
    loading: guidanceLoading,
    error: guidanceError,
  } = useAILearningGuidance({
    enabled: isAuthenticated && isLearner,
    courseId: id,
  });
  const returnedPaymentReference = searchParams.get("payment_tx_ref");

  const scrollToLesson = (lessonId) => {
    const element = document.getElementById(`lesson-${lessonId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

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

            try {
              const transactions = await fetchCourseCheckouts();
              const latestCoursePayment = transactions.find(
                (transaction) =>
                  Number(transaction.course_program?.id) === Number(id),
              );
              if (active) {
                setPaymentTransaction(latestCoursePayment || null);
              }
            } catch (paymentError) {
              console.error(paymentError);
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

  useEffect(() => {
    if (
      !returnedPaymentReference ||
      !course ||
      enrollment ||
      !isAuthenticated ||
      !isLearner ||
      handledPaymentReturn.current === returnedPaymentReference
    ) {
      return undefined;
    }

    let active = true;
    handledPaymentReturn.current = returnedPaymentReference;

    const reconcileReturnedPayment = async () => {
      setEnrolling(true);
      try {
        const transaction = await verifyCourseCheckout(returnedPaymentReference);
        if (!active) {
          return;
        }
        setPaymentTransaction(transaction);

        if (transaction.enrollment_ready) {
          const nextEnrollment = await syncVerifiedCourseEnrollment(id);
          if (!active) {
            return;
          }
          setEnrollment(nextEnrollment);
          toast({
            title: "Payment verified",
            description: "Your enrollment is active and the course is ready.",
          });
        } else {
          toast({
            title: "Payment is still pending",
            description: "Use Check payment status after completing Chapa checkout.",
          });
        }

        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete("payment_tx_ref");
        setSearchParams(nextSearchParams, { replace: true });
      } catch (error) {
        console.error(error);
        toast({
          title: "Unable to verify payment",
          description: error?.message || "Please check the payment status again.",
          variant: "destructive",
        });
      } finally {
        if (active) {
          setEnrolling(false);
        }
      }
    };

    reconcileReturnedPayment();

    return () => {
      active = false;
    };
  }, [
    course,
    enrollment,
    id,
    isAuthenticated,
    isLearner,
    returnedPaymentReference,
    searchParams,
    setSearchParams,
    toast,
  ]);

  const contentModules = enrollment?.modules?.length ? enrollment.modules : course?.modules || [];
  const totalLessons = enrollment?.total_lessons || course?.total_lessons || 0;
  const contentLocked = !enrollment;
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
  const recommendationSections = useMemo(
    () => [
      {
        key: "courses",
        title: "Related courses",
        icon: BookOpen,
        description: "Adjacent learning paths connected to the same signals.",
        items: buildCourseRecommendationItems(
          recommendationFeed.course_recommendations,
          { excludeIds: [Number(id)] },
        ),
      },
      {
        key: "events",
        title: "Relevant events",
        icon: Users,
        description: "Live sessions that reinforce this learning path.",
        items: buildEventRecommendationItems(recommendationFeed.event_recommendations),
      },
      {
        key: "jobs",
        title: "Opportunities",
        icon: Clipboard,
        description: "Where this learning path could lead next.",
        items: buildOpportunityRecommendationItems(
          recommendationFeed.opportunity_recommendations,
        ),
      },
    ],
    [id, recommendationFeed],
  );
  const learnerCourseTabs = useMemo(
    () => [
      {
        value: "overview",
        label: "Course detail",
        description: "Overview, enrollment state, lesson structure, and progression.",
        icon: BookOpen,
      },
      {
        value: "recommendations",
        label: "Next moves",
        description: "Related courses, events, and opportunities connected to this path.",
        icon: Sparkles,
        badge: countRecommendationItems(recommendationSections),
      },
      {
        value: "guidance",
        label: "Learning guidance",
        description: "Skill-gap analysis, next actions, and assignment-ready coaching.",
        icon: Target,
      },
      {
        value: "focus",
        label: "Focus mirror",
        description: "Adaptive check-ins and focus-state support for this course.",
        icon: BrainCircuit,
      },
    ],
    [recommendationSections],
  );
  const courseTabs = isAuthenticated && isLearner
    ? learnerCourseTabs
    : learnerCourseTabs.slice(0, 1);
  const { activeTab, setActiveTab } = useDetailPageTab(
    courseTabs.map((tab) => tab.value),
    "overview",
  );

  const handlePaidEnrollment = async () => {
    setEnrolling(true);
    try {
      if (
        paymentTransaction?.status === paymentTransactionStatuses.succeeded ||
        paymentTransaction?.enrollment_ready
      ) {
        const nextEnrollment = await syncVerifiedCourseEnrollment(id);
        setEnrollment(nextEnrollment);
        toast({ title: "Your enrollment is active and ready to learn." });
        return;
      }

      if (paymentTransaction?.status === paymentTransactionStatuses.pending) {
        const transaction = await verifyCourseCheckout(paymentTransaction.tx_ref);
        setPaymentTransaction(transaction);
        if (transaction.enrollment_ready) {
          const nextEnrollment = await syncVerifiedCourseEnrollment(id);
          setEnrollment(nextEnrollment);
          toast({
            title: "Payment verified",
            description: "Your enrollment is active and the course is ready.",
          });
        } else {
          toast({
            title: "Payment is still pending",
            description: "Complete checkout in Chapa, then check again.",
          });
        }
        return;
      }

      const transaction = await createCourseCheckout(id);
      setPaymentTransaction(transaction);
      if (!transaction.checkout_url) {
        throw new Error("Chapa checkout is not available for this payment.");
      }
      window.location.assign(transaction.checkout_url);
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to continue enrollment",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const cta = (() => {
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
        disabled: enrollment.status === "completed" ? true : false,
        action: () => {
          if (enrollment.next_lesson_id) {
            scrollToLesson(enrollment.next_lesson_id);
          }
        },
      };
    }

    if (!course.is_free) {
      if (enrollmentGate.canEnroll) {
        if (
          paymentTransaction?.status === paymentTransactionStatuses.succeeded ||
          paymentTransaction?.enrollment_ready
        ) {
          return {
            label: "Complete Enrollment",
            disabled: false,
            action: handlePaidEnrollment,
            icon: CheckCircle2,
          };
        }

        if (paymentTransaction?.status === paymentTransactionStatuses.pending) {
          return {
            label: "Check Payment Status",
            disabled: false,
            action: handlePaidEnrollment,
            icon: RefreshCw,
          };
        }

        return {
          label: `Pay ${course.price_currency || "ETB"} ${course.price || 0} with Chapa`,
          disabled: false,
          action: handlePaidEnrollment,
          icon: CreditCard,
        };
      }

      return {
        label: enrollmentGate.label,
        disabled: true,
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
  })();

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
  const CtaIcon = cta.icon;

  return (
    <ModuleDetailShell
      backHref="/courses"
      backLabel="Back to Courses"
      eyebrow="Course workspace"
      title={course.title}
      description="Keep the main learning flow focused here, then move into recommendations, guidance, or adaptive support when you need them."
      value={activeTab}
      onValueChange={setActiveTab}
      tabs={courseTabs}
    >
      <TabsContent value="overview" className="mt-0">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-6 aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-50">
              <div className="flex h-full w-full items-center justify-center">
                <BookOpen className="h-16 w-16 text-teal-300" />
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <StatusBadge
                status={course.is_free ? "free" : "paid"}
                label={
                  course.is_free
                    ? "Free"
                    : `${course.price_currency || "ETB"} ${course.price || 0}`
                }
              />
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {course.category || "General"}
              </span>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                {course.difficulty}
              </span>
              {!enrollmentGate.canEnroll && !enrollment ? (
                <StatusBadge
                  status={enrollmentGate.status}
                  label={enrollmentGate.label}
                />
              ) : null}
              {enrollment ? (
                <StatusBadge
                  status={enrollment.status}
                  label={enrollment.status.replace("_", " ")}
                />
              ) : null}
            </div>

            {course.organization_name ? (
              <p className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
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
            ) : null}

            {course.instructor_name ? (
              <p className="mb-6 text-sm text-muted-foreground">
                Instructor:{" "}
                <span className="font-medium text-foreground">{course.instructor_name}</span>
              </p>
            ) : null}

            <p className="mb-8 leading-relaxed text-foreground">{course.description}</p>

            {enrollment ? (
              <div className="mb-8 rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-lg font-semibold">Your Progress</h2>
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
                {enrollment.status === "completed" ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <ParticipationReviewDialog
                      context="course"
                      sourceId={enrollment.id}
                      title="Review this course"
                      description="Leave feedback tied to your completed enrollment so the platform can show trustworthy course participation reviews."
                      triggerLabel="Review course"
                      triggerVariant="default"
                      triggerClassName="bg-teal-600 hover:bg-teal-700"
                      triggerSize="default"
                    />
                    <Link to="/dashboard?tab=learning">
                      <Button variant="outline">Back to learning dashboard</Button>
                    </Link>
                  </div>
                ) : null}
                {enrollment.next_lesson && enrollment.status !== "completed" ? (
                  <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-teal-100 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                        Next unlocked lesson
                      </div>
                      <div className="mt-1 font-medium text-foreground">
                        {enrollment.next_lesson.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {enrollment.next_lesson.module_title
                          ? `Module: ${enrollment.next_lesson.module_title}`
                          : "Continue your current learning path."}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => scrollToLesson(enrollment.next_lesson_id)}
                    >
                      <PlayCircle className="h-4 w-4" />
                      Jump to next lesson
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mb-8">
              <h2 className="mb-4 font-heading text-xl font-semibold">Course Content</h2>
              {contentLocked ? (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
                  {course.is_free
                    ? "Enroll first to unlock lesson content in this free course. You can still preview the structure below."
                    : "You can preview the structure below, but lesson content stays locked until enrollment is completed."}
                </div>
              ) : null}
              {contentModules.length === 0 ? (
                <div className="rounded-xl bg-secondary/50 p-6 text-center">
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
                        className="overflow-hidden rounded-xl border border-border/50 bg-white px-5"
                      >
                        <AccordionTrigger className="py-4 hover:no-underline">
                          <div className="flex items-center gap-3 text-left">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 text-sm font-semibold text-teal-600">
                              {moduleIndex + 1}
                            </div>
                            <div>
                              <div className="font-heading text-sm font-semibold">{module.title}</div>
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
                                    id={lesson.id ? `lesson-${lesson.id}` : undefined}
                                    className={`rounded-lg border p-3 transition-colors ${
                                      isLocked
                                        ? "border-border/40 bg-secondary/20 opacity-70"
                                        : "border-border/50 hover:bg-secondary/40"
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="mt-0.5">
                                        {isCompleted ? (
                                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        ) : isLocked ? (
                                          <Lock className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                          <LessonIcon className="h-4 w-4 text-muted-foreground" />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <div className="text-sm font-medium">{lesson.title}</div>
                                          <span className="rounded bg-secondary px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                                            {lesson.type}
                                          </span>
                                          {lesson.progression_gate ? (
                                            <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">
                                              Gate
                                            </span>
                                          ) : null}
                                          {isCompleted ? (
                                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">
                                              Completed
                                            </span>
                                          ) : null}
                                          {isLocked ? (
                                            <span className="rounded bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                                              Locked
                                            </span>
                                          ) : null}
                                        </div>
                                        {lesson.description ? (
                                          <div className="mt-1 text-xs text-muted-foreground">
                                            {lesson.description}
                                          </div>
                                        ) : null}
                                        {Boolean(enrollment) && !isLocked ? (
                                          <div className="mt-3 space-y-3">
                                            {lesson.type === "video" && lesson.content_url ? (
                                              getEmbeddedVideoUrl(lesson.content_url) ? (
                                                <div className="overflow-hidden rounded-xl border border-border/60 bg-black">
                                                  <iframe
                                                    src={getEmbeddedVideoUrl(lesson.content_url)}
                                                    title={lesson.title}
                                                    className="aspect-video w-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                  />
                                                </div>
                                              ) : (
                                                <a
                                                  href={lesson.content_url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="inline-flex items-center gap-2 text-xs font-medium text-teal-700 hover:text-teal-800"
                                                >
                                                  Open video link
                                                  <Download className="h-3.5 w-3.5" />
                                                </a>
                                              )
                                            ) : null}

                                            {lesson.type === "resource" && lesson.content_file_url ? (
                                              <div className="rounded-xl border border-border/60 bg-white p-3">
                                                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                                  <div className="text-sm font-medium text-foreground">
                                                    Attached document
                                                  </div>
                                                  <a
                                                    href={lesson.content_file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-2 text-xs font-medium text-teal-700 hover:text-teal-800"
                                                  >
                                                    Open or download
                                                    <Download className="h-3.5 w-3.5" />
                                                  </a>
                                                </div>
                                                {isPdfFile(lesson.content_file_url) ? (
                                                  <iframe
                                                    src={lesson.content_file_url}
                                                    title={`${lesson.title} document`}
                                                    className="h-80 w-full rounded-lg border border-border/50"
                                                  />
                                                ) : (
                                                  <p className="text-xs text-muted-foreground">
                                                    This file type opens in a new tab or downloads directly.
                                                  </p>
                                                )}
                                              </div>
                                            ) : null}

                                            {lesson.type === "checklist" && lesson.checklist_items?.length ? (
                                              <div className="rounded-xl border border-border/60 bg-white p-3">
                                                <div className="mb-2 text-sm font-medium text-foreground">
                                                  Checklist
                                                </div>
                                                <div className="space-y-2">
                                                  {lesson.checklist_items.map((item, checklistIndex) => (
                                                    <div
                                                      key={`${lesson.id || lessonIndex}-check-${checklistIndex}`}
                                                      className="flex items-start gap-2 text-sm text-foreground"
                                                    >
                                                      <input
                                                        type="checkbox"
                                                        checked={Boolean(lesson.is_completed)}
                                                        readOnly
                                                        className="mt-0.5 rounded"
                                                      />
                                                      <span>{item}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            ) : null}

                                            {["reading", "quiz", "assignment", "assessment"].includes(lesson.type) &&
                                            lesson.content_url ? (
                                              <a
                                                href={lesson.content_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 text-xs font-medium text-teal-700 hover:text-teal-800"
                                              >
                                                Open {lesson.type}
                                                <Download className="h-3.5 w-3.5" />
                                              </a>
                                            ) : null}
                                          </div>
                                        ) : null}
                                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                          {lesson.duration_minutes > 0 ? (
                                            <span>{lesson.duration_minutes} min</span>
                                          ) : null}
                                          {lesson.progression_gate ? (
                                            <span>Complete this to unlock later lessons</span>
                                          ) : null}
                                        </div>
                                      </div>
                                      {canComplete ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1.5"
                                          disabled={completingLessonId === lesson.id}
                                          onClick={() => handleLessonComplete(lesson.id)}
                                        >
                                          <PlayCircle className="h-3.5 w-3.5" />
                                          {completingLessonId === lesson.id
                                            ? "Saving..."
                                            : "Mark complete"}
                                        </Button>
                                      ) : null}
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
            <div className="sticky top-24 space-y-4">
              <div className="rounded-2xl border border-border/50 bg-white p-6">
                <div className="mb-5 text-center">
                  {course.is_free ? (
                    <div className="font-heading text-3xl font-bold text-teal-600">Free</div>
                  ) : (
                    <div className="font-heading text-3xl font-bold">
                      {course.price_currency || "ETB"} {course.price || 0}
                    </div>
                  )}
                </div>

                <Button
                  className="mb-4 h-11 w-full gap-2 bg-teal-600 text-base hover:bg-teal-700"
                  disabled={cta.disabled || enrolling}
                  onClick={cta.action || undefined}
                >
                  {enrolling ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {CtaIcon ? <CtaIcon className="h-4 w-4" /> : null}
                      {cta.label}
                    </>
                  )}
                </Button>

                {!course.is_free && !enrollment ? (
                  <PaidEnrollmentStatus
                    enrollmentGate={enrollmentGate}
                    transaction={paymentTransaction}
                  />
                ) : null}

                {isAuthenticated && !isLearner ? (
                  <p className="mb-4 text-center text-xs text-muted-foreground">
                    Course progression is a regular-user learning flow.
                  </p>
                ) : null}

                <BookmarkButton
                  itemType="course"
                  itemId={course.id}
                  itemTitle={course.title}
                  itemSubtitle={course.organization_name}
                  itemCategory={course.category}
                  className="mb-4 w-full justify-center"
                />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between border-b border-border/50 py-2">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="h-4 w-4" /> Lessons
                    </span>
                    <span className="font-medium">{totalLessons}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 py-2">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" /> Enrolled
                    </span>
                    <span className="font-medium">{course.enrolled_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Level</span>
                    <span className="font-medium capitalize">{course.difficulty}</span>
                  </div>
                </div>

                {course.tags?.length > 0 ? (
                  <div className="mt-5 border-t border-border/50 pt-4">
                    <div className="flex flex-wrap gap-1.5">
                      {course.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-4 text-sm">
                  <div className="font-medium text-foreground">Verification and certificate path</div>
                  <p className="mt-2 text-muted-foreground">
                    Verified organizations can issue completion certificates after you finish eligible courses. Any certificate or related service record will appear in your certificate workspace.
                  </p>
                  <Link
                    to="/certificates"
                    className="mt-3 inline-flex text-sm font-medium text-teal-700 hover:text-teal-800"
                  >
                    Open certificates
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="recommendations" className="mt-0">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <AIRecommendationDeck
            title="Recommended next moves"
            description="These suggestions connect this course to related events, opportunities, and nearby learning paths without crowding the lesson view."
            feature={recommendationFeature}
            feed={recommendationFeed}
            sections={recommendationSections}
            loading={recommendationsLoading}
            error={recommendationsError}
            emptyTitle="More related suggestions will appear here"
            emptyDescription="As you progress through this and other activities, SkillVerse will surface stronger next-step recommendations."
          />
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-teal-600" />
                Why this lives in its own tab
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Recommendations are support tools, not the main course. Keeping them here lets learners return to the lesson flow without digging through suggestion cards every time.
              </p>
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => setActiveTab("overview")}
              >
                Back to course detail
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="guidance" className="mt-0">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <AILearningGuidancePanel
            title="Course learning guidance"
            description="This guidance uses your current progress, lesson focus, and skill goals to suggest what to do next inside this course."
            guidance={guidance}
            guidanceFeature={guidanceFeature}
            assignmentFeature={assignmentFeature}
            loading={guidanceLoading}
            error={guidanceError}
            emptyTitle="Course guidance will appear here"
            emptyDescription="Enroll and build progress to unlock stronger lesson-by-lesson coaching."
          />
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Target className="h-4 w-4 text-amber-600" />
                Guidance workspace
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Skill-gap analysis and next-step coaching deserve room to breathe. This tab keeps the advice visible without turning the course overview into a wall of helper panels.
              </p>
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => setActiveTab("overview")}
              >
                Back to course detail
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="focus" className="mt-0">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_340px]">
          <AIAdaptiveMonitoringPanel
            title="Course focus mirror"
            description="Adaptive check-ins and response suggestions for this course, using only approved signals."
            adaptiveState={adaptiveState}
            loading={adaptiveLoading}
            submitting={adaptiveSubmitting}
            error={adaptiveError}
            onSubmitCheckIn={submitCheckIn}
            manageHref="/profile?tab=adaptive"
          />
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BrainCircuit className="h-4 w-4 text-teal-700" />
                Focus support
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                This adaptive tab keeps check-ins close to the course while still respecting the main learning flow. Consent and signal controls stay in your profile.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link to="/profile?tab=adaptive">
                  <Button variant="outline" className="w-full">
                    Manage adaptive settings
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setActiveTab("overview")}
                >
                  Back to course detail
                </Button>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    </ModuleDetailShell>
  );
}
