import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, ArrowLeftRight, Briefcase, Calendar } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import DashboardStats from "@/features/dashboard/components/DashboardStats";
import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
import moment from "moment";

export default function DashboardPage() {
  const { enrollments, swaps, applications, rsvps, loading } =
    useDashboardData();

  if (loading) {
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
      count: swaps.length,
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="My Dashboard"
        description="Track your learning, swaps, applications, and events."
      />
      <DashboardStats stats={stats} />

      <Tabs defaultValue="learning">
        <TabsList className="bg-secondary/50 p-1 rounded-xl mb-6">
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
                  className="bg-white rounded-xl border border-border/50 p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Course</div>
                    <div className="text-xs text-muted-foreground">
                      Enrolled{" "}
                      {enrollment.enrolled_date
                        ? moment(enrollment.enrolled_date).fromNow()
                        : "recently"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full"
                        style={{
                          width: `${enrollment.progress_percent || 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      {enrollment.progress_percent || 0}%
                    </span>
                  </div>
                  <StatusBadge status={enrollment.status} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="swaps">
          {swaps.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="No skill swaps yet"
              description="Find someone to swap skills with — it's always free!"
              actionLabel="Find a Swap"
              onAction={() => {
                window.location.href = "/skill-swap";
              }}
            />
          ) : (
            <div className="space-y-3">
              {swaps.map((swap) => (
                <div
                  key={swap.id}
                  className="bg-white rounded-xl border border-border/50 p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <ArrowLeftRight className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {swap.requester_skill_name} ↔{" "}
                      {swap.responder_skill_name || "Pending match"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      with {swap.responder_name || "awaiting partner"}
                    </div>
                  </div>
                  <StatusBadge status={swap.status} />
                </div>
              ))}
            </div>
          )}
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
                  className="bg-white rounded-xl border border-border/50 p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
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
                  className="bg-white rounded-xl border border-border/50 p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Event RSVP</div>
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
