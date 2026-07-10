import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TabsContent } from "@/components/ui/tabs";
import {
  Award,
  ArrowLeftRight,
  BellRing,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Link2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import AIAdaptiveMonitoringPanel from "@/components/shared/AIAdaptiveMonitoringPanel";
import AILearningGuidancePanel from "@/components/shared/AILearningGuidancePanel";
import AIRecommendationDeck from "@/components/shared/AIRecommendationDeck";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import NotificationFeedPanel from "@/components/shared/NotificationFeedPanel";
import PageLoader from "@/components/shared/PageLoader";
import WorkspaceShell from "@/components/shared/WorkspaceShell";
import DashboardStats from "@/features/dashboard/components/DashboardStats";
import { useAIAdaptiveMonitoring } from "@/hooks/ai/useAIAdaptiveMonitoring";
import { useAILearningGuidance } from "@/hooks/ai/useAILearningGuidance";
import { useAIRecommendationFeed } from "@/hooks/ai/useAIRecommendationFeed";
import LearningEnrollmentCard from "@/features/courses/components/LearningEnrollmentCard";
import ParticipationReviewDialog from "@/features/reviews/components/ParticipationReviewDialog";
import SwapRequestCard from "@/features/skills/components/SwapRequestCard";
import { useToast } from "@/components/ui/use-toast";
import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
import { useWorkspaceTab } from "@/hooks/dashboard/useWorkspaceTab";
import {
  buildCourseRecommendationItems,
  buildEventRecommendationItems,
  buildOpportunityRecommendationItems,
  buildPeerRecommendationItems,
} from "@/lib/ai-recommendation-items";
import { ensureSwapConversation } from "@/services/messages/swap-messaging.service";
import {
  acceptSwapRequest,
  cancelSwapRequest,
  rejectSwapRequest,
} from "@/services/skills/skills.service";
import { fetchCertificatePortfolio } from "@/services/certificates/certificates.service";
import { fetchCommunities } from "@/services/communities/communities.service";
import moment from "moment";

const validTabs = [
  "overview",
  "learning",
  "teaching",
  "sessions",
  "swaps",
  "applications",
  "events",
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeTab, setActiveTab } = useWorkspaceTab(validTabs, "overview");
  const {
    stats,
    recommendationSignals,
    enrollments,
    instructorInvitations = [],
    sessions = [],
    swapRequests = [],
    applications,
    rsvps,
    loading,
    error,
    refresh,
  } = useDashboardData();
  const [actingId, setActingId] = useState(null);
  const [swapError, setSwapError] = useState("");
  const [trustLoading, setTrustLoading] = useState(true);
  const [trustError, setTrustError] = useState("");
  const [certificatePortfolio, setCertificatePortfolio] = useState({
    certificates: [],
    service_credits: [],
  });
  const [myCommunities, setMyCommunities] = useState([]);
  const {
    adaptiveState,
    loading: adaptiveLoading,
    submitting: adaptiveSubmitting,
    error: adaptiveError,
    submitCheckIn,
  } = useAIAdaptiveMonitoring({
    surface: "/dashboard",
  });
  const {
    feature: recommendationFeature,
    feed: recommendationFeed,
    loading: recommendationsLoading,
    error: recommendationsError,
  } = useAIRecommendationFeed({
    limitPerType: 2,
  });
  const {
    guidanceFeature,
    assignmentFeature,
    guidance,
    loading: guidanceLoading,
    error: guidanceError,
  } = useAILearningGuidance();

  useEffect(() => {
    let active = true;
    const loadTrust = async () => {
      setTrustLoading(true);
      setTrustError("");
      const [portfolioResult, communitiesResult] = await Promise.allSettled([
        fetchCertificatePortfolio(),
        fetchCommunities("mine"),
      ]);
      if (!active) {
        return;
      }
      if (portfolioResult.status === "fulfilled") {
        setCertificatePortfolio(portfolioResult.value);
      }
      if (communitiesResult.status === "fulfilled") {
        setMyCommunities(communitiesResult.value);
      }
      const nextError =
        portfolioResult.status === "rejected"
          ? portfolioResult.reason?.message || "Unable to load your certificate records."
          : communitiesResult.status === "rejected"
            ? communitiesResult.reason?.message || "Unable to load your communities."
            : "";
      setTrustError(nextError);
      setTrustLoading(false);
    };
    loadTrust();
    return () => {
      active = false;
    };
  }, []);

  const requestGroups = useMemo(() => {
    const incoming = [];
    const outgoing = [];
    const active = [];
    const closed = [];

    swapRequests.forEach((request) => {
      if (request.status === "accepted") {
        active.push(request);
        return;
      }

      if (request.status === "pending") {
        if (request.my_role === "recipient") {
          incoming.push(request);
        } else {
          outgoing.push(request);
        }
        return;
      }

      closed.push(request);
    });

    return { incoming, outgoing, active, closed };
  }, [swapRequests]);

  const upcomingSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "planned" || session.status === "confirmed")
        .sort(
          (left, right) =>
            new Date(left.scheduled_start_at).getTime() -
            new Date(right.scheduled_start_at).getTime(),
        ),
    [sessions],
  );
  const completedSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "completed")
        .sort(
          (left, right) =>
            new Date(right.completed_at || right.updated_at).getTime() -
            new Date(left.completed_at || left.updated_at).getTime(),
        ),
    [sessions],
  );
  const teachingGroups = useMemo(() => {
    const pending = [];
    const accepted = [];
    const history = [];

    instructorInvitations.forEach((invitation) => {
      if (invitation.status === "pending") {
        pending.push(invitation);
        return;
      }
      if (invitation.status === "accepted") {
        accepted.push(invitation);
        return;
      }
      history.push(invitation);
    });

    return { pending, accepted, history };
  }, [instructorInvitations]);
  const learningSummary = useMemo(() => {
    const activeEnrollments = enrollments.filter((item) => item.status === "active");
    const completedEnrollments = enrollments.filter((item) => item.status === "completed");
    const totalProgress = enrollments.reduce(
      (sum, enrollment) => sum + Number(enrollment.progress_percent || 0),
      0,
    );

    return {
      activeCount: activeEnrollments.length,
      completedCount: completedEnrollments.length,
      averageProgress: enrollments.length ? Math.round(totalProgress / enrollments.length) : 0,
      nextUp: activeEnrollments[0] || enrollments[0] || null,
    };
  }, [enrollments]);

  const priorityItems = [
    ...requestGroups.incoming.slice(0, 2),
    ...requestGroups.active.slice(0, 2),
  ];
  const recommendationSections = useMemo(
    () => [
      {
        key: "courses",
        title: "Courses",
        icon: BookOpen,
        description: "Next learning paths connected to your current signals.",
        items: buildCourseRecommendationItems(recommendationFeed.course_recommendations),
      },
      {
        key: "events",
        title: "Events",
        icon: Calendar,
        description: "Live sessions and workshops relevant to your field activity.",
        items: buildEventRecommendationItems(recommendationFeed.event_recommendations),
      },
      {
        key: "jobs",
        title: "Opportunities",
        icon: Briefcase,
        description: "Openings that overlap with your skills and participation history.",
        items: buildOpportunityRecommendationItems(
          recommendationFeed.opportunity_recommendations,
        ),
      },
      {
        key: "peers",
        title: "Peer matches",
        icon: ArrowLeftRight,
        description: "People your current profile and skill signals align with.",
        items: buildPeerRecommendationItems(recommendationFeed.peer_matches),
      },
    ],
    [recommendationFeed],
  );

  if (loading) {
    return <PageLoader />;
  }

  const runSwapAction = async (id, action, successTitle) => {
    setSwapError("");
    setActingId(id);
    try {
      await action();
      await refresh();
      toast({ title: successTitle });
    } catch (requestError) {
      console.error(requestError);
      setSwapError(requestError.message || "Swap action failed.");
      toast({
        title: "Swap action failed",
        description: requestError.message || "Unable to update the swap request.",
        variant: "destructive",
      });
      throw requestError;
    } finally {
      setActingId(null);
    }
  };

  const openDetails = (request) => {
    navigate(`/skill-swap?request=${request.id}`);
  };

  const openMessages = async (request) => {
    const conversation = await ensureSwapConversation({
      swapRequestId: request.id,
    });
    navigate(`/messages?conversation=${encodeURIComponent(conversation.id)}`);
  };

  const openSessionConversation = async (session) => {
    const conversation = await ensureSwapConversation({
      swapRequestId: session.swap_request,
    });
    navigate(`/messages?conversation=${encodeURIComponent(conversation.id)}`);
  };

  const workspaceTabs = [
    {
      value: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      description: "Priority updates.",
    },
    {
      value: "learning",
      label: "Learning",
      icon: BookOpen,
      description: "Courses and progress.",
    },
    {
      value: "teaching",
      label: "Teaching",
      icon: UserCheck,
      description: "Instructor invitations.",
    },
    {
      value: "sessions",
      label: "Sessions",
      icon: Clock3,
      description: "Upcoming and completed.",
    },
    {
      value: "swaps",
      label: "Skill Swaps",
      icon: ArrowLeftRight,
      description: "Requests and active exchanges.",
    },
    {
      value: "applications",
      label: "Applications",
      icon: Briefcase,
      description: "Jobs and opportunity progress.",
    },
    {
      value: "events",
      label: "Events",
      icon: Calendar,
      description: "RSVPs and attendance.",
    },
  ];

  const statsCards = [
    {
      icon: BookOpen,
      label: "Active courses",
      count: stats.active_courses ?? learningSummary.activeCount,
      description: "Continue your current learning tracks.",
      color: "bg-teal-50 text-teal-600",
      onClick: () => setActiveTab("learning"),
    },
    {
      icon: ArrowLeftRight,
      label: "Active swaps",
      count: stats.active_swaps ?? requestGroups.active.length,
      description: "Open current exchange conversations.",
      color: "bg-amber-50 text-amber-600",
      onClick: () => setActiveTab("swaps"),
    },
    {
      icon: Briefcase,
      label: "Applications",
      count: stats.applications ?? applications.length,
      description: "Track your job and internship pipeline.",
      color: "bg-purple-50 text-purple-600",
      onClick: () => setActiveTab("applications"),
    },
    {
      icon: Calendar,
      label: "Event RSVPs",
      count: stats.active_rsvps ?? rsvps.length,
      description: "See events you plan to join.",
      color: "bg-blue-50 text-blue-600",
      onClick: () => setActiveTab("events"),
    },
  ];

  return (
    <WorkspaceShell
      eyebrow="Regular user workspace"
      title="My Dashboard"
      description="Learning, swaps, sessions, applications, and events from one connected workspace."
      value={activeTab}
      onValueChange={setActiveTab}
      tabs={workspaceTabs}
      showTabDescriptions={false}
    >
      <TabsContent value="overview" className="mt-0 space-y-6">
        <DashboardStats stats={statsCards} />

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
          <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
              <BookOpen className="h-3.5 w-3.5" />
              Learning focus
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground">
              {learningSummary.nextUp?.course_program?.title || "Start your next course"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {learningSummary.nextUp?.next_lesson
                ? `Next unlocked lesson: ${learningSummary.nextUp.next_lesson.title}.`
                : enrollments.length > 0
                  ? "Pick up where you left off across your active courses."
                  : "Browse courses and create your first learning track."}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Active courses" value={learningSummary.activeCount} />
              <MetricCard label="Completed courses" value={learningSummary.completedCount} />
              <MetricCard
                label="Average progress"
                value={`${learningSummary.averageProgress}%`}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
                onClick={() => setActiveTab("learning")}
              >
                Open learning workspace
                <ExternalLink className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground hover:bg-slate-50"
                onClick={() => navigate("/courses")}
              >
                Browse courses
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground hover:bg-slate-50"
                onClick={() => navigate("/payments")}
              >
                <CreditCard className="h-4 w-4" />
                Payment workspace
              </button>
            </div>
          </section>

          <div className="space-y-4">
            <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-amber-600" />
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Attention queue
                </h2>
              </div>
              <div className="mt-5 space-y-3">
                <AttentionRow
                  label="Incoming swap requests"
                  value={requestGroups.incoming.length}
                  actionLabel="Open swaps"
                  onAction={() => setActiveTab("swaps")}
                />
                <AttentionRow
                  label="Upcoming sessions"
                  value={upcomingSessions.length}
                  actionLabel="Open sessions"
                  onAction={() => setActiveTab("sessions")}
                />
                <AttentionRow
                  label="Instructor invitations"
                  value={teachingGroups.pending.length}
                  actionLabel="Open teaching"
                  onAction={() => setActiveTab("teaching")}
                />
                <AttentionRow
                  label="Applications in progress"
                  value={applications.length}
                  actionLabel="Open applications"
                  onAction={() => setActiveTab("applications")}
                />
              </div>
            </section>

            <NotificationFeedPanel
              title="Workspace notifications"
              description="Recent messages, swap actions, sessions, enrollments, and application updates."
              limit={4}
              emptyTitle="No dashboard notifications yet"
              emptyDescription="As messages, swaps, enrollments, and events change, they will show up here."
            />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div className="space-y-4">
            {priorityItems.length > 0 ? (
              <section className="space-y-4 rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-5 w-5 text-amber-600" />
                    <h2 className="font-heading text-xl font-semibold text-foreground">
                      Swap updates
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-sm font-medium text-teal-700"
                    onClick={() => setActiveTab("swaps")}
                  >
                    Open swap workspace
                    <ArrowLeftRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {priorityItems.map((request) => (
                    <SwapRequestCard
                      key={`priority-${request.id}`}
                      request={request}
                      acting={actingId === request.id}
                      onAccept={(id, note) =>
                        runSwapAction(id, () => acceptSwapRequest(id, note), "Swap accepted")
                      }
                      onReject={(id, note) =>
                        runSwapAction(id, () => rejectSwapRequest(id, note), "Swap rejected")
                      }
                      onCancel={(id, note) =>
                        runSwapAction(id, () => cancelSwapRequest(id, note), "Swap updated")
                      }
                      onOpenDetails={openDetails}
                      onOpenMessage={openMessages}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <EmptyState
                icon={ArrowLeftRight}
                title="Your swap queue is clear"
                description="New swap requests and active exchanges will show up here."
                actionLabel="Open skill swap"
                onAction={() => navigate("/skill-swap")}
              />
            )}

            {teachingGroups.pending.length > 0 ? (
              <TeachingInvitationSection
                title="Instructor invitations waiting on you"
                description="These assignments are ready for your response and will show up in your teaching workspace."
                invitations={teachingGroups.pending.slice(0, 2)}
                emptyTitle="No pending instructor invitations"
                emptyDescription="When an organization invites you to teach, the invitation will appear here."
                actionLabel="Open teaching workspace"
                onAction={() => setActiveTab("teaching")}
              />
            ) : null}

            <AIRecommendationDeck
              title="Recommended next steps"
              description="Discovery now links your learning, swaps, events, and opportunity activity so you can move naturally between them."
              feature={recommendationFeature}
              feed={recommendationFeed}
              sections={recommendationSections}
              loading={recommendationsLoading}
              error={recommendationsError}
              emptyTitle="Keep building your learning signals"
              emptyDescription="As you enroll in courses, join events, and expand your skills, smarter next-step suggestions will show up here."
              compact
            />

            <AILearningGuidancePanel
              title="AI learning guidance"
              description="Skill gaps, assignment prep, and next actions now sit beside your live dashboard activity instead of living in a separate tool."
              guidance={guidance}
              guidanceFeature={guidanceFeature}
              assignmentFeature={assignmentFeature}
              loading={guidanceLoading}
              error={guidanceError}
              emptyTitle="Learning guidance is warming up"
              emptyDescription="As your course progress, profile goals, and practice checkpoints grow, richer guidance will show up here."
              compact
            />

            <AIAdaptiveMonitoringPanel
              title="Adaptive focus"
              description="Focus drift, mood mirror, and next-step suggestions based on your approved learning signals."
              adaptiveState={adaptiveState}
              loading={adaptiveLoading}
              submitting={adaptiveSubmitting}
              error={adaptiveError}
              onSubmitCheckIn={submitCheckIn}
              manageHref="/profile?tab=adaptive"
              compact
            />

            <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    <h2 className="font-heading text-lg font-semibold text-foreground">
                      Trust and recognition
                    </h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Certificates, service-credit records, and community participation now live beside your learning flow.
                  </p>
                </div>
                <Link to="/certificates" className="text-sm font-medium text-teal-700">
                  Open certificate workspace
                </Link>
              </div>
              {trustError ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {trustError}
                </div>
              ) : null}
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <TrustMetric
                  icon={Award}
                  label="Certificates"
                  value={certificatePortfolio.certificates.length}
                  loading={trustLoading}
                />
                <TrustMetric
                  icon={Users}
                  label="Communities"
                  value={myCommunities.length}
                  loading={trustLoading}
                />
                <TrustMetric
                  icon={BookOpen}
                  label="Service credits"
                  value={certificatePortfolio.service_credits.length}
                  loading={trustLoading}
                />
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <TrustPreview
                  title="Latest certificate"
                  item={certificatePortfolio.certificates[0]}
                  emptyText="No certificates issued yet."
                  linkForItem={(item) => `/certificates/${item.certificate_id}`}
                  subtitleForItem={(item) => item.organization?.name || "Organization"}
                />
                <TrustPreview
                  title="Active communities"
                  item={myCommunities[0]}
                  emptyText="You have not joined any communities yet."
                  linkForItem={() => "/communities"}
                  subtitleForItem={(item) => item.organization?.name || "Community"}
                />
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-600" />
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Recommendation signals
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              These signals keep discovery connected across courses, swaps, jobs, and events.
            </p>
            <SignalGroup
              title="Fields"
              items={recommendationSignals.profile_fields}
            />
            <SignalGroup
              title="Skills you offer"
              items={recommendationSignals.offered_skills}
            />
            <SignalGroup
              title="Skills you want"
              items={recommendationSignals.learning_skills}
            />
            <SignalGroup
              title="Activity"
              items={recommendationSignals.activity_signals}
            />
          </section>
        </div>
      </TabsContent>

      <TabsContent value="learning" className="mt-0 space-y-6">
        {enrollments.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="Browse courses and start learning something new."
            actionLabel="Browse courses"
            onAction={() => navigate("/courses")}
          />
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment) => (
              <LearningEnrollmentCard
                key={enrollment.id}
                enrollment={enrollment}
                primaryLabel="Continue course"
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="teaching" className="mt-0 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricPanel
            icon={UserCheck}
            label="Pending invitations"
            value={teachingGroups.pending.length}
            description="Assignments still waiting for your response."
          />
          <MetricPanel
            icon={ShieldCheck}
            label="Accepted roles"
            value={teachingGroups.accepted.length}
            description="Courses where you are already attached as an instructor."
          />
          <MetricPanel
            icon={Clock3}
            label="Closed history"
            value={teachingGroups.history.length}
            description="Declined, revoked, and expired invitation records."
          />
        </div>

        <TeachingInvitationSection
          title="Pending instructor invitations"
          description="Open the secure invitation page to accept or decline each teaching assignment."
          invitations={teachingGroups.pending}
          emptyTitle="No pending instructor invitations"
          emptyDescription="When organizations invite you to teach, those invitations will show up here."
        />

        <TeachingInvitationSection
          title="Accepted instructor roles"
          description="These courses already recognize you as an instructor."
          invitations={teachingGroups.accepted}
          emptyTitle="No accepted instructor roles yet"
          emptyDescription="Accepted invitations will stay here so you can jump back into the course."
          accepted
        />

        <TeachingInvitationSection
          title="Invitation history"
          description="Older outcomes stay visible so you can keep track of what happened."
          invitations={teachingGroups.history}
          emptyTitle="No invitation history yet"
          emptyDescription="Closed invitation records will show up here after you respond or an invite expires."
        />
      </TabsContent>

      <TabsContent value="sessions" className="mt-0">
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="space-y-3 rounded-2xl border border-border/60 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-base font-semibold text-foreground">
                  Upcoming sessions
                </h2>
                <p className="text-sm text-muted-foreground">
                  Confirmed or planned learning exchanges.
                </p>
              </div>
              <StatusBadge status="planned" label={`${upcomingSessions.length}`} />
            </div>

            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing is scheduled right now.</p>
            ) : (
              upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-2xl border border-border/50 bg-secondary/20 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-medium text-foreground">{session.title}</h4>
                    <StatusBadge
                      status={session.status}
                      label={session.status === "confirmed" ? "Confirmed" : "Planned"}
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    With {session.counterparty?.full_name || "your swap partner"} on{" "}
                    {moment(session.scheduled_start_at).format("ddd, MMM D · h:mm A")}
                    {session.timezone ? ` (${session.timezone})` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ParticipationReviewDialog
                      context="skill_swap"
                      sourceId={session.swap_request}
                      title="Review this completed swap"
                      description="Rate the exchange after meaningful participation. Future course and event review flows will use this same review contract."
                      triggerLabel="Leave review"
                      triggerVariant="outline"
                    />
                    {session.meeting_url ? (
                      <a
                        href={session.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm font-medium text-teal-700"
                      >
                        <Link2 className="h-4 w-4" />
                        Open link
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm font-medium text-foreground"
                      onClick={() => openSessionConversation(session)}
                    >
                      <MessageCircle className="h-4 w-4 text-teal-600" />
                      Open conversation
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-border/60 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-base font-semibold text-foreground">
                  Completed records
                </h2>
                <p className="text-sm text-muted-foreground">
                  A lightweight record of what was finished.
                </p>
              </div>
              <StatusBadge status="completed" label={`${completedSessions.length}`} />
            </div>

            {completedSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Completed sessions will show up here after you wrap them up.
              </p>
            ) : (
              completedSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-2xl border border-border/50 bg-secondary/20 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-medium text-foreground">{session.title}</h4>
                    <StatusBadge status="completed" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Completed with {session.counterparty?.full_name || "your swap partner"}{" "}
                    {moment(session.completed_at || session.updated_at).fromNow()}.
                  </p>
                  {session.completion_notes ? (
                    <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-foreground">
                      <div className="mb-1 inline-flex items-center gap-2 font-medium text-teal-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Completion notes
                      </div>
                      <p>{session.completion_notes}</p>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </section>
        </div>
      </TabsContent>

      <TabsContent value="swaps" className="mt-0">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <button
              type="button"
              className="rounded-2xl border border-border/60 bg-white p-5 text-left"
              onClick={() => setActiveTab("swaps")}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BellRing className="h-4 w-4 text-amber-600" />
                Needs your response
              </div>
              <p className="mt-2 font-heading text-3xl font-bold text-foreground">
                {requestGroups.incoming.length}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Incoming swap requests waiting on you.
              </p>
            </button>
            <button
              type="button"
              className="rounded-2xl border border-border/60 bg-white p-5 text-left"
              onClick={() => setActiveTab("swaps")}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                Active swaps
              </div>
              <p className="mt-2 font-heading text-3xl font-bold text-foreground">
                {requestGroups.active.length}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Open a conversation with your current exchange partners.
              </p>
            </button>
            <button
              type="button"
              className="rounded-2xl border border-border/60 bg-white p-5 text-left"
              onClick={() => setActiveTab("swaps")}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <StatusBadge status="pending" label="Outgoing" />
              </div>
              <p className="mt-2 font-heading text-3xl font-bold text-foreground">
                {requestGroups.outgoing.length}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Requests you have already sent.
              </p>
            </button>
          </div>

          {swapError ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="We couldn't update your swap flow"
              description={swapError}
              actionLabel="Try again"
              onAction={() => setSwapError("")}
            />
          ) : swapRequests.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="No skill swaps yet"
              description="Find someone to swap skills with. Skill swaps always stay free."
              actionLabel="Find a swap"
              onAction={() => navigate("/skill-swap")}
            />
          ) : (
            <div className="space-y-6">
              {requestGroups.incoming.length > 0 ? (
                <RequestGroup
                  title="Incoming requests"
                  description="Requests waiting for your answer."
                  items={requestGroups.incoming}
                  actingId={actingId}
                  onAccept={(id, note) =>
                    runSwapAction(id, () => acceptSwapRequest(id, note), "Swap accepted")
                  }
                  onReject={(id, note) =>
                    runSwapAction(id, () => rejectSwapRequest(id, note), "Swap rejected")
                  }
                  onCancel={(id, note) =>
                    runSwapAction(id, () => cancelSwapRequest(id, note), "Swap updated")
                  }
                  onOpenDetails={openDetails}
                  onOpenMessage={openMessages}
                />
              ) : null}

              {requestGroups.active.length > 0 ? (
                <RequestGroup
                  title="Active swaps"
                  description="Accepted swaps you can move straight into messaging."
                  items={requestGroups.active}
                  actingId={actingId}
                  onAccept={(id, note) =>
                    runSwapAction(id, () => acceptSwapRequest(id, note), "Swap accepted")
                  }
                  onReject={(id, note) =>
                    runSwapAction(id, () => rejectSwapRequest(id, note), "Swap rejected")
                  }
                  onCancel={(id, note) =>
                    runSwapAction(id, () => cancelSwapRequest(id, note), "Swap updated")
                  }
                  onOpenDetails={openDetails}
                  onOpenMessage={openMessages}
                />
              ) : null}

              {requestGroups.outgoing.length > 0 ? (
                <RequestGroup
                  title="Outgoing requests"
                  description="Requests you have already sent."
                  items={requestGroups.outgoing}
                  actingId={actingId}
                  onAccept={(id, note) =>
                    runSwapAction(id, () => acceptSwapRequest(id, note), "Swap accepted")
                  }
                  onReject={(id, note) =>
                    runSwapAction(id, () => rejectSwapRequest(id, note), "Swap rejected")
                  }
                  onCancel={(id, note) =>
                    runSwapAction(id, () => cancelSwapRequest(id, note), "Swap updated")
                  }
                  onOpenDetails={openDetails}
                  onOpenMessage={openMessages}
                />
              ) : null}

              {requestGroups.closed.length > 0 ? (
                <RequestGroup
                  title="Resolved history"
                  description="Closed requests kept for reference."
                  items={requestGroups.closed}
                  actingId={actingId}
                  onAccept={(id, note) =>
                    runSwapAction(id, () => acceptSwapRequest(id, note), "Swap accepted")
                  }
                  onReject={(id, note) =>
                    runSwapAction(id, () => rejectSwapRequest(id, note), "Swap rejected")
                  }
                  onCancel={(id, note) =>
                    runSwapAction(id, () => cancelSwapRequest(id, note), "Swap updated")
                  }
                  onOpenDetails={openDetails}
                  onOpenMessage={openMessages}
                />
              ) : null}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="applications" className="mt-0 space-y-4">
        {applications.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No applications yet"
            description="When you apply to a job, internship, program, or volunteer role, the progress will show up here."
            actionLabel="Browse jobs"
            onAction={() => navigate("/jobs")}
          />
        ) : (
          applications.map((application) => (
            <div key={application.id} className="rounded-2xl border border-border/60 bg-white p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-lg font-semibold text-foreground">
                      {application.opportunity_title}
                    </h3>
                    <StatusBadge status={application.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {application.company_name} · {application.opportunity_type}
                  </p>
                  {application.deadline ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Deadline {moment(application.deadline).format("MMM D, YYYY")}
                    </p>
                  ) : null}
                  {application.reviewer_notes ? (
                    <div className="mt-3 rounded-xl bg-secondary/25 px-3 py-2 text-sm text-foreground">
                      {application.reviewer_notes}
                    </div>
                  ) : null}
                </div>
                <Link
                  to={`/jobs/${application.opportunity_id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm font-medium text-teal-700"
                >
                  Open listing
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))
        )}
      </TabsContent>

      <TabsContent value="events" className="mt-0 space-y-4">
        {rsvps.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No event RSVPs yet"
            description="Events you plan to attend will be collected here with their status and next step."
            actionLabel="Browse events"
            onAction={() => navigate("/events")}
          />
        ) : (
          rsvps.map((rsvp) => (
            <div key={rsvp.id} className="rounded-2xl border border-border/60 bg-white p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-lg font-semibold text-foreground">
                      {rsvp.event_title}
                    </h3>
                    <StatusBadge status={rsvp.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{rsvp.organization_name}</p>
                  {rsvp.starts_at ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Starts {moment(rsvp.starts_at).format("MMM D, YYYY · h:mm A")}
                    </p>
                  ) : null}
                  {rsvp.attended_at ? (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Attendance recorded
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/events/${rsvp.event_id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm font-medium text-teal-700"
                  >
                    View event
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  {rsvp.attended_at ? (
                    <ParticipationReviewDialog
                      context="event"
                      sourceId={rsvp.event_id}
                      title="Review this event"
                      description="Share feedback after meaningful participation."
                      triggerLabel="Leave review"
                      triggerVariant="outline"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </TabsContent>
    </WorkspaceShell>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/80 p-4 shadow-sm shadow-teal-100">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function AttentionRow({ label, value, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-secondary/25 px-4 py-3">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">Count: {value}</div>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="text-sm font-medium text-teal-700 hover:text-teal-800"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function MetricPanel({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5 text-left">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-teal-600" />
        {label}
      </div>
      <p className="mt-2 font-heading text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TeachingInvitationSection({
  title,
  description,
  invitations,
  emptyTitle,
  emptyDescription,
  actionLabel,
  onAction,
  accepted = false,
}) {
  if (!invitations.length) {
    return (
      <EmptyState
        icon={UserCheck}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={actionLabel}
        onAction={onAction}
      />
    );
  }

  return (
    <section className="space-y-4 rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 text-sm font-medium text-teal-700"
          >
            {actionLabel}
            <ExternalLink className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="rounded-2xl border border-border/50 bg-secondary/10 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-lg font-semibold text-foreground">
                {invitation.course_program?.title || "Course invitation"}
              </h3>
              <StatusBadge status={invitation.status} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {invitation.course_program?.organization_name || "Organization"} invited{" "}
              {invitation.invited_email}.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Last activity
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {formatDate(
                    invitation.last_sent_at || invitation.accepted_at || invitation.declined_at,
                  )}
                </div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Expires
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {invitation.expires_at ? formatDate(invitation.expires_at) : "Closed"}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {accepted ? (
                <Link
                  to={`/courses/${invitation.course_program?.id || ""}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  Open course
                  <ExternalLink className="h-4 w-4" />
                </Link>
              ) : invitation.action_url ? (
                <a
                  href={invitation.action_url}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  Review invitation
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
              <Link
                to={`/courses/${invitation.course_program?.id || ""}`}
                className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm font-medium text-foreground"
              >
                View course
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RequestGroup({
  title,
  description,
  items,
  actingId,
  onAccept,
  onReject,
  onCancel,
  onOpenDetails,
  onOpenMessage,
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">
        {items.map((request) => (
          <SwapRequestCard
            key={request.id}
            request={request}
            acting={actingId === request.id}
            onAccept={onAccept}
            onReject={onReject}
            onCancel={onCancel}
            onOpenDetails={onOpenDetails}
            onOpenMessage={onOpenMessage}
          />
        ))}
      </div>
    </section>
  );
}

function SignalGroup({ title, items = [] }) {
  return (
    <div className="mt-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length === 0 ? (
          <span className="text-sm text-muted-foreground">No signals yet.</span>
        ) : (
          items.map((item) => (
            <span
              key={`${title}-${item}`}
              className="rounded-full bg-secondary/35 px-3 py-1 text-xs font-medium text-foreground"
            >
              {item}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function TrustMetric({ icon: Icon, label, value, loading }) {
  return (
    <div className="rounded-2xl bg-secondary/15 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="mt-2 font-heading text-3xl font-bold text-foreground">
        {loading ? "..." : value}
      </div>
    </div>
  );
}

function TrustPreview({ title, item, emptyText, linkForItem, subtitleForItem }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-secondary/10 p-4">
      <div className="text-sm font-medium text-foreground">{title}</div>
      {item ? (
        <Link to={linkForItem(item)} className="mt-3 block rounded-2xl bg-white px-4 py-4">
          <div className="font-medium text-foreground">
            {item.title || item.certificate_id || "Open item"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{subtitleForItem(item)}</div>
        </Link>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
