import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TabsContent } from "@/components/ui/tabs";
import {
  Activity,
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
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import AILearningGuidancePanel from "@/components/shared/AILearningGuidancePanel";
import EmptyState from "@/components/shared/EmptyState";
import NotificationFeedPanel from "@/components/shared/NotificationFeedPanel";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import WorkspaceShell from "@/components/shared/WorkspaceShell";
import {
  AnalyticsCountListCard,
  AnalyticsHeatmapPanel,
  AnalyticsInsightPanel,
  AnalyticsMetricGrid,
  AnalyticsSectionTabs,
  AnalyticsSystemHealthPanel,
} from "@/components/shared/AnalyticsWorkspacePanels";
import DashboardStats from "@/features/dashboard/components/DashboardStats";
import { useAILearningGuidance } from "@/hooks/ai/useAILearningGuidance";
import FinancialAccountSetupCard from "@/features/organizations/components/FinancialAccountSetupCard";
import OrganizationApplicantPipelinePanel from "@/features/organizations/components/OrganizationApplicantPipelinePanel";
import OrganizationEventManagementPanel from "@/features/organizations/components/OrganizationEventManagementPanel";
import OrganizationEnrollmentPanel from "@/features/organizations/components/OrganizationEnrollmentPanel";
import OrganizationTrustPanel from "@/features/organizations/components/OrganizationTrustPanel";
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

const validTabs = [
  "overview",
  "analytics",
  "setup",
  "courses",
  "events",
  "jobs",
  "learners",
  "trust",
];

export default function OrgManagementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeTab, setActiveTab } = useWorkspaceTab(validTabs, "overview");
  const [analyticsSection, setAnalyticsSection] = useState("snapshot");
  const [selectedLearnerId, setSelectedLearnerId] = useState("");
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
    analytics,
    loading,
    error,
    refresh,
  } = useOrganizationDashboardData();
  const verificationPending = Boolean(verification?.pending_request);
  const verified = organization?.verification_status === "verified";
  const financeReady = financialAccount?.status === "ready";
  const topPerformers = coursePerformance.slice(0, 3);
  const activeCourses = courses.filter((course) => course.status === "published");
  const activeEvents = events.filter((event) => event.status !== "cancelled");
  const openJobs = opportunities.filter((opportunity) => opportunity.status === "open");
  const learnerOptions = useMemo(() => {
    const seen = new Set();
    return enrollments
      .filter((enrollment) => enrollment.learner?.id)
      .map((enrollment) => enrollment.learner)
      .filter((learner) => {
        const key = String(learner.id);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }, [enrollments]);
  const selectedLearner = useMemo(
    () =>
      learnerOptions.find((learner) => String(learner.id) === String(selectedLearnerId)) || null,
    [learnerOptions, selectedLearnerId],
  );
  const {
    guidanceFeature,
    assignmentFeature,
    guidance,
    loading: guidanceLoading,
    error: guidanceError,
  } = useAILearningGuidance({
    enabled: Boolean(selectedLearnerId),
    userId: selectedLearnerId || undefined,
  });

  useEffect(() => {
    if (!selectedLearnerId && learnerOptions.length > 0) {
      setSelectedLearnerId(String(learnerOptions[0].id));
    }
  }, [learnerOptions, selectedLearnerId]);

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
      value: "analytics",
      label: "Analytics",
      icon: Activity,
      description: "Performance and health.",
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
    {
      value: "trust",
      label: "Trust",
      icon: ShieldCheck,
      description: "Communities, credits, and certificates.",
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
          <Link to="/payments">
            <Button variant="outline" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
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
              <AttentionRow
                label="Communities and recognition"
                value="Manage service records and certificates"
                actionLabel="Open trust"
                onAction={() => setActiveTab("trust")}
              />
              <AttentionRow
                label="Paid enrollments and automation"
                value={financeReady ? "Track transactions and service-credit fulfillment" : "Finish finance setup before paid enrollment opens"}
                actionLabel="Open payments"
                onAction={() => navigate("/payments")}
              />
              <AttentionRow
                label="Analytics lane"
                value="Track performance, health, and recommendation readiness"
                actionLabel="Open analytics"
                onAction={() => setActiveTab("analytics")}
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

      <TabsContent value="analytics" className="mt-0 space-y-6">
        <AnalyticsSectionTabs
          title="Organization analytics workspace"
          description="Switch between performance, engagement, signal, and health views instead of scrolling through every dataset at once."
          value={analyticsSection}
          onValueChange={setAnalyticsSection}
          sections={[
            {
              value: "snapshot",
              label: "Snapshot",
              description: "Primary outcomes and high-priority insights.",
            },
            {
              value: "engagement",
              label: "Engagement",
              description: "Learner, event, and hiring funnel analytics.",
            },
            {
              value: "signals",
              label: "Signals",
              description: "Fields, skills, and location trends.",
            },
            {
              value: "health",
              label: "Health",
              description: "System readiness and rollout state.",
            },
          ]}
        >
          <TabsContent value="snapshot" className="mt-0 space-y-6">
            <AnalyticsMetricGrid
              items={[
                {
                  label: "Managed learners",
                  value: analytics.summary?.managed_learners ?? enrollments.length,
                  helper: "Learners currently tied to your organization record.",
                },
                {
                  label: "Issued certificates",
                  value: analytics.summary?.issued_certificates ?? 0,
                  helper: "Verified recognition records already issued.",
                },
                {
                  label: "Service credits",
                  value: analytics.summary?.service_credit_records ?? 0,
                  helper: "Participation records that support trust surfaces later.",
                },
                {
                  label: "Recommendation ready",
                  value: `${Number(
                    analytics.matching_quality?.recommendation_ready_percent || 0,
                  ).toFixed(1)}%`,
                  helper: "Learners with enough signal depth for recommendations.",
                },
                {
                  label: "Average peer match score",
                  value: Number(
                    analytics.matching_quality?.average_peer_match_score || 0,
                  ).toFixed(1),
                  helper: "How strongly learner signals align with peer matches.",
                },
                {
                  label: "Event attendance rate",
                  value: `${Number(
                    analytics.event_engagement?.attendance_rate_percent || 0,
                  ).toFixed(1)}%`,
                  helper: "Share of RSVPs that became attendance records.",
                },
              ]}
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
              <AnalyticsInsightPanel
                insights={analytics.insight_cards}
                onOpenRoute={(route) => navigate(route)}
                description="These cues take the team straight into learner, event, or hiring work that needs attention."
              />
              <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-foreground">
                      Matching and pipeline quality
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Keep peer-match health and hiring momentum visible without mixing them into daily operations.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setActiveTab("learners")}>
                      Open learners
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("jobs")}>
                      Open jobs
                    </Button>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MiniPanel
                    title="Learners with profile fields"
                    value={analytics.matching_quality?.learners_with_profile_fields ?? 0}
                    description="Profiles carrying usable field signals."
                  />
                  <MiniPanel
                    title="Learners with skill signals"
                    value={analytics.matching_quality?.learners_with_skill_signals ?? 0}
                    description="Learners with skill data rich enough to match on."
                  />
                  <MiniPanel
                    title="Learners with peer matches"
                    value={analytics.matching_quality?.learners_with_peer_matches ?? 0}
                    description="Learners already receiving peer suggestions."
                  />
                  <MiniPanel
                    title="Accepted swaps"
                    value={analytics.matching_quality?.accepted_peer_swaps ?? 0}
                    description="Successful swap acceptances tied to current signals."
                  />
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="engagement" className="mt-0 space-y-6">
            <div className="grid gap-4 xl:grid-cols-2">
              <AnalyticsCountListCard
                icon={BookOpen}
                title="Course category distribution"
                description="See where your catalog currently concentrates."
                items={analytics.course_category_distribution}
                emptyText="Publish courses with categories to start seeing distribution trends."
              />
              <AnalyticsCountListCard
                icon={GraduationCap}
                title="Learner progress bands"
                description="Track whether learner progress is clustered at the start, middle, or finish line."
                items={analytics.learner_progress_bands}
                emptyText="Learner progress bands will appear once enrollments begin moving through course content."
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <AnalyticsCountListCard
                icon={Calendar}
                title="Event RSVP status"
                description="Understand where event interest is sitting before you inspect individual attendees."
                items={analytics.event_engagement?.rsvp_status_distribution}
                emptyText="Event RSVP analytics will appear once learners start responding to published events."
              />
              <AnalyticsCountListCard
                icon={Briefcase}
                title="Applicant pipeline status"
                description="Keep pipeline shape visible before you drill into individual applicants."
                items={analytics.opportunity_pipeline?.application_status_distribution}
                emptyText="Application status analytics will appear when candidates start entering the pipeline."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <MiniPanel
                title="Shortlisted rate"
                value={`${Number(
                  analytics.opportunity_pipeline?.shortlisted_rate_percent || 0,
                ).toFixed(1)}%`}
                description="Share of applicants moving to the shortlist stage."
              />
              <MiniPanel
                title="Hired rate"
                value={`${Number(
                  analytics.opportunity_pipeline?.hired_rate_percent || 0,
                ).toFixed(1)}%`}
                description="Share of applicants reaching the hired state."
              />
            </div>
          </TabsContent>

          <TabsContent value="signals" className="mt-0 space-y-6">
            <div className="grid gap-4 xl:grid-cols-3">
              <AnalyticsCountListCard
                icon={Sparkles}
                title="Top fields"
                description="The field signals currently leading learner and organization activity."
                items={analytics.knowledge_trends?.top_fields}
              />
              <AnalyticsCountListCard
                icon={Users}
                title="Top offered skills"
                description="Skills most commonly surfaced as teachable strengths."
                items={analytics.knowledge_trends?.top_offered_skills}
              />
              <AnalyticsCountListCard
                icon={GraduationCap}
                title="Top learning skills"
                description="Skills learners are most actively trying to develop."
                items={analytics.knowledge_trends?.top_learning_skills}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <AnalyticsCountListCard
                icon={Calendar}
                title="Event formats"
                description="A quick view of how your event mix is split across delivery styles."
                items={analytics.event_engagement?.format_distribution}
              />
              <AnalyticsHeatmapPanel
                items={analytics.social_impact_heatmap}
                description="Locations are kept as readable activity cards so the workspace stays lightweight."
              />
            </div>
          </TabsContent>

          <TabsContent value="health" className="mt-0 space-y-6">
            <AnalyticsSystemHealthPanel
              health={analytics.system_health}
              description="AI readiness, rollout state, and recent activity stay separate from daily operations so setup issues are easy to spot."
            />
          </TabsContent>
        </AnalyticsSectionTabs>
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
        <AILearningGuidancePanel
          title="Learner guidance preview"
          description="Inspect one learner's gaps, next actions, and assignment prep without leaving the organization workspace."
          guidance={guidance}
          guidanceFeature={guidanceFeature}
          assignmentFeature={assignmentFeature}
          loading={guidanceLoading}
          error={guidanceError}
          emptyTitle="No learner guidance preview available"
          emptyDescription="Choose a learner with course activity to inspect how guidance is shaping their next steps."
          action={
            learnerOptions.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Inspect learner
                  <select
                    value={selectedLearnerId}
                    onChange={(event) => setSelectedLearnerId(event.target.value)}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground"
                  >
                    {learnerOptions.map((learner) => (
                      <option key={learner.id} value={String(learner.id)}>
                        {learner.full_name || learner.email}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-3 text-sm text-muted-foreground">
                  {selectedLearner ? (
                    <>
                      Previewing guidance for{" "}
                      <span className="font-medium text-foreground">
                        {selectedLearner.full_name || selectedLearner.email}
                      </span>
                      . This keeps learner progress coaching visible to the organization team without exposing unrelated admin-only controls.
                    </>
                  ) : (
                    "Choose a learner to inspect their guidance state."
                  )}
                </div>
              </div>
            ) : null
          }
          compact
        />
      </TabsContent>

      <TabsContent value="trust" className="mt-0 space-y-6">
        <OrganizationTrustPanel
          organization={organization}
          courses={courses}
          events={events}
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
      {course.instructors?.length ? (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Active instructors
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {course.instructors.map((instructor) => (
              <span
                key={instructor.id || instructor.email || instructor.full_name}
                className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm shadow-black/5"
              >
                {instructor.full_name || instructor.email}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-border/60 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          No accepted instructors are attached yet. Invite them from the course builder.
        </div>
      )}
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
        <Link
          to={`/course-builder?course=${course.id}&tab=instructors`}
          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm font-medium text-foreground"
        >
          Manage instructors
        </Link>
      </div>
    </div>
  );
}
