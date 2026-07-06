import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeftRight,
  BellRing,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Link2,
  MessageCircle,
} from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import DashboardStats from "@/features/dashboard/components/DashboardStats";
import ParticipationReviewDialog from "@/features/reviews/components/ParticipationReviewDialog";
import SwapRequestCard from "@/features/skills/components/SwapRequestCard";
import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
import { useDashboardSwapRequests } from "@/hooks/dashboard/useDashboardSwapRequests";
import { ensureSwapConversation } from "@/services/messages/swap-messaging.service";
import moment from "moment";

const validTabs = ["learning", "swaps", "applications", "events"];

export default function DashboardPage() {
  const location = useLocation();
  const tabParam = new URLSearchParams(location.search).get("tab");
  const initialTab = validTabs.includes(tabParam) ? tabParam : "learning";
  const [activeTab, setActiveTab] = useState(initialTab);

  const { enrollments, applications, rsvps, sessions = [], loading } = useDashboardData();
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

  if (loading || swapsLoading) {
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="My Dashboard"
        description="Track the swaps that need attention, continue active exchanges, and keep your learning moving."
      />
      <DashboardStats stats={stats} />

      {priorityItems.length > 0 ? (
        <section className="mb-8 space-y-4">
          <div className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-white p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-amber-600" />
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  Skill swap updates
                </h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Respond to new requests and jump straight into active swap conversations from here.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm font-medium text-teal-700"
              onClick={() => setActiveTab("swaps")}
            >
              Open full swap workspace
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 rounded-xl bg-secondary/50 p-1">
          <TabsTrigger
            value="learning"
            className="rounded-lg data-[state=active]:bg-white"
          >
            My Learning
          </TabsTrigger>
          <TabsTrigger
            value="swaps"
            className="rounded-lg data-[state=active]:bg-white"
          >
            Skill Swaps
          </TabsTrigger>
          <TabsTrigger
            value="applications"
            className="rounded-lg data-[state=active]:bg-white"
          >
            Applications
          </TabsTrigger>
          <TabsTrigger
            value="events"
            className="rounded-lg data-[state=active]:bg-white"
          >
            Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="learning">
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-600" />
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Learning sessions
                </h2>
              </div>

              {upcomingSessions.length === 0 && completedSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-white p-5 text-sm text-muted-foreground">
                  No learning sessions planned yet. Once a swap is accepted, use Messages to lock in time and store the meeting link.
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-3 rounded-2xl border border-border/60 bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-heading text-base font-semibold text-foreground">
                          Upcoming sessions
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Your next confirmed or planned exchange sessions.
                        </p>
                      </div>
                      <StatusBadge status="planned" label={`${upcomingSessions.length}`} />
                    </div>

                    {upcomingSessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nothing is scheduled right now.
                      </p>
                    ) : (
                      upcomingSessions.slice(0, 4).map((session) => (
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
                  </div>

                  <div className="space-y-3 rounded-2xl border border-border/60 bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-heading text-base font-semibold text-foreground">
                          Completed records
                        </h3>
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
                      completedSessions.slice(0, 4).map((session) => (
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
                  </div>
                </div>
              )}
            </section>

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
              <div className="space-y-3">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center gap-4 rounded-xl border border-border/50 bg-white p-4"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50">
                    <BookOpen className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">Course</div>
                    <div className="text-xs text-muted-foreground">
                      Enrolled{" "}
                      {enrollment.enrolled_date
                        ? moment(enrollment.enrolled_date).fromNow()
                        : "recently"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-teal-500"
                        style={{
                          width: `${enrollment.progress_percent || 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {enrollment.progress_percent || 0}%
                    </span>
                  </div>
                  <StatusBadge status={enrollment.status} />
                </div>
              ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="swaps">
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
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status="pending" label="Needs response" />
                      <h2 className="font-heading text-lg font-semibold text-foreground">
                        Incoming requests
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {requestGroups.incoming.map((request) => (
                        <SwapRequestCard
                          key={request.id}
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

                {requestGroups.active.length > 0 ? (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status="accepted" label="Active" />
                      <h2 className="font-heading text-lg font-semibold text-foreground">
                        Active swaps
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {requestGroups.active.map((request) => (
                        <SwapRequestCard
                          key={request.id}
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

                {requestGroups.outgoing.length > 0 || requestGroups.closed.length > 0 ? (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status="closed" label="History" />
                      <h2 className="font-heading text-lg font-semibold text-foreground">
                        Outgoing and history
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {[...requestGroups.outgoing, ...requestGroups.closed].map((request) => (
                        <SwapRequestCard
                          key={request.id}
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
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="applications">
          {applications.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No applications yet"
              description="Apply for jobs and internships that match your skills."
              actionLabel="Browse Jobs"
              onAction={() => {
                window.location.href = "/jobs";
              }}
            />
          ) : (
            <div className="space-y-3">
              {applications.map((application) => (
                <div
                  key={application.id}
                  className="flex items-center gap-4 rounded-xl border border-border/50 bg-white p-4"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50">
                    <Briefcase className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {application.job_title || "Position"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {application.company_name} · Applied{" "}
                      {application.applied_date
                        ? moment(application.applied_date).fromNow()
                        : "recently"}
                    </div>
                  </div>
                  <StatusBadge status={application.status} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events">
          {rsvps.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No events yet"
              description="RSVP to upcoming events and workshops."
              actionLabel="Find Events"
              onAction={() => {
                window.location.href = "/events";
              }}
            />
          ) : (
            <div className="space-y-3">
              {rsvps.map((rsvp) => (
                <div
                  key={rsvp.id}
                  className="flex items-center gap-4 rounded-xl border border-border/50 bg-white p-4"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">Event RSVP</div>
                    <div className="text-xs text-muted-foreground">
                      Registered{" "}
                      {rsvp.registered_date
                        ? moment(rsvp.registered_date).fromNow()
                        : "recently"}
                    </div>
                  </div>
                  <StatusBadge
                    status={rsvp.status === "going" ? "active" : rsvp.status}
                    label={rsvp.status === "going" ? "Going" : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
