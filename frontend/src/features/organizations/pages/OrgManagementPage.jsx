import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import WorkspaceShell from "@/components/shared/WorkspaceShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialAccountSetupCard from "@/features/organizations/components/FinancialAccountSetupCard";
import OrganizationApplicantPipelinePanel from "@/features/organizations/components/OrganizationApplicantPipelinePanel";
import OrganizationEventManagementPanel from "@/features/organizations/components/OrganizationEventManagementPanel";
import OrganizationEnrollmentPanel from "@/features/organizations/components/OrganizationEnrollmentPanel";
import { useToast } from "@/components/ui/use-toast";
import {
  createOrganizationEvent,
  deleteOrganizationEvent,
  fetchOrganizationEvents,
  updateOrganizationEvent,
} from "@/services/events/events.service";
import {
  createOrganizationOpportunity,
  fetchOrganizationApplications,
  fetchOrganizationOpportunities,
  updateOrganizationApplicationStatus,
  updateOrganizationOpportunity,
} from "@/services/jobs/jobs.service";
import {
  fetchOrganizationManagementData,
  saveFinancialAccountSetup,
} from "@/services/organizations/organization.service";

export default function OrgManagementPage() {
  const [organization, setOrganization] = useState(null);
  const [verification, setVerification] = useState(null);
  const [financialAccount, setFinancialAccount] = useState(null);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [events, setEvents] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingFinancialAccount, setSavingFinancialAccount] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [data, nextEvents, nextOpportunities, nextApplications] = await Promise.all([
          fetchOrganizationManagementData(),
          fetchOrganizationEvents(),
          fetchOrganizationOpportunities(),
          fetchOrganizationApplications(),
        ]);
        if (active) {
          setOrganization(data.organization);
          setVerification(data.verification);
          setFinancialAccount(data.financialAccount);
          setCourses(data.courses || []);
          setEnrollments(data.enrollments || []);
          setEvents(nextEvents || []);
          setOpportunities(nextOpportunities || []);
          setApplications(nextApplications || []);
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
  }, []);

  const handleFinancialSave = async (form) => {
    setSavingFinancialAccount(true);
    try {
      const nextFinancialAccount = await saveFinancialAccountSetup(form);
      setFinancialAccount(nextFinancialAccount);
      toast({
        title: "Financial setup submitted",
        description: "An admin must approve updated payout details before paid enrollment opens.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to save financial setup",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSavingFinancialAccount(false);
    }
  };

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
          actionLabel="Open Organization Profile"
          onAction={() => {
            window.location.href = "/organization-profile";
          }}
        />
      </div>
    );
  }

  const verificationPending = Boolean(verification?.pending_request);
  const verified = organization.verification_status === "verified";
  const financeReady = financialAccount?.status === "ready";
  const completedLearners = enrollments.filter((item) => item.status === "completed").length;
  const totalEventRsvps = events.reduce((sum, item) => sum + Number(item.total_rsvp_count || 0), 0);
  const totalApplicants = applications.length;
  const hiredApplicants = applications.filter((item) => item.status === "hired").length;

  const upsertEvent = (nextEvent) => {
    setEvents((current) => {
      const exists = current.some((item) => item.id === nextEvent.id);
      if (!exists) {
        return [nextEvent, ...current];
      }
      return current.map((item) => (item.id === nextEvent.id ? nextEvent : item));
    });
  };

  const removeEvent = (eventId) => {
    setEvents((current) => current.filter((item) => item.id !== eventId));
  };

  const refreshEvents = async () => {
    const nextEvents = await fetchOrganizationEvents();
    setEvents(nextEvents || []);
    return nextEvents || [];
  };

  const upsertOpportunity = (nextOpportunity) => {
    setOpportunities((current) => {
      const exists = current.some((item) => item.id === nextOpportunity.id);
      if (!exists) {
        return [nextOpportunity, ...current];
      }
      return current.map((item) => (item.id === nextOpportunity.id ? nextOpportunity : item));
    });
  };

  const upsertApplication = (nextApplication) => {
    setApplications((current) =>
      current.map((item) => (item.id === nextApplication.id ? nextApplication : item)),
    );
  };

  const handleCreateOpportunity = async (payload) => {
    try {
      const nextOpportunity = await createOrganizationOpportunity(payload);
      upsertOpportunity(nextOpportunity);
      toast({
        title: "Opportunity created",
        description: "The listing is now available in your organization workspace.",
      });
      return nextOpportunity;
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to create opportunity",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUpdateOpportunity = async (opportunityId, payload) => {
    try {
      const nextOpportunity = await updateOrganizationOpportunity(opportunityId, payload);
      upsertOpportunity(nextOpportunity);
      toast({
        title: "Opportunity updated",
        description: "Your listing changes were saved.",
      });
      return nextOpportunity;
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to update opportunity",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUpdateApplication = async (applicationId, payload) => {
    try {
      const nextApplication = await updateOrganizationApplicationStatus(applicationId, payload);
      upsertApplication(nextApplication);
      toast({
        title: "Applicant pipeline updated",
        description: "The candidate status was saved successfully.",
      });
      return nextApplication;
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to update applicant",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleCreateEvent = async (payload) => {
    try {
      const nextEvent = await createOrganizationEvent(payload);
      upsertEvent(nextEvent);
      toast({
        title: "Event created",
        description: "The event is now available in your organization workspace.",
      });
      return nextEvent;
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to create event",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUpdateEvent = async (eventId, payload) => {
    try {
      const nextEvent = await updateOrganizationEvent(eventId, payload);
      upsertEvent(nextEvent);
      toast({
        title: "Event updated",
        description: "Your event changes were saved.",
      });
      return nextEvent;
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to update event",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteOrganizationEvent(eventId);
      removeEvent(eventId);
      toast({
        title: "Event deleted",
        description: "The event was removed from your workspace.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to delete event",
        description: error?.message || "This event may already have attendee records.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const tabs = [
    {
      value: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      description: "Overview",
    },
    {
      value: "setup",
      label: "Account Setup",
      icon: Settings2,
      description: "Setup",
    },
    {
      value: "publishing",
      label: "Publishing",
      icon: BookOpen,
      description: "Publishing",
    },
    {
      value: "learners",
      label: "Learners",
      icon: GraduationCap,
      description: "Learners",
    },
  ];

  return (
    <WorkspaceShell
      eyebrow="Organization workspace"
      title={organization.name}
      description="Manage setup, publishing, and learner progress from one scalable workspace."
      value={activeTab}
      onValueChange={setActiveTab}
      tabs={tabs}
      showTabDescriptions={false}
      actions={
        <Link to={`/organizations/${organization.id}`}>
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Public View
          </Button>
        </Link>
      }
    >
      <TabsContent value="overview" className="mt-0 space-y-8">
        <section>
          <h2 className="mb-4 font-heading text-lg font-semibold">Readiness</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <ReadinessItem
              icon={Building}
              title="Organization profile"
              status="active"
              label="Profile Created"
              description={`${organization.type || "Organization"} in ${
                organization.location || organization.country || "location not set"
              }`}
            />
            <ReadinessItem
              icon={FileCheck2}
              title="Organization verification"
              status={verified ? "verified" : verificationPending ? "pending" : "unverified"}
              label={verified ? "Verified" : verificationPending ? "Under Review" : "Action Required"}
              description={
                verified
                  ? "Trust verification is approved."
                  : verificationPending
                    ? "Your request is waiting for admin review."
                    : "Submit verification evidence from account setup."
              }
            />
            <ReadinessItem
              icon={CreditCard}
              title="Financial account"
              status={financialAccount?.status || "not_started"}
              label={financeReady ? "Ready" : financialAccount?.status === "pending" ? "Under Review" : "Not Ready"}
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

        <section className="grid gap-4 border-t border-border/60 pt-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div>
            <h2 className="mb-4 font-heading text-lg font-semibold">Quick actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link to="/course-builder">
                <Button className="gap-2 bg-teal-600 hover:bg-teal-700">
                  <BookOpen className="h-4 w-4" />
                  Open Course Builder
                </Button>
              </Link>
              <Link to="/organization-profile">
                <Button variant="outline" className="gap-2">
                  <Building className="h-4 w-4" />
                  Edit Organization Profile
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
            <div className="mb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-teal-700" />
              <h2 className="font-heading text-base font-semibold">Learner pulse</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <QuickMetric label="Learners" value={enrollments.length} />
              <QuickMetric label="Courses" value={courses.length} />
              <QuickMetric label="Events" value={events.length} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <QuickMetric label="Completed" value={completedLearners} />
              <QuickMetric label="Event RSVPs" value={totalEventRsvps} />
              <QuickMetric label="Applicants" value={totalApplicants} />
              <QuickMetric label="Hired" value={hiredApplicants} />
            </div>
          </div>
        </section>
      </TabsContent>

      <TabsContent value="setup" className="mt-0 space-y-10">
        <section className="flex flex-col justify-between gap-4 border-b border-border/60 pb-8 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Building className="h-5 w-5 text-teal-700" />
              <h2 className="font-heading text-lg font-semibold">Organization Profile</h2>
              <StatusBadge status={organization.verification_status} />
            </div>
          </div>
          <Link to="/organization-profile">
            <Button variant="outline">Manage Profile and Verification</Button>
          </Link>
        </section>

        <FinancialAccountSetupCard
          organization={organization}
          financialAccount={financialAccount}
          saving={savingFinancialAccount}
          onSave={handleFinancialSave}
        />
      </TabsContent>

      <TabsContent value="publishing" className="mt-0">
        <Tabs defaultValue="courses">
          <TabsList className="mb-6 bg-secondary/50 p-1">
            <TabsTrigger value="courses" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Courses ({courses.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Jobs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg font-semibold">Courses</h2>
              </div>
              <Link to="/course-builder">
                <Button className="bg-teal-600 hover:bg-teal-700">Manage Courses</Button>
              </Link>
            </div>
            {courses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No courses yet"
                description="Create your first course to start reaching learners."
              />
            ) : (
              <div className="divide-y divide-border/60 border-y border-border/60">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{course.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {course.category || "General"} - {course.enrolled_count || 0} enrolled
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <StatusBadge status={course.status} />
                      <StatusBadge status={course.is_free ? "free" : "paid"} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="events">
            <OrganizationEventManagementPanel
              events={events}
              onCreateEvent={handleCreateEvent}
              onUpdateEvent={handleUpdateEvent}
              onDeleteEvent={handleDeleteEvent}
              onRefreshEvents={refreshEvents}
            />
          </TabsContent>

          <TabsContent value="jobs">
            <OrganizationApplicantPipelinePanel
              opportunities={opportunities}
              applications={applications}
              onCreateOpportunity={handleCreateOpportunity}
              onUpdateOpportunity={handleUpdateOpportunity}
              onUpdateApplication={handleUpdateApplication}
            />
          </TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value="learners" className="mt-0">
        <OrganizationEnrollmentPanel
          courses={courses}
          enrollments={enrollments}
          onOpenCourses={() => setActiveTab("publishing")}
        />
      </TabsContent>
    </WorkspaceShell>
  );
}

function ReadinessItem({ icon: Icon, title, status, label, description }) {
  return (
    <div className="border-l-2 border-teal-200 py-1 pl-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className="h-4 w-4 text-teal-700" />
          {title}
        </div>
        <StatusBadge status={status} label={label} />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function QuickMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary/20 px-3 py-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 font-heading text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}
