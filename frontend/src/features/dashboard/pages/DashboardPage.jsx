import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeftRight,
  BellRing,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LayoutDashboard,
  Link2,
  MessageCircle,
} from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import WorkspaceShell from "@/components/shared/WorkspaceShell";
import DashboardStats from "@/features/dashboard/components/DashboardStats";
import LearningEnrollmentCard from "@/features/courses/components/LearningEnrollmentCard";
import ParticipationReviewDialog from "@/features/reviews/components/ParticipationReviewDialog";
import SwapRequestCard from "@/features/skills/components/SwapRequestCard";
import { useLearnerEnrollments } from "@/hooks/courses/useLearnerEnrollments";
import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
import { useDashboardSwapRequests } from "@/hooks/dashboard/useDashboardSwapRequests";
import { ensureSwapConversation } from "@/services/messages/swap-messaging.service";
import moment from "moment";

const validTabs = ["overview", "learning", "sessions", "swaps", "applications", "events"];

export default function DashboardPage() {
  const location = useLocation();
  const tabParam = new URLSearchParams(location.search).get("tab");
  const initialTab = validTabs.includes(tabParam) ? tabParam : "overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  const { applications, rsvps, sessions = [], loading } = useDashboardData();
  const {
    enrollments,
    summary: learningSummary,
    loading: enrollmentsLoading,
  } = useLearnerEnrollments();
  const {
    requests,
    requestGroups,
    loading: swapsLoading,
    actingId,
    error: swapsError,
    refresh: refreshSwaps,
    acceptRequest,
    rejectRequest,
    cancelRequest,
  } = useDashboardSwapRequests();

  if (loading || swapsLoading || enrollmentsLoading) {
    return <PageLoader />;
  }

  const stats = [
    {
      icon: BookOpen,
      label: "Courses",
      count: enrollments.length,
      color: "bg-teal-50 text-teal-600",
    },
    {
      icon: ArrowLeftRight,
      label: "Skill Swaps",
      count: requests.length,
      color: "bg-amber-50 text-amber-600",
    },
    {
      icon: Briefcase,
      label: "Applications",
      count: applications.length,
      color: "bg-purple-50 text-purple-600",
    },
    {
      icon: Calendar,
      label: "Events",
      count: rsvps.length,
      color: "bg-blue-50 text-blue-600",
    },
  ];

  const priorityItems = [
    ...requestGroups.incoming.slice(0, 2),
    ...requestGroups.active.slice(0, 2),
  ];
  const upcomingSessions = sessions
    .filter((session) => session.status === "planned" || session.status === "confirmed")
    .sort(
      (left, right) =>
        new Date(left.scheduled_start_at).getTime() - new Date(right.scheduled_start_at).getTime(),
    );
  const completedSessions = sessions
    .filter((session) => session.status === "completed")
    .sort(
      (left, right) =>
        new Date(right.completed_at || right.updated_at).getTime() -
        new Date(left.completed_at || left.updated_at).getTime(),
    );

  const openDetails = (request) => {
    window.location.href = `/skill-swap?request=${request.id}`;
  };

  const openMessages = async (request) => {
    const conversation = await ensureSwapConversation({
      swapRequestId: request.id,
    });
    window.location.href = `/messages?conversation=${encodeURIComponent(conversation.id)}`;
  };

  const openSessionConversation = async (session) => {
    const conversation = await ensureSwapConversation({
      swapRequestId: session.swap_request,
    });
    window.location.href = `/messages?conversation=${encodeURIComponent(conversation.id)}`;
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
      description: "Jobs and applications.",
    },
    {
      value: "events",
      label: "Events",
      icon: Calendar,
      description: "RSVPs and activity.",
    },
  ];

  return (
    <WorkspaceShell
      eyebrow="Regular user workspace"
      title="My Dashboard"
      description="Learning, swaps, sessions, and opportunities."
      value={activeTab}
      onValueChange={setActiveTab}
      tabs={workspaceTabs}
      showTabDescriptions={false}
    >
      <TabsContent value="overview" className="mt-0 space-y-6">
        <DashboardStats stats={stats} />

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
              <MetricCard
                label="Active courses"
                value={learningSummary.activeCount}
              />
              <MetricCard
                label="Completed courses"
                value={learningSummary.completedCount}
              />
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
                onClick={() => {
                  window.location.href = "/courses";
                }}
              >
                Browse courses
              </button>
            </div>
          </section>

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
                label="Courses in progress"
                value={learningSummary.activeCount}
                actionLabel="Open learning"
                onAction={() => setActiveTab("learning")}
              />
            </div>
          </section>
        </div>

        {priorityItems.length > 0 ? (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-white p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <BellRing className="h-5 w-5 text-amber-600" />
                  <h2 className="font-heading text-xl font-semibold text-foreground">
                    Swap updates
                  </h2>
                </div>
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
                  onAccept={acceptRequest}
                  onReject={rejectRequest}
                  onCancel={cancelRequest}
                  onOpenDetails={openDetails}
                  onOpenMessage={openMessages}
                />
              ))}
            </div>
          </section>
        ) : null}
      </TabsContent>

      <TabsContent value="learning" className="mt-0 space-y-6">
        {enrollments.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="Browse courses and start learning something new."
            actionLabel="Browse Courses"
            onAction={() => {
              window.location.href = "/courses";
            }}
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
              <p className="text-sm text-muted-foreground">
                Nothing is scheduled right now.
              </p>
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

          {swapsError ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="We couldn't load your swap notifications"
              description={swapsError}
              actionLabel="Refresh"
              onAction={refreshSwaps}
            />
          ) : requests.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="No skill swaps yet"
              description="Find someone to swap skills with. Skill swaps always stay free."
              actionLabel="Find a Swap"
              onAction={() => {
                window.location.href = "/skill-swap";
              }}
            />
          ) : (
            <div className="space-y-6">
              {requestGroups.incoming.length > 0 ? (
                <RequestGroup
                  title="Incoming requests"
                  description="Requests waiting for your answer."
                  items={requestGroups.incoming}
                  actingId={actingId}
                  onAccept={acceptRequest}
                  onReject={rejectRequest}
                  onCancel={cancelRequest}
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
                  onAccept={acceptRequest}
                  onReject={rejectRequest}
                  onCancel={cancelRequest}
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
                  onAccept={acceptRequest}
                  onReject={rejectRequest}
                  onCancel={cancelRequest}
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
                  onAccept={acceptRequest}
                  onReject={rejectRequest}
                  onCancel={cancelRequest}
                  onOpenDetails={openDetails}
                  onOpenMessage={openMessages}
                />
              ) : null}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="applications" className="mt-0">
        <EmptyState
          icon={Briefcase}
          title="Applications workspace is ready to scale"
          description="Jobs, internships, and application tracking will live here without crowding your learning or swap workflow."
        />
      </TabsContent>

      <TabsContent value="events" className="mt-0">
        <EmptyState
          icon={Calendar}
          title="Events workspace is ready to scale"
          description="RSVPs, event attendance, and future community participation can grow here as their own focused section."
        />
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
