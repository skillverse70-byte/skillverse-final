import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { TabsContent } from "@/components/ui/tabs";
import {
  BookOpen,
  Briefcase,
  Building,
  Calendar,
  CreditCard,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import NotificationFeedPanel from "@/components/shared/NotificationFeedPanel";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import WorkspaceShell from "@/components/shared/WorkspaceShell";
import DashboardStats from "@/features/dashboard/components/DashboardStats";
import FinancialAccountSetupCard from "@/features/organizations/components/FinancialAccountSetupCard";
import OrganizationApplicantPipelinePanel from "@/features/organizations/components/OrganizationApplicantPipelinePanel";
import OrganizationEventManagementPanel from "@/features/organizations/components/OrganizationEventManagementPanel";
import OrganizationEnrollmentPanel from "@/features/organizations/components/OrganizationEnrollmentPanel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  createOrganizationEvent,
  deleteOrganizationEvent,
  updateOrganizationEvent,
} from "@/services/events/events.service";
import {
  createOrganizationOpportunity,
  updateOrganizationApplicationStatus,
  updateOrganizationOpportunity,
} from "@/services/jobs/jobs.service";
import { saveFinancialAccountSetup } from "@/services/organizations/organization.service";
import { useOrganizationDashboardData } from "@/hooks/dashboard/useOrganizationDashboardData";
import { useWorkspaceTab } from "@/hooks/dashboard/useWorkspaceTab";

const validTabs = ["overview", "setup", "courses", "events", "jobs", "learners"];

export default function OrgManagementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeTab, setActiveTab } = useWorkspaceTab(validTabs, "overview");
  const {
    organization,
    verification,
    financialAccount,
    stats,
    coursePerformance,
    courses,
    enrollments,
    events,
    opportunities,
    applications,
    loading,
    error,
    refresh,
  } = useOrganizationDashboardData();

  if (loading) {
    return <PageLoader />;
  }

  if (!organization) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <EmptyState
          icon={Building}
          title="No organization profile found"
          description="Complete your organization profile before opening the organization workspace."
          actionLabel="Open organization profile"
          onAction={() => navigate("/organization-profile")}
        />
      </div>
    );
  }

  const verificationPending = Boolean(verification?.pending_request);
  const verified = organization.verification_status === "verified";
  const financeReady = financialAccount?.status === "ready";
  const topPerformers = coursePerformance.slice(0, 3);
  const activeCourses = courses.filter((course) => course.status === "published");
  const activeEvents = events.filter((event) => event.status !== "cancelled");
  const openJobs = opportunities.filter((opportunity) => opportunity.status === "open");

  const handleFinancialSave = async (form) => {
    try {
      await saveFinancialAccountSetup(form);
      await refresh();
      toast({
        title: "Financial setup submitted",
        description: "An admin must approve updated payout details before paid enrollment opens.",
      });
    } catch (saveError) {
      console.error(saveError);
      toast({
        title: "Unable to save financial setup",
        description: saveError?.message || "Something went wrong.",
        variant: "destructive",
      });
      throw saveError;
    }
  };

  const handleCreateEvent = async (payload) => {
    try {
      const created = await createOrganizationEvent(payload);
      await refresh();
      toast({
        title: "Event created",
        description: "The event is now available in your organization workspace.",
      });
      return created;
    } catch (saveError) {
      console.error(saveError);
      toast({
        title: "Unable to create event",
        description: saveError?.message || "Something went wrong.",
        variant: "destructive",
      });
      throw saveError;
    }
  };

  const handleUpdateEvent = async (eventId, payload) => {
    try {
      const updated = await updateOrganizationEvent(eventId, payload);
      await refresh();
      toast({
        title: "Event updated",
        description: "Your event changes were saved.",
      });
      return updated;
    } catch (saveError) {
      console.error(saveError);
      toast({
        title: "Unable to update event",
        description: saveError?.message || "Something went wrong.",
        variant: "destructive",
      });
      throw saveError;
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteOrganizationEvent(eventId);
      await refresh();
      toast({
        title: "Event deleted",
        description: "The event was removed from your workspace.",
      });
    } catch (saveError) {
      console.error(saveError);
      toast({
        title: "Unable to delete event",
        description: saveError?.message || "This event may already have attendee records.",
        variant: "destructive",
      });
      throw saveError;
    }
  };

  const handleCreateOpportunity = async (payload) => {
    try {
      const created = await createOrganizationOpportunity(payload);
      await refresh();
      toast({
        title: "Opportunity created",
        description: "The listing is now available in your organization workspace.",
      });
      return created;
    } catch (saveError) {
      console.error(saveError);
      toast({
        title: "Unable to create opportunity",
        description: saveError?.message || "Something went wrong.",
        variant: "destructive",
      });
      throw saveError;
    }
  };

  const handleUpdateOpportunity = async (opportunityId, payload) => {
    try {
      const updated = await updateOrganizationOpportunity(opportunityId, payload);
      await refresh();
      toast({
        title: "Opportunity updated",
        description: "Your listing changes were saved.",
      });
      return updated;
    } catch (saveError) {
      console.error(saveError);
      toast({
        title: "Unable to update opportunity",
        description: saveError?.message || "Something went wrong.",
        variant: "destructive",
      });
      throw saveError;
    }
  };

  const handleUpdateApplication = async (applicationId, payload) => {
    try {
      const updated = await updateOrganizationApplicationStatus(applicationId, payload);
      await refresh();
      toast({
        title: "Applicant pipeline updated",
        description: "The candidate status was saved successfully.",
      });
      return updated;
    } catch (saveError) {
      console.error(saveError);
      toast({
        title: "Unable to update applicant",
        description: saveError?.message || "Something went wrong.",
        variant: "destructive",
      });
      throw saveError;
    }
  };

  const tabs = [
    {
      value: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      description: "Business snapshot.",
    },
    {
      value: "setup",
      label: "Setup",
      icon: Settings2,
      description: "Trust and payout readiness.",
    },
    {
      value: "courses",
      label: "Courses",
      icon: BookOpen,
      description: "Managed learning offers.",
    },
    {
      value: "events",
      label: "Events",
      icon: Calendar,
      description: "Publishing and RSVP ops.",
    },
    {
      value: "jobs",
      label: "Jobs",
      icon: Briefcase,
      description: "Open roles and applicants.",
    },
    {
      value: "learners",
      label: "Learners",
      icon: GraduationCap,
      description: "Enrollment and progress.",
    },
  ];

  const statCards = [
    {
      icon: BookOpen,
      label: "Active courses",
      count: stats.published_courses ?? activeCourses.length,
      description: "Open the courses lane.",
      color: "bg-teal-50 text-teal-600",
      onClick: () => setActiveTab("courses"),
    },
    {
      icon: Calendar,
      label: "Active events",
      count: stats.active_events ?? activeEvents.length,
      description: "Manage events and attendees.",
      color: "bg-blue-50 text-blue-600",
      onClick: () => setActiveTab("events"),
    },
    {
      icon: Briefcase,
      label: "Open jobs",
      count: stats.open_opportunities ?? openJobs.length,
      description: "Review managed opportunities.",
      color: "bg-purple-50 text-purple-600",
      onClick: () => setActiveTab("jobs"),
    },
    {
      icon: Users,
      label: "Applicants",
      count: stats.total_applications ?? applications.length,
      description: "Open the hiring pipeline.",
      color: "bg-amber-50 text-amber-600",
      onClick: () => setActiveTab("jobs"),
    },
  ];

  return (
    <WorkspaceShell
      eyebrow="Organization workspace"
      title={organization.name}
      description="Manage trust readiness, courses, events, jobs, and learner outcomes from one scalable dashboard."
      value={activeTab}
      onValueChange={setActiveTab}
      tabs={tabs}
      showTabDescriptions={false}
      actions={
        <>
          <Link to="/organization-profile">
            <Button variant="outline" className="gap-2">
              <Building className="h-4 w-4" />
              Organization profile
            </Button>
          </Link>
          <Link to="/course-builder">
            <Button className="gap-2 bg-teal-600 hover:bg-teal-700">
              <BookOpen className="h-4 w-4" />
              Course builder
            </Button>
          </Link>
          <Link to={`/organizations/${organization.id}`}>
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Public view
            </Button>
          </Link>
        </>
      }
    >
      <TabsContent value="overview" className="mt-0 space-y-6">
        <DashboardStats stats={statCards} />

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section>
          <h2 className="mb-4 font-heading text-lg font-semibold">Readiness</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <ReadinessItem
              icon={Building}
              title="Organization profile"
              status="active"
              label="Profile ready"
              description={`${organization.type || "Organization"} in ${
                organization.location || organization.country || "location not set"
              }`}
            />
            <ReadinessItem
              icon={FileCheck2}
              title="Organization verification"
              status={verified ? "verified" : verificationPending ? "pending" : "unverified"}
              label={verified ? "Verified" : verificationPending ? "Under review" : "Action required"}
              description={
                verified
                  ? "Trust verification is approved."
                  : verificationPending
                    ? "Your request is waiting for admin review."
                    : "Open setup to submit verification evidence."
              }
            />
            <ReadinessItem
              icon={CreditCard}
              title="Financial account"
              status={financialAccount?.status || "not_started"}
              label={
                financeReady
                  ? "Ready"
                  : financialAccount?.status === "pending"
                    ? "Under review"
                    : "Not ready"
              }
              description={
                financeReady
                  ? "Paid course enrollment is available."
                  : financialAccount?.status === "restricted"
                    ? financialAccount.restricted_reason || "Admin action is required."
                    : "Complete payout details and wait for admin approval."
              }
            />
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-600" />
              <h2 className="font-heading text-lg font-semibold text-foreground">
                What needs attention
              </h2>
            </div>
            <div className="mt-5 space-y-3">
              <AttentionRow
                label="Verification setup"
                value={verified ? "Ready" : verificationPending ? "Pending" : "Open setup"}
                actionLabel="Open setup"
                onAction={() => setActiveTab("setup")}
              />
              <AttentionRow
                label="Learners in progress"
                value={String(stats.active_enrollments ?? 0)}
                actionLabel="Open learners"
                onAction={() => setActiveTab("learners")}
              />
              <AttentionRow
                label="Open jobs"
                value={String(stats.open_opportunities ?? 0)}
                actionLabel="Open jobs"
                onAction={() => setActiveTab("jobs")}
              />
              <AttentionRow
                label="RSVP activity"
                value={String(stats.total_event_rsvps ?? 0)}
                actionLabel="Open events"
                onAction={() => setActiveTab("events")}
              />
            </div>
          </section>

          <div className="space-y-4">
            <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-600" />
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Operator pulse
                </h2>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniMetric label="Learners" value={enrollments.length} />
                <MiniMetric label="Applicants" value={applications.length} />
                <MiniMetric label="Completed" value={stats.completed_enrollments ?? 0} />
                <MiniMetric label="Hired" value={stats.hired_applicants ?? 0} />
              </div>
            </section>

            <NotificationFeedPanel
              title="Organization notifications"
              description="Track approvals, new enrollments, applications, RSVPs, and event review actions."
              limit={4}
              emptyTitle="No organization notifications yet"
              emptyDescription="When learners, applicants, finance review, or event actions change, updates will appear here."
            />
          </div>
        </div>

        <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Best performing courses
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Snapshot of the strongest enrollment and completion momentum right now.
              </p>
            </div>
            <button
              type="button"
              className="text-sm font-medium text-teal-700"
              onClick={() => setActiveTab("courses")}
            >
              Open courses
            </button>
          </div>
          {topPerformers.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Course analytics will appear here once you publish and enroll learners.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {topPerformers.map((course) => (
                <div key={course.id} className="rounded-2xl border border-border/60 bg-secondary/15 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-foreground">{course.title}</h3>
                    <StatusBadge status={course.status} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    <span>Enrollments: {course.enrollment_count}</span>
                    <span>Active learners: {course.active_enrollment_count}</span>
                    <span>Completed learners: {course.completed_enrollment_count}</span>
                    <span>Average progress: {course.average_progress_percent}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </TabsContent>

      <TabsContent value="setup" className="mt-0 space-y-6">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Account readiness
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Keep trust, public identity, and monetization setup aligned before scaling courses and paid offerings.
            </p>
            <div className="mt-5 space-y-4">
              <SetupCard
                title="Organization profile"
                description="Public identity, contact details, and trust-sensitive information."
                statusLabel="Managed in profile"
                actionLabel="Edit profile"
                onAction={() => navigate("/organization-profile")}
              />
              <SetupCard
                title="Verification status"
                description={
                  verified
                    ? "Your organization is verified."
                    : verificationPending
                      ? "Your verification request is under review."
                      : "Submit verification evidence from your organization profile."
                }
                statusLabel={verified ? "Verified" : verificationPending ? "Pending" : "Needs action"}
                actionLabel="Open profile"
                onAction={() => navigate("/organization-profile")}
              />
            </div>
          </div>
        <FinancialAccountSetupCard
          organization={organization}
          financialAccount={financialAccount}
          onSave={handleFinancialSave}
        />
        </section>
      </TabsContent>

      <TabsContent value="courses" className="mt-0 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MiniPanel
            title="Managed courses"
            value={stats.total_courses ?? courses.length}
            description="All course records in your workspace."
          />
          <MiniPanel
            title="Published courses"
            value={stats.published_courses ?? activeCourses.length}
            description="Live learning offers visible to learners."
          />
          <MiniPanel
            title="Active enrollments"
            value={stats.active_enrollments ?? 0}
            description="Learners currently progressing through a course."
          />
        </div>

        <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Managed courses
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Publish, improve, and scale your learning catalog.
              </p>
            </div>
            <Link to="/course-builder">
              <Button className="gap-2 bg-teal-600 hover:bg-teal-700">
                <BookOpen className="h-4 w-4" />
                Open course builder
              </Button>
            </Link>
          </div>
          {courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No courses yet"
              description="Use the course builder to publish your first learning offer."
              actionLabel="Open course builder"
              onAction={() => navigate("/course-builder")}
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {courses.map((course) => (
                <ManagedCourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>
      </TabsContent>

      <TabsContent value="events" className="mt-0 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MiniPanel
            title="Active events"
            value={stats.active_events ?? activeEvents.length}
            description="Current events in circulation."
          />
          <MiniPanel
            title="RSVPs"
            value={stats.total_event_rsvps ?? 0}
            description="All event RSVP activity."
          />
          <MiniPanel
            title="Attendance ready"
            value={events.reduce((sum, event) => sum + Number(event.attended_count || 0), 0)}
            description="Participation records already captured."
          />
        </div>
        <OrganizationEventManagementPanel
          events={events}
          onCreateEvent={handleCreateEvent}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          onRefreshEvents={refresh}
        />
      </TabsContent>

      <TabsContent value="jobs" className="mt-0 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MiniPanel
            title="Open jobs"
            value={stats.open_opportunities ?? openJobs.length}
            description="Roles currently accepting applicants."
          />
          <MiniPanel
            title="Applicants"
            value={stats.total_applications ?? applications.length}
            description="All candidates in the pipeline."
          />
          <MiniPanel
            title="Hired"
            value={stats.hired_applicants ?? 0}
            description="Successful outcomes captured so far."
          />
        </div>
        <OrganizationApplicantPipelinePanel
          opportunities={opportunities}
          applications={applications}
          onCreateOpportunity={handleCreateOpportunity}
          onUpdateOpportunity={handleUpdateOpportunity}
          onUpdateApplication={handleUpdateApplication}
        />
      </TabsContent>

      <TabsContent value="learners" className="mt-0 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MiniPanel
            title="Learners"
            value={enrollments.length}
            description="All enrollment records across your courses."
          />
          <MiniPanel
            title="Active progress"
            value={stats.active_enrollments ?? 0}
            description="Learners currently in progress."
          />
          <MiniPanel
            title="Completed"
            value={stats.completed_enrollments ?? 0}
            description="Learners who finished a course."
          />
        </div>
        <OrganizationEnrollmentPanel
          courses={courses}
          enrollments={enrollments}
          onOpenCourses={() => setActiveTab("courses")}
        />
      </TabsContent>
    </WorkspaceShell>
  );
}

function ReadinessItem({ icon: Icon, title, label, description, status }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl bg-secondary/30 p-2 text-teal-700">
          <Icon className="h-5 w-5" />
        </div>
        <StatusBadge status={status} label={label} />
      </div>
      <h3 className="mt-4 font-medium text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function AttentionRow({ label, value, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-secondary/25 px-4 py-3">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{value}</div>
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

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary/20 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function MiniPanel({ title, value, description }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-2 font-heading text-3xl font-bold text-foreground">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{description}</div>
    </div>
  );
}

function SetupCard({ title, description, statusLabel, actionLabel, onAction }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/15 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status="active" label={statusLabel} />
          <Button variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ManagedCourseCard({ course }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/15 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-heading text-lg font-semibold text-foreground">{course.title}</h3>
        <StatusBadge status={course.status} />
        <StatusBadge
          status={course.is_free ? "active" : "pending"}
          label={course.is_free ? "Free" : `${course.price_currency} ${course.price_amount}`}
        />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {course.category || "General"} · {course.enrolled_count || 0} enrollments
      </p>
      {course.description ? (
        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{course.description}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to={`/courses/${course.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm font-medium text-teal-700"
        >
          View public page
          <ExternalLink className="h-4 w-4" />
        </Link>
        <Link
          to="/course-builder"
          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm font-medium text-foreground"
        >
          Edit in builder
        </Link>
      </div>
    </div>
  );
}
