import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity,
  Ban,
  BookOpen,
  Briefcase,
  Building,
  Calendar,
  CheckCircle,
  CreditCard,
  ExternalLink,
  FileText,
  History,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import AdminAICognitiveMonitoringPanel from "@/components/shared/AdminAICognitiveMonitoringPanel";
import AIAdaptiveMonitoringPanel from "@/components/shared/AIAdaptiveMonitoringPanel";
import AILearningGuidancePanel from "@/components/shared/AILearningGuidancePanel";
import AIRecommendationDeck from "@/components/shared/AIRecommendationDeck";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import NotificationFeedPanel from "@/components/shared/NotificationFeedPanel";
import PageLoader from "@/components/shared/PageLoader";
import WorkspaceShell from "@/components/shared/WorkspaceShell";
import DashboardStats from "@/features/dashboard/components/DashboardStats";
import AdminTrustPanel from "@/features/organizations/components/AdminTrustPanel";
import { useToast } from "@/components/ui/use-toast";
import { useAIAdaptiveMonitoring } from "@/hooks/ai/useAIAdaptiveMonitoring";
import { useAdminAICognitiveMonitoringOverview } from "@/hooks/ai/useAdminAICognitiveMonitoringOverview";
import { useAILearningGuidance } from "@/hooks/ai/useAILearningGuidance";
import { useAIRecommendationFeed } from "@/hooks/ai/useAIRecommendationFeed";
import {
  buildCourseRecommendationItems,
  buildEventRecommendationItems,
  buildOpportunityRecommendationItems,
  buildPeerRecommendationItems,
  buildSkillRecommendationItems,
} from "@/lib/ai-recommendation-items";
import {
  createAdminTaxonomyCatalogEntry,
  decideAdminCourse,
  decideAdminJob,
  decideAdminOrganizationModeration,
  decideAdminTaxonomySuggestion,
  decideAdminUser,
  fetchAdminAuditLogDetail,
  updateAdminTaxonomyCatalogEntry,
} from "@/services/admin/admin-governance.service";
import { decideAdminEvent } from "@/services/events/events.service";
import {
  decideAdminFinancialAccount,
  decideAdminOrganizationVerificationRequest,
} from "@/services/organizations/organization.service";
import { useAdminDashboardData } from "@/hooks/dashboard/useAdminDashboardData";
import { useWorkspaceTab } from "@/hooks/dashboard/useWorkspaceTab";
import { roles, taxonomyDomains } from "@/lib/domain-enums";
import moment from "moment";

const validTabs = [
  "overview",
  "orgs",
  "financial",
  "users",
  "organizations",
  "courses",
  "jobs",
  "events",
  "trust",
  "taxonomy",
  "audit",
];

const taxonomyDomainOptions = [
  { value: "all", label: "All taxonomy domains" },
  { value: taxonomyDomains.fieldInterest, label: "Field interests" },
  { value: taxonomyDomains.skill, label: "Skills" },
  { value: taxonomyDomains.courseCategory, label: "Course categories" },
  { value: taxonomyDomains.eventCategory, label: "Event categories" },
  { value: taxonomyDomains.opportunityCategory, label: "Job categories" },
];

export default function AdminReviewPage() {
  const { activeTab, setActiveTab } = useWorkspaceTab(validTabs, "overview");
  const { toast } = useToast();
  const [actingKey, setActingKey] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState({});
  const [overrideFlags, setOverrideFlags] = useState({});
  const [financialNotes, setFinancialNotes] = useState({});
  const [restrictionReasons, setRestrictionReasons] = useState({});
  const [eventNotes, setEventNotes] = useState({});
  const [userReasons, setUserReasons] = useState({});
  const [organizationReasons, setOrganizationReasons] = useState({});
  const [courseNotes, setCourseNotes] = useState({});
  const [jobNotes, setJobNotes] = useState({});
  const [suggestionNotes, setSuggestionNotes] = useState({});
  const [catalogNames, setCatalogNames] = useState({});
  const [catalogDescriptions, setCatalogDescriptions] = useState({});
  const [catalogDraft, setCatalogDraft] = useState({
    domain: taxonomyDomains.courseCategory,
    name: "",
    description: "",
  });

  const [eventFilters, setEventFilters] = useState({
    search: "",
    status: "all",
    verificationStatus: "all",
  });
  const [userFilters, setUserFilters] = useState({
    search: "",
    role: "all",
    activity: "all",
  });
  const [organizationFilters, setOrganizationFilters] = useState({
    search: "",
    verificationStatus: "all",
    suspension: "all",
  });
  const [courseFilters, setCourseFilters] = useState({
    search: "",
    status: "all",
  });
  const [jobFilters, setJobFilters] = useState({
    search: "",
    status: "all",
  });
  const [taxonomyFilters, setTaxonomyFilters] = useState({
    search: "",
    domain: "all",
    suggestionStatus: "all",
    catalogVisibility: "all",
  });
  const [auditFilters, setAuditFilters] = useState({
    search: "",
    family: "all",
    targetType: "all",
    actor: "all",
  });
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [selectedAuditLogDetail, setSelectedAuditLogDetail] = useState(null);
  const [auditDetailLoading, setAuditDetailLoading] = useState(false);
  const [selectedRecommendationUserId, setSelectedRecommendationUserId] = useState("");

  const {
    summary,
    oversight,
    adaptiveMonitoring,
    organizationVerificationRequests,
    financialAccounts,
    events,
    users,
    moderatedOrganizations,
    courses,
    jobs,
    taxonomySuggestions,
    taxonomyCatalog,
    auditLogs,
    loading,
    error,
    refresh,
  } = useAdminDashboardData();
  const {
    feature: monitoringFeature,
    overview: monitoringOverview,
    loading: monitoringLoading,
    error: monitoringError,
  } = useAdminAICognitiveMonitoringOverview();

  const inactiveUserCount = useMemo(
    () => users.filter((user) => !user.is_active).length,
    [users],
  );
  const suspendedOrganizationCount = useMemo(
    () => moderatedOrganizations.filter((organization) => organization.is_suspended).length,
    [moderatedOrganizations],
  );
  const pendingSuggestionCount = useMemo(
    () => taxonomySuggestions.filter((suggestion) => suggestion.status === "pending").length,
    [taxonomySuggestions],
  );
  const archivedCourseCount = useMemo(
    () => courses.filter((course) => course.status === "archived").length,
    [courses],
  );
  const closedJobCount = useMemo(
    () => jobs.filter((job) => job.status === "closed").length,
    [jobs],
  );
  const auditTargetTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(auditLogs.map((log) => log.target_type).filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right)),
    [auditLogs],
  );
  const auditActorOptions = useMemo(() => {
    const seen = new Map();
    auditLogs.forEach((log) => {
      const actorKey = log.actor ?? "system";
      if (seen.has(actorKey)) {
        return;
      }
      seen.set(actorKey, {
        value: actorKey === "system" ? "system" : String(actorKey),
        label:
          log.actor_full_name ||
          log.actor_email ||
          (actorKey === "system" ? "System" : `Actor #${actorKey}`),
      });
    });
    return Array.from(seen.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }, [auditLogs]);
  const auditSummary = useMemo(() => {
    const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;
    const familyCounts = {
      moderation: 0,
      finance: 0,
      payments: 0,
      taxonomy: 0,
      verification: 0,
      other: 0,
    };

    auditLogs.forEach((log) => {
      familyCounts[getAuditActionFamily(log.action)] += 1;
    });

    return {
      total: auditLogs.length,
      recent: auditLogs.filter((log) => {
        if (!log.created_at) {
          return false;
        }
        return new Date(log.created_at).getTime() >= recentCutoff;
      }).length,
      uniqueActors: new Set(
        auditLogs.map((log) => log.actor ?? log.actor_email ?? `system-${log.id}`),
      ).size,
      ...familyCounts,
    };
  }, [auditLogs]);
  const recentAuditLogs = useMemo(() => auditLogs.slice(0, 6), [auditLogs]);
  const regularUsers = useMemo(
    () => users.filter((user) => user.role === roles.regularUser),
    [users],
  );
  const selectedRecommendationUser = useMemo(
    () =>
      regularUsers.find((user) => String(user.id) === String(selectedRecommendationUserId)) ||
      null,
    [regularUsers, selectedRecommendationUserId],
  );
  const {
    feature: recommendationFeature,
    feed: recommendationFeed,
    loading: recommendationsLoading,
    error: recommendationsError,
  } = useAIRecommendationFeed({
    enabled: Boolean(selectedRecommendationUserId),
    userId: selectedRecommendationUserId || undefined,
    limitPerType: 2,
  });
  const {
    guidanceFeature,
    assignmentFeature,
    guidance,
    loading: guidanceLoading,
    error: guidanceError,
  } = useAILearningGuidance({
    enabled: Boolean(selectedRecommendationUserId),
    userId: selectedRecommendationUserId || undefined,
  });
  const {
    adaptiveState,
    loading: adaptiveLoading,
    error: adaptiveError,
  } = useAIAdaptiveMonitoring({
    enabled: Boolean(selectedRecommendationUserId),
    userId: selectedRecommendationUserId || undefined,
    surface: "/admin",
  });
  const recommendationSections = useMemo(
    () => [
      {
        key: "skills",
        title: "Skill signals",
        icon: Sparkles,
        description: "Skills the current learner is being nudged toward.",
        items: buildSkillRecommendationItems(recommendationFeed.skill_recommendations),
      },
      {
        key: "peers",
        title: "Peer matches",
        icon: Users,
        description: "Who the recommendation layer is surfacing for collaboration.",
        items: buildPeerRecommendationItems(recommendationFeed.peer_matches),
      },
      {
        key: "courses",
        title: "Courses",
        icon: BookOpen,
        description: "Learning paths currently connected to this learner's signals.",
        items: buildCourseRecommendationItems(recommendationFeed.course_recommendations),
      },
      {
        key: "events",
        title: "Events",
        icon: Calendar,
        description: "Live experiences relevant to the same discovery graph.",
        items: buildEventRecommendationItems(recommendationFeed.event_recommendations),
      },
      {
        key: "jobs",
        title: "Opportunities",
        icon: Briefcase,
        description: "How the learner's activity flows into opportunity discovery.",
        items: buildOpportunityRecommendationItems(
          recommendationFeed.opportunity_recommendations,
        ),
      },
    ],
    [recommendationFeed],
  );

  useEffect(() => {
    if (!regularUsers.length) {
      setSelectedRecommendationUserId("");
      return;
    }

    setSelectedRecommendationUserId((current) => {
      if (current && regularUsers.some((user) => String(user.id) === String(current))) {
        return current;
      }
      return String(regularUsers[0].id);
    });
  }, [regularUsers]);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesSearch = matchesSearchTerm(
          [
            event.title,
            event.organization_name,
            event.category,
            event.description,
          ],
          eventFilters.search,
        );
        const matchesStatus =
          eventFilters.status === "all" || event.status === eventFilters.status;
        const matchesVerification =
          eventFilters.verificationStatus === "all" ||
          event.organization_verification_status === eventFilters.verificationStatus;

        return matchesSearch && matchesStatus && matchesVerification;
      }),
    [events, eventFilters],
  );

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesSearch = matchesSearchTerm(
          [user.full_name, user.email, formatActorRole(user.role)],
          userFilters.search,
        );
        const matchesRole =
          userFilters.role === "all" || user.role === userFilters.role;
        const matchesActivity =
          userFilters.activity === "all" ||
          (userFilters.activity === "active" ? user.is_active : !user.is_active);
        return matchesSearch && matchesRole && matchesActivity;
      }),
    [users, userFilters],
  );

  const filteredOrganizations = useMemo(
    () =>
      moderatedOrganizations.filter((organization) => {
        const matchesSearch = matchesSearchTerm(
          [
            organization.name,
            organization.owner_full_name,
            organization.owner_email,
            organization.contact_email,
            organization.country,
            organization.location,
          ],
          organizationFilters.search,
        );
        const matchesVerification =
          organizationFilters.verificationStatus === "all" ||
          organization.verification_status === organizationFilters.verificationStatus;
        const matchesSuspension =
          organizationFilters.suspension === "all" ||
          (organizationFilters.suspension === "suspended"
            ? organization.is_suspended
            : !organization.is_suspended);
        return matchesSearch && matchesVerification && matchesSuspension;
      }),
    [moderatedOrganizations, organizationFilters],
  );

  const filteredCourses = useMemo(
    () =>
      courses.filter((course) => {
        const matchesSearch = matchesSearchTerm(
          [
            course.title,
            course.organization_name,
            course.category,
            course.instructor_name,
          ],
          courseFilters.search,
        );
        const matchesStatus =
          courseFilters.status === "all" || course.status === courseFilters.status;
        return matchesSearch && matchesStatus;
      }),
    [courses, courseFilters],
  );

  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const matchesSearch = matchesSearchTerm(
          [job.title, job.organization_name, job.category, job.type],
          jobFilters.search,
        );
        const matchesStatus =
          jobFilters.status === "all" || job.status === jobFilters.status;
        return matchesSearch && matchesStatus;
      }),
    [jobs, jobFilters],
  );

  const filteredSuggestions = useMemo(
    () =>
      taxonomySuggestions.filter((suggestion) => {
        const matchesSearch = matchesSearchTerm(
          [
            suggestion.name,
            suggestion.description,
            suggestion.suggested_by.full_name,
            suggestion.suggested_by.email,
            suggestion.organization?.name,
          ],
          taxonomyFilters.search,
        );
        const matchesDomain =
          taxonomyFilters.domain === "all" || suggestion.domain === taxonomyFilters.domain;
        const matchesStatus =
          taxonomyFilters.suggestionStatus === "all" ||
          suggestion.status === taxonomyFilters.suggestionStatus;
        return matchesSearch && matchesDomain && matchesStatus;
      }),
    [taxonomySuggestions, taxonomyFilters],
  );

  const filteredCatalog = useMemo(
    () =>
      taxonomyCatalog.filter((entry) => {
        const matchesSearch = matchesSearchTerm(
          [entry.name, entry.slug, entry.description],
          taxonomyFilters.search,
        );
        const matchesDomain =
          taxonomyFilters.domain === "all" || entry.domain === taxonomyFilters.domain;
        const matchesVisibility =
          taxonomyFilters.catalogVisibility === "all" ||
          (taxonomyFilters.catalogVisibility === "active"
            ? entry.is_active
            : !entry.is_active);
        return matchesSearch && matchesDomain && matchesVisibility;
      }),
    [taxonomyCatalog, taxonomyFilters],
  );
  const filteredAuditLogs = useMemo(
    () =>
      auditLogs.filter((log) => {
        const matchesSearch = matchesSearchTerm(
          [
            log.summary,
            log.action,
            log.target_type,
            log.actor_email,
            log.actor_full_name,
            log.target_id,
          ],
          auditFilters.search,
        );
        const matchesFamily =
          auditFilters.family === "all" ||
          getAuditActionFamily(log.action) === auditFilters.family;
        const matchesTargetType =
          auditFilters.targetType === "all" ||
          log.target_type === auditFilters.targetType;
        const actorValue = log.actor ? String(log.actor) : "system";
        const matchesActor =
          auditFilters.actor === "all" || actorValue === auditFilters.actor;

        return matchesSearch && matchesFamily && matchesTargetType && matchesActor;
      }),
    [auditLogs, auditFilters],
  );

  useEffect(() => {
    if (filteredAuditLogs.length === 0) {
      setSelectedAuditId(null);
      setSelectedAuditLogDetail(null);
      return;
    }

    const hasSelectedAudit = filteredAuditLogs.some((log) => log.id === selectedAuditId);
    if (!hasSelectedAudit) {
      setSelectedAuditId(filteredAuditLogs[0].id);
    }
  }, [filteredAuditLogs, selectedAuditId]);

  useEffect(() => {
    let active = true;
    if (!selectedAuditId) {
      setSelectedAuditLogDetail(null);
      setAuditDetailLoading(false);
      return () => {
        active = false;
      };
    }

    const fallbackLog =
      auditLogs.find((log) => log.id === selectedAuditId) || null;
    setSelectedAuditLogDetail(fallbackLog);
    setAuditDetailLoading(true);

    fetchAdminAuditLogDetail(selectedAuditId)
      .then((detail) => {
        if (active) {
          setSelectedAuditLogDetail(detail);
        }
      })
      .catch((detailError) => {
        console.error(detailError);
        if (active) {
          setSelectedAuditLogDetail(fallbackLog);
        }
      })
      .finally(() => {
        if (active) {
          setAuditDetailLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedAuditId, auditLogs]);

  const selectedAuditLog = useMemo(() => {
    if (!selectedAuditId) {
      return null;
    }
    if (selectedAuditLogDetail?.id === selectedAuditId) {
      return selectedAuditLogDetail;
    }
    return filteredAuditLogs.find((log) => log.id === selectedAuditId) || null;
  }, [filteredAuditLogs, selectedAuditId, selectedAuditLogDetail]);

  if (loading) {
    return <PageLoader />;
  }

  const runAction = async (key, action, successTitle, onSuccess) => {
    setActingKey(key);
    try {
      await action();
      await refresh();
      if (typeof onSuccess === "function") {
        onSuccess();
      }
      toast({ title: successTitle });
    } catch (actionError) {
      console.error(actionError);
      toast({
        title: "Action failed",
        description:
          actionError.message || "Unable to save the admin moderation decision.",
        variant: "destructive",
      });
    } finally {
      setActingKey("");
    }
  };

  const openAuditInspector = (log) => {
    setSelectedAuditId(log.id);
    setActiveTab("audit");
  };

  const tabs = [
    {
      value: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      description: "Platform snapshot.",
    },
    {
      value: "orgs",
      label: `Verification (${organizationVerificationRequests.length})`,
      icon: Building,
      description: "Trust queue.",
    },
    {
      value: "financial",
      label: `Finance (${financialAccounts.length})`,
      icon: CreditCard,
      description: "Payout queue.",
    },
    {
      value: "users",
      label: `Users (${users.length})`,
      icon: UserCog,
      description: "Account controls.",
    },
    {
      value: "organizations",
      label: `Organizations (${moderatedOrganizations.length})`,
      icon: ShieldCheck,
      description: "Org moderation.",
    },
    {
      value: "courses",
      label: `Courses (${courses.length})`,
      icon: BookOpen,
      description: "Course controls.",
    },
    {
      value: "jobs",
      label: `Jobs (${jobs.length})`,
      icon: Briefcase,
      description: "Opportunity controls.",
    },
    {
      value: "events",
      label: `Events (${events.length})`,
      icon: Calendar,
      description: "Event oversight.",
    },
    {
      value: "trust",
      label: "Trust",
      icon: ShieldCheck,
      description: "Communities, credits, certificates.",
    },
    {
      value: "taxonomy",
      label: `Taxonomy (${pendingSuggestionCount})`,
      icon: Tag,
      description: "Categories and suggestions.",
    },
    {
      value: "audit",
      label: `Audit (${auditLogs.length})`,
      icon: History,
      description: "Action history.",
    },
  ];

  const statCards = [
    {
      icon: Building,
      label: "Verification queue",
      count: oversight.pending_verification_requests ?? 0,
      description: "Organizations awaiting trust review.",
      color: "bg-amber-50 text-amber-600",
      onClick: () => setActiveTab("orgs"),
    },
    {
      icon: CreditCard,
      label: "Finance queue",
      count: oversight.pending_financial_accounts ?? 0,
      description: "Financial setups awaiting review.",
      color: "bg-blue-50 text-blue-600",
      onClick: () => setActiveTab("financial"),
    },
    {
      icon: Ban,
      label: "Suspended orgs",
      count: suspendedOrganizationCount,
      description: "Organizations currently restricted.",
      color: "bg-rose-50 text-rose-600",
      onClick: () => setActiveTab("organizations"),
    },
    {
      icon: Tag,
      label: "Pending suggestions",
      count: pendingSuggestionCount,
      description: "User and org taxonomy requests.",
      color: "bg-teal-50 text-teal-600",
      onClick: () => setActiveTab("taxonomy"),
    },
    {
      icon: History,
      label: "Audit records",
      count: auditSummary.total,
      description: "Recent admin and sensitive platform actions.",
      color: "bg-slate-100 text-slate-700",
      onClick: () => setActiveTab("audit"),
    },
  ];

  return (
    <WorkspaceShell
      eyebrow="Admin workspace"
      title="Admin Governance Hub"
      description="Verification, finance, moderation, and taxonomy governance all stay inside one role-specific control surface."
      value={activeTab}
      onValueChange={setActiveTab}
      tabs={tabs}
      showTabDescriptions={false}
    >
      <TabsContent value="overview" className="mt-0 space-y-6">
        <DashboardStats stats={statCards} />

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Platform summary
              </h2>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MiniMetric label="Total users" value={summary.total_users ?? 0} />
              <MiniMetric label="Verified orgs" value={summary.verified_organizations ?? 0} />
              <MiniMetric label="Inactive users" value={inactiveUserCount} />
              <MiniMetric label="Suspended orgs" value={suspendedOrganizationCount} />
              <MiniMetric label="Archived courses" value={archivedCourseCount} />
              <MiniMetric label="Closed jobs" value={closedJobCount} />
            </div>
          </section>

          <div className="space-y-4">
            <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Oversight focus
                </h2>
              </div>
              <div className="mt-5 space-y-3">
                <AttentionRow
                  label="Pending verification requests"
                  value={String(oversight.pending_verification_requests ?? 0)}
                  actionLabel="Review verification"
                  onAction={() => setActiveTab("orgs")}
                />
                <AttentionRow
                  label="Pending financial accounts"
                  value={String(oversight.pending_financial_accounts ?? 0)}
                  actionLabel="Open finance"
                  onAction={() => setActiveTab("financial")}
                />
                <AttentionRow
                  label="Events from unverified orgs"
                  value={String(oversight.events_from_unverified_organizations ?? 0)}
                  actionLabel="Open events"
                  onAction={() => setActiveTab("events")}
                />
                <AttentionRow
                  label="Pending taxonomy suggestions"
                  value={String(pendingSuggestionCount)}
                  actionLabel="Open taxonomy"
                  onAction={() => setActiveTab("taxonomy")}
                />
                <AttentionRow
                  label="Trust record oversight"
                  value="Communities, service credits, and certificates"
                  actionLabel="Open trust"
                  onAction={() => setActiveTab("trust")}
                />
                <AttentionRow
                  label="Adaptive monitoring oversight"
                  value={String(adaptiveMonitoring.currently_monitored_users ?? 0)}
                  actionLabel="Open trust"
                  onAction={() => setActiveTab("trust")}
                />
              </div>
            </section>

            <NotificationFeedPanel
              title="Admin notifications"
              description="Recent verification, finance, moderation, and governance updates."
              limit={4}
              emptyTitle="No admin notifications yet"
              emptyDescription="Admin-facing workflow updates will appear here as governance actions happen."
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <QueuePreview
            title="Verification queue"
            description="Trust-sensitive organizations waiting for review."
            items={organizationVerificationRequests.slice(0, 3).map((request) => ({
              id: request.id,
              title: `Organization #${request.organization}`,
              subtitle: request.requested_by_email,
              status: request.used_admin_override ? "reviewing" : request.status,
            }))}
            emptyTitle="No verification items waiting"
          />
          <QueuePreview
            title="Suspended organizations"
            description="Currently restricted organizations."
            items={moderatedOrganizations
              .filter((organization) => organization.is_suspended)
              .slice(0, 3)
              .map((organization) => ({
                id: organization.id,
                title: organization.name,
                subtitle: organization.owner_email,
                status: "restricted",
              }))}
            emptyTitle="No suspended organizations"
          />
          <QueuePreview
            title="Course moderation"
            description="Courses with admin action already applied."
            items={courses
              .filter(
                (course) => course.admin_reviewed_at || course.status === "archived",
              )
              .slice(0, 3)
              .map((course) => ({
                id: course.id,
                title: course.title,
                subtitle: course.organization_name,
                status: course.status,
              }))}
            emptyTitle="No course interventions yet"
          />
          <QueuePreview
            title="Taxonomy suggestions"
            description="Newest category requests from users and organizations."
            items={taxonomySuggestions.slice(0, 3).map((suggestion) => ({
              id: suggestion.id,
              title: suggestion.name,
              subtitle:
                suggestion.organization?.name ||
                suggestion.suggested_by.full_name ||
                suggestion.suggested_by.email,
              status: suggestion.status,
            }))}
            emptyTitle="No taxonomy suggestions yet"
          />
        </div>

        <AIRecommendationDeck
          title="Learner recommendation preview"
          description="Inspect how the recommendation layer is connecting one learner's skills, swaps, courses, events, and opportunities without leaving the admin workspace."
          feature={recommendationFeature}
          feed={recommendationFeed}
          sections={recommendationSections}
          loading={recommendationsLoading}
          error={recommendationsError}
          emptyTitle="No learner recommendation preview available"
          emptyDescription="Choose a regular user with richer activity signals or wait for more profile, learning, and participation data."
          action={
            regularUsers.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Inspect learner feed
                  </div>
                  <Select
                    value={selectedRecommendationUserId}
                    onValueChange={setSelectedRecommendationUserId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a regular user" />
                    </SelectTrigger>
                    <SelectContent>
                      {regularUsers.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-3 text-sm text-muted-foreground">
                  {selectedRecommendationUser ? (
                    <>
                      Previewing recommendation output for{" "}
                      <span className="font-medium text-foreground">
                        {selectedRecommendationUser.full_name || selectedRecommendationUser.email}
                      </span>
                      . This keeps recommendation rationale inspectable for governance and quality checks.
                    </>
                  ) : (
                    "Select a learner to inspect the current recommendation graph."
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-3 text-sm text-muted-foreground">
                No regular users are available yet for recommendation inspection.
              </div>
            )
          }
        />

        <AILearningGuidancePanel
          title="Learner guidance preview"
          description="Using the learner selected above, inspect skill-gap analysis, lesson coaching, and assignment-feedback readiness from the same admin workspace."
          guidance={guidance}
          guidanceFeature={guidanceFeature}
          assignmentFeature={assignmentFeature}
          loading={guidanceLoading}
          error={guidanceError}
          emptyTitle="No learner guidance preview available"
          emptyDescription="Select a regular user with richer course activity or wait for more progress signals."
          compact
        />

        <AIAdaptiveMonitoringPanel
          title="Learner adaptive-state preview"
          description="Inspect focus drift, mood mirror status, and adaptive responses for the learner selected above. Admins can view the computed state but cannot submit learner check-ins."
          adaptiveState={adaptiveState}
          loading={adaptiveLoading}
          error={adaptiveError}
          manageHref="/admin?tab=trust"
          allowCheckIn={false}
          compact
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-slate-700" />
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    Recent audit activity
                  </h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Track moderation decisions, finance reviews, taxonomy actions, and payment-sensitive events.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("audit")}
              >
                Open audit workspace
              </Button>
            </div>

            {recentAuditLogs.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                Audit activity will appear here as governance actions happen.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {recentAuditLogs.map((log) => (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => openAuditInspector(log)}
                    className="w-full rounded-2xl border border-border/60 bg-secondary/10 px-4 py-4 text-left transition hover:border-teal-200 hover:bg-teal-50/50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        status={getAuditFamilyBadgeStatus(log.action)}
                        label={formatAuditFamilyLabel(getAuditActionFamily(log.action))}
                      />
                      <StatusBadge
                        status="reviewing"
                        label={formatTargetType(log.target_type)}
                      />
                    </div>
                    <p className="mt-3 text-sm font-medium text-foreground">{log.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatAuditActor(log)}</span>
                      <span>{formatDateTime(log.created_at)}</span>
                      <span>{formatAuditAction(log.action)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-600" />
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Governance coverage
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              A quick read on where recent oversight activity is concentrated.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MiniMetric label="Last 24 hours" value={auditSummary.recent} />
              <MiniMetric label="Unique actors" value={auditSummary.uniqueActors} />
              <MiniMetric label="Moderation" value={auditSummary.moderation} />
              <MiniMetric label="Finance" value={auditSummary.finance} />
              <MiniMetric label="Payments" value={auditSummary.payments} />
              <MiniMetric label="Taxonomy" value={auditSummary.taxonomy} />
            </div>

            <div className="mt-5 rounded-2xl bg-secondary/20 p-4 text-sm text-muted-foreground">
              Verification records, finance reviews, moderation decisions, taxonomy approvals, and payment lifecycle updates all feed the same audit stream now.
            </div>
          </section>
        </div>
      </TabsContent>

      <TabsContent value="orgs" className="mt-0">
        {organizationVerificationRequests.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Verification queue is clear"
            description="No organizations are waiting for trust review right now."
          />
        ) : (
          <div className="space-y-4">
            {organizationVerificationRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-border/50 bg-white p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50">
                    <Building className="h-6 w-6 text-teal-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-heading font-semibold">
                        Organization #{request.organization}
                      </h3>
                      <StatusBadge status={request.status} />
                      {request.used_admin_override ? (
                        <StatusBadge status="reviewing" label="Override Used" />
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{request.requested_by_email}</p>
                    {request.request_notes ? (
                      <p className="mt-4 border-l-2 border-border pl-3 text-sm text-muted-foreground">
                        {request.request_notes}
                      </p>
                    ) : null}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Textarea
                        rows={3}
                        value={reviewerNotes[request.id] || ""}
                        onChange={(event) =>
                          setReviewerNotes((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder="Internal review notes"
                      />
                      <label className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(overrideFlags[request.id])}
                          onChange={(event) =>
                            setOverrideFlags((current) => ({
                              ...current,
                              [request.id]: event.target.checked,
                            }))
                          }
                        />
                        Use admin override when evidence is incomplete
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 sm:pl-16">
                  <Button
                    onClick={() =>
                      runAction(
                        `verify-${request.id}`,
                        () =>
                          decideAdminOrganizationVerificationRequest(request.id, {
                            decision: "approved",
                            reviewerNotes: reviewerNotes[request.id] || "",
                            useAdminOverride: Boolean(overrideFlags[request.id]),
                          }),
                        "Verification approved",
                      )
                    }
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    disabled={actingKey === `verify-${request.id}`}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Verify
                  </Button>
                  <Button
                    onClick={() =>
                      runAction(
                        `reject-verification-${request.id}`,
                        () =>
                          decideAdminOrganizationVerificationRequest(request.id, {
                            decision: "rejected",
                            reviewerNotes: reviewerNotes[request.id] || "",
                            useAdminOverride: false,
                          }),
                        "Verification rejected",
                      )
                    }
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-red-600 hover:bg-red-50"
                    disabled={actingKey === `reject-verification-${request.id}`}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="financial" className="mt-0">
        {financialAccounts.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Financial queue is clear"
            description="No company financial setups are waiting for review."
          />
        ) : (
          <div className="space-y-4">
            {financialAccounts.map((account) => (
              <div key={account.id} className="rounded-xl border border-border/50 bg-white p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50">
                    <CreditCard className="h-6 w-6 text-teal-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-heading font-semibold">{account.organization_name}</h3>
                      <StatusBadge status={account.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{account.organization_email}</p>

                    <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                      <ReviewField label="Account holder" value={account.account_holder_name} />
                      <ReviewField
                        label="Bank"
                        value={
                          account.bank_name
                            ? `${account.bank_name}${account.account_number_last4 ? ` · ending ${account.account_number_last4}` : ""}`
                            : "Not provided"
                        }
                      />
                      <ReviewField label="Bank code" value={account.bank_code} />
                      <ReviewField label="Mobile money" value={account.mobile_money_number} />
                    </dl>

                    {account.setup_notes ? (
                      <p className="mt-4 border-l-2 border-border pl-3 text-sm text-muted-foreground">
                        {account.setup_notes}
                      </p>
                    ) : null}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Textarea
                        rows={3}
                        value={financialNotes[account.id] || ""}
                        onChange={(event) =>
                          setFinancialNotes((current) => ({
                            ...current,
                            [account.id]: event.target.value,
                          }))
                        }
                        placeholder="Internal review notes"
                      />
                      <Textarea
                        rows={3}
                        value={restrictionReasons[account.id] || ""}
                        onChange={(event) =>
                          setRestrictionReasons((current) => ({
                            ...current,
                            [account.id]: event.target.value,
                          }))
                        }
                        placeholder="Reason required only when restricting"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 sm:pl-16">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    disabled={actingKey === `finance-approve-${account.id}`}
                    onClick={() =>
                      runAction(
                        `finance-approve-${account.id}`,
                        () =>
                          decideAdminFinancialAccount(account.id, {
                            decision: "ready",
                            reviewNotes: financialNotes[account.id] || "",
                          }),
                        "Financial account approved",
                      )
                    }
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-red-600 hover:bg-red-50"
                    disabled={actingKey === `finance-restrict-${account.id}`}
                    onClick={() =>
                      runAction(
                        `finance-restrict-${account.id}`,
                        () =>
                          decideAdminFinancialAccount(account.id, {
                            decision: "restricted",
                            reviewNotes: financialNotes[account.id] || "",
                            restrictedReason: restrictionReasons[account.id] || "",
                          }),
                        "Financial account restricted",
                      )
                    }
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Restrict
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="users" className="mt-0 space-y-4">
        <FilterBar>
          <SearchInput
            placeholder="Search by name or email"
            value={userFilters.search}
            onChange={(value) =>
              setUserFilters((current) => ({ ...current, search: value }))
            }
          />
          <Select
            value={userFilters.role}
            onValueChange={(value) =>
              setUserFilters((current) => ({ ...current, role: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="regular_user">Regular users</SelectItem>
              <SelectItem value="organization">Organizations</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={userFilters.activity}
            onValueChange={(value) =>
              setUserFilters((current) => ({ ...current, activity: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Account state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="No users match this filter"
            description="Adjust the filters to review account status."
          />
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => {
              return (
                <div key={user.id} className="rounded-xl border border-border/50 bg-white p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-base font-semibold">
                          {user.full_name || "Unnamed account"}
                        </h3>
                        <StatusBadge
                          status={user.is_active ? "active" : "cancelled"}
                          label={user.is_active ? "Active" : "Inactive"}
                        />
                        <StatusBadge
                          status={user.is_email_verified ? "verified" : "unverified"}
                          label={user.is_email_verified ? "Email verified" : "Email unverified"}
                        />
                        <StatusBadge status="reviewing" label={formatActorRole(user.role)} />
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                        <ReviewField
                          label="Joined"
                          value={formatDateTime(user.date_joined)}
                        />
                        <ReviewField
                          label="Last login"
                          value={formatDateTime(user.last_login)}
                        />
                        <ReviewField
                          label="Privileges"
                          value={
                            user.is_superuser
                              ? "Superuser"
                              : user.is_staff
                                ? "Staff"
                                : "Standard"
                          }
                        />
                      </div>
                      <Textarea
                        rows={3}
                        value={userReasons[user.id] || ""}
                        onChange={(event) =>
                          setUserReasons((current) => ({
                            ...current,
                            [user.id]: event.target.value,
                          }))
                        }
                        className="mt-4"
                        placeholder="Reason for account status change"
                      />
                    </div>

                    <div className="flex w-full flex-col gap-2 lg:w-56">
                      <Button
                        className={
                          user.is_active
                            ? "justify-center gap-2 bg-red-600 hover:bg-red-700"
                            : "justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                        }
                        disabled={actingKey === `user-${user.id}`}
                        onClick={() =>
                          runAction(
                            `user-${user.id}`,
                            () =>
                              decideAdminUser(user.id, {
                                isActive: !user.is_active,
                                reason: userReasons[user.id] || "",
                              }),
                            user.is_active
                              ? "User deactivated"
                              : "User reactivated",
                          )
                        }
                      >
                        {user.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        {user.is_active ? "Deactivate user" : "Reactivate user"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="organizations" className="mt-0 space-y-4">
        <FilterBar>
          <SearchInput
            placeholder="Search organization or owner"
            value={organizationFilters.search}
            onChange={(value) =>
              setOrganizationFilters((current) => ({
                ...current,
                search: value,
              }))
            }
          />
          <Select
            value={organizationFilters.verificationStatus}
            onValueChange={(value) =>
              setOrganizationFilters((current) => ({
                ...current,
                verificationStatus: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Trust state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All trust states</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={organizationFilters.suspension}
            onValueChange={(value) =>
              setOrganizationFilters((current) => ({
                ...current,
                suspension: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Moderation state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All moderation states</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        {filteredOrganizations.length === 0 ? (
          <EmptyState
            icon={Building}
            title="No organizations match this filter"
            description="Adjust the filters to review organization moderation state."
          />
        ) : (
          <div className="space-y-4">
            {filteredOrganizations.map((organization) => (
              <div key={organization.id} className="rounded-xl border border-border/50 bg-white p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-base font-semibold">
                        {organization.name}
                      </h3>
                      <StatusBadge status={organization.verification_status} />
                      <StatusBadge
                        status={organization.is_suspended ? "restricted" : "active"}
                        label={organization.is_suspended ? "Suspended" : "Active"}
                      />
                      <StatusBadge status="reviewing" label={formatOrganizationType(organization.type)} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Owner: {organization.owner_full_name || "N/A"} · {organization.owner_email}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                      <ReviewField label="Contact" value={organization.contact_email} />
                      <ReviewField label="Country" value={organization.country} />
                      <ReviewField label="Location" value={organization.location} />
                    </div>
                    {organization.suspension_reason ? (
                      <p className="mt-4 border-l-2 border-border pl-3 text-sm text-muted-foreground">
                        {organization.suspension_reason}
                      </p>
                    ) : null}
                    <Textarea
                      rows={3}
                      value={
                        organizationReasons[organization.id] ||
                        organization.suspension_reason ||
                        ""
                      }
                      onChange={(event) =>
                        setOrganizationReasons((current) => ({
                          ...current,
                          [organization.id]: event.target.value,
                        }))
                      }
                      className="mt-4"
                      placeholder="Suspension reason or restoration note"
                    />
                  </div>

                  <div className="flex w-full flex-col gap-2 lg:w-56">
                    <Link
                      to={`/organizations/${organization.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm font-medium text-teal-700"
                    >
                      View public profile
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <Button
                      className={
                        organization.is_suspended
                          ? "justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                          : "justify-center gap-2 bg-red-600 hover:bg-red-700"
                      }
                      disabled={actingKey === `organization-${organization.id}`}
                      onClick={() =>
                        runAction(
                          `organization-${organization.id}`,
                          () =>
                            decideAdminOrganizationModeration(organization.id, {
                              isSuspended: !organization.is_suspended,
                              suspensionReason:
                                organizationReasons[organization.id] || "",
                            }),
                          organization.is_suspended
                            ? "Organization restored"
                            : "Organization suspended",
                        )
                      }
                    >
                      {organization.is_suspended ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Ban className="h-4 w-4" />
                      )}
                      {organization.is_suspended ? "Restore organization" : "Suspend organization"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="courses" className="mt-0 space-y-4">
        <FilterBar>
          <SearchInput
            placeholder="Search course or organization"
            value={courseFilters.search}
            onChange={(value) =>
              setCourseFilters((current) => ({ ...current, search: value }))
            }
          />
          <Select
            value={courseFilters.status}
            onValueChange={(value) =>
              setCourseFilters((current) => ({ ...current, status: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Course status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        {filteredCourses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses match this filter"
            description="Adjust the course filters to review publishable learning content."
          />
        ) : (
          <div className="space-y-4">
            {filteredCourses.map((course) => (
              <div key={course.id} className="rounded-xl border border-border/50 bg-white p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-base font-semibold">{course.title}</h3>
                      <StatusBadge status={course.status} />
                      <StatusBadge
                        status={course.organization_verification_status}
                        label={
                          course.organization_verification_status === "verified"
                            ? "Verified Org"
                            : "Unverified Org"
                        }
                      />
                      <StatusBadge
                        status={course.is_free ? "free" : "paid"}
                        label={course.is_free ? "Free" : "Paid"}
                      />
                      <StatusBadge
                        status={course.enrollment_open ? "active" : "closed"}
                        label={course.enrollment_open ? "Enrollment open" : "Enrollment closed"}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {course.organization_name} · {course.category || "General"}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                      <ReviewField label="Price" value={course.is_free ? "Free" : `${course.price_amount} ${course.price_currency}`} />
                      <ReviewField label="Lessons" value={course.total_lessons} />
                      <ReviewField label="Enrollments" value={course.enrolled_count} />
                      <ReviewField label="Last review" value={formatDateTime(course.admin_reviewed_at)} />
                    </div>
                    <Textarea
                      rows={3}
                      value={courseNotes[course.id] ?? course.admin_review_notes ?? ""}
                      onChange={(event) =>
                        setCourseNotes((current) => ({
                          ...current,
                          [course.id]: event.target.value,
                        }))
                      }
                      className="mt-4"
                      placeholder="Admin review notes"
                    />
                  </div>

                  <div className="flex w-full flex-col gap-2 lg:w-56">
                    <Link
                      to={`/courses/${course.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm font-medium text-teal-700"
                    >
                      Open course
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <Button
                      variant="outline"
                      className="justify-center gap-2 text-red-600 hover:bg-red-50"
                      disabled={actingKey === `course-archive-${course.id}`}
                      onClick={() =>
                        runAction(
                          `course-archive-${course.id}`,
                          () =>
                            decideAdminCourse(course.id, {
                              status: "archived",
                              enrollmentOpen: false,
                              reviewNotes:
                                courseNotes[course.id] ??
                                course.admin_review_notes ??
                                "",
                            }),
                          "Course archived",
                        )
                      }
                    >
                      <Ban className="h-4 w-4" />
                      Archive course
                    </Button>
                    <Button
                      variant="outline"
                      disabled={actingKey === `course-enrollment-${course.id}`}
                      onClick={() =>
                        runAction(
                          `course-enrollment-${course.id}`,
                          () =>
                            decideAdminCourse(course.id, {
                              enrollmentOpen: !course.enrollment_open,
                              reviewNotes:
                                courseNotes[course.id] ??
                                course.admin_review_notes ??
                                "",
                            }),
                          course.enrollment_open
                            ? "Course enrollment closed"
                            : "Course enrollment reopened",
                        )
                      }
                    >
                      {course.enrollment_open ? "Close enrollment" : "Reopen enrollment"}
                    </Button>
                    <Button
                      className="justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                      disabled={actingKey === `course-restore-${course.id}`}
                      onClick={() =>
                        runAction(
                          `course-restore-${course.id}`,
                          () =>
                            decideAdminCourse(course.id, {
                              status:
                                course.status === "draft" ? "published" : "published",
                              enrollmentOpen: true,
                              reviewNotes:
                                courseNotes[course.id] ??
                                course.admin_review_notes ??
                                "",
                            }),
                          course.status === "draft"
                            ? "Course published"
                            : "Course restored",
                        )
                      }
                    >
                      <CheckCircle className="h-4 w-4" />
                      {course.status === "draft" ? "Publish course" : "Restore course"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="jobs" className="mt-0 space-y-4">
        <FilterBar>
          <SearchInput
            placeholder="Search job or organization"
            value={jobFilters.search}
            onChange={(value) =>
              setJobFilters((current) => ({ ...current, search: value }))
            }
          />
          <Select
            value={jobFilters.status}
            onValueChange={(value) =>
              setJobFilters((current) => ({ ...current, status: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Listing status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="filled">Filled</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        {filteredJobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No opportunities match this filter"
            description="Adjust the listing filters to review job moderation state."
          />
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-border/50 bg-white p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-base font-semibold">{job.title}</h3>
                      <StatusBadge status={job.status} />
                      <StatusBadge
                        status={job.organization_verification_status}
                        label={
                          job.organization_verification_status === "verified"
                            ? "Verified Org"
                            : "Unverified Org"
                        }
                      />
                      <StatusBadge status="reviewing" label={formatOpportunityType(job.type)} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {job.organization_name} · {job.category || "General"}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                      <ReviewField label="Location" value={job.is_remote ? "Remote" : job.location} />
                      <ReviewField label="Applicants" value={job.application_count} />
                      <ReviewField label="Deadline" value={formatDate(job.deadline)} />
                      <ReviewField label="Last review" value={formatDateTime(job.admin_reviewed_at)} />
                    </div>
                    <Textarea
                      rows={3}
                      value={jobNotes[job.id] ?? job.admin_review_notes ?? ""}
                      onChange={(event) =>
                        setJobNotes((current) => ({
                          ...current,
                          [job.id]: event.target.value,
                        }))
                      }
                      className="mt-4"
                      placeholder="Admin review notes"
                    />
                  </div>

                  <div className="flex w-full flex-col gap-2 lg:w-56">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm font-medium text-teal-700"
                    >
                      Open listing
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <Button
                      variant="outline"
                      className="justify-center gap-2 text-red-600 hover:bg-red-50"
                      disabled={actingKey === `job-close-${job.id}`}
                      onClick={() =>
                        runAction(
                          `job-close-${job.id}`,
                          () =>
                            decideAdminJob(job.id, {
                              status: "closed",
                              reviewNotes:
                                jobNotes[job.id] ?? job.admin_review_notes ?? "",
                            }),
                          "Listing closed",
                        )
                      }
                    >
                      <Ban className="h-4 w-4" />
                      Close listing
                    </Button>
                    <Button
                      variant="outline"
                      disabled={actingKey === `job-filled-${job.id}`}
                      onClick={() =>
                        runAction(
                          `job-filled-${job.id}`,
                          () =>
                            decideAdminJob(job.id, {
                              status: "filled",
                              reviewNotes:
                                jobNotes[job.id] ?? job.admin_review_notes ?? "",
                            }),
                          "Listing marked filled",
                        )
                      }
                    >
                      Mark filled
                    </Button>
                    <Button
                      className="justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                      disabled={actingKey === `job-open-${job.id}`}
                      onClick={() =>
                        runAction(
                          `job-open-${job.id}`,
                          () =>
                            decideAdminJob(job.id, {
                              status: "open",
                              reviewNotes:
                                jobNotes[job.id] ?? job.admin_review_notes ?? "",
                            }),
                          job.status === "draft" ? "Listing published" : "Listing reopened",
                        )
                      }
                    >
                      <CheckCircle className="h-4 w-4" />
                      {job.status === "draft" ? "Publish listing" : "Reopen listing"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="events" className="mt-0 space-y-4">
        <FilterBar>
          <SearchInput
            placeholder="Search event or organization"
            value={eventFilters.search}
            onChange={(value) =>
              setEventFilters((current) => ({ ...current, search: value }))
            }
          />
          <Select
            value={eventFilters.status}
            onValueChange={(value) =>
              setEventFilters((current) => ({ ...current, status: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Event status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={eventFilters.verificationStatus}
            onValueChange={(value) =>
              setEventFilters((current) => ({
                ...current,
                verificationStatus: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Trust state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All trust states</SelectItem>
              <SelectItem value="verified">Verified orgs</SelectItem>
              <SelectItem value="unverified">Unverified orgs</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        {filteredEvents.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No events match this view"
            description="Adjust the filters or wait for new events to appear."
          />
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-border/50 bg-white p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-base font-semibold">{event.title}</h3>
                      <StatusBadge status={event.status} />
                      <StatusBadge
                        status={event.organization_verification_status}
                        label={
                          event.organization_verification_status === "verified"
                            ? "Verified Org"
                            : "Unverified Org"
                        }
                      />
                      <StatusBadge
                        status={event.rsvp_open ? "active" : "cancelled"}
                        label={event.rsvp_open ? "RSVP Open" : "RSVP Closed"}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {event.organization_name} · {event.category || "General"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Starts {formatDateTime(event.starts_at)}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                      <ReviewField label="RSVPs" value={event.total_rsvp_count} />
                      <ReviewField label="Going" value={event.current_attendees} />
                      <ReviewField label="Attended" value={event.attended_count} />
                      <ReviewField
                        label="Spots remaining"
                        value={event.spots_remaining ?? "Unlimited"}
                      />
                    </div>
                    <Textarea
                      rows={3}
                      value={eventNotes[event.id] ?? event.admin_review_notes ?? ""}
                      onChange={(evt) =>
                        setEventNotes((current) => ({
                          ...current,
                          [event.id]: evt.target.value,
                        }))
                      }
                      className="mt-4"
                      placeholder="Admin review notes"
                    />
                    <div className="mt-2 text-xs text-muted-foreground">
                      {event.reviewed_by_email
                        ? `Last reviewed by ${event.reviewed_by_email}${
                            event.admin_reviewed_at
                              ? ` on ${formatDateTime(event.admin_reviewed_at)}`
                              : ""
                          }`
                        : "No admin review recorded yet."}
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2 lg:w-56">
                    <Link
                      to={`/events/${event.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm font-medium text-teal-700"
                    >
                      Open public event
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <Button
                      variant="outline"
                      className="justify-center gap-2 text-red-600 hover:bg-red-50"
                      disabled={actingKey === `event-cancel-${event.id}`}
                      onClick={() =>
                        runAction(
                          `event-cancel-${event.id}`,
                          () =>
                            decideAdminEvent(event.id, {
                              status: "cancelled",
                              rsvpOpen: false,
                              reviewNotes:
                                eventNotes[event.id] ??
                                event.admin_review_notes ??
                                "",
                            }),
                          "Event cancelled",
                        )
                      }
                    >
                      Cancel event
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-center gap-2"
                      disabled={actingKey === `event-rsvp-${event.id}`}
                      onClick={() =>
                        runAction(
                          `event-rsvp-${event.id}`,
                          () =>
                            decideAdminEvent(event.id, {
                              rsvpOpen: !event.rsvp_open,
                              reviewNotes:
                                eventNotes[event.id] ??
                                event.admin_review_notes ??
                                "",
                            }),
                          event.rsvp_open ? "RSVP closed" : "RSVP reopened",
                        )
                      }
                    >
                      {event.rsvp_open ? "Close RSVP" : "Reopen RSVP"}
                    </Button>
                    <Button
                      className="justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                      disabled={actingKey === `event-restore-${event.id}`}
                      onClick={() =>
                        runAction(
                          `event-restore-${event.id}`,
                          () =>
                            decideAdminEvent(event.id, {
                              status: "upcoming",
                              rsvpOpen: true,
                              reviewNotes:
                                eventNotes[event.id] ??
                                event.admin_review_notes ??
                                "",
                            }),
                          "Event restored",
                        )
                      }
                    >
                      Restore event
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="trust" className="mt-0 space-y-6">
        <AdminAICognitiveMonitoringPanel
          feature={monitoringFeature}
          overview={monitoringOverview}
          loading={monitoringLoading}
          error={monitoringError}
        />
        <AdminTrustPanel />
      </TabsContent>

      <TabsContent value="taxonomy" className="mt-0 space-y-6">
        <div className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-teal-600" />
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Add controlled catalog entry
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a managed taxonomy entry directly when the PRD requires a fixed list.
          </p>
          <div className="mt-5 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
            <Select
              value={catalogDraft.domain}
              onValueChange={(value) =>
                setCatalogDraft((current) => ({ ...current, domain: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose domain" />
              </SelectTrigger>
              <SelectContent>
                {taxonomyDomainOptions
                  .filter((option) => option.value !== "all")
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              value={catalogDraft.name}
              onChange={(event) =>
                setCatalogDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="New catalog name"
            />
          </div>
          <Textarea
            rows={3}
            value={catalogDraft.description}
            onChange={(event) =>
              setCatalogDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            className="mt-3"
            placeholder="Optional description"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              disabled={
                actingKey === "catalog-create" || !catalogDraft.name.trim()
              }
              onClick={() =>
                runAction(
                  "catalog-create",
                  () =>
                    createAdminTaxonomyCatalogEntry({
                      domain: catalogDraft.domain,
                      name: catalogDraft.name.trim(),
                      description: catalogDraft.description.trim(),
                    }),
                  "Catalog entry created",
                  () =>
                    setCatalogDraft({
                      domain: catalogDraft.domain,
                      name: "",
                      description: "",
                    }),
                )
              }
            >
              Create entry
            </Button>
          </div>
        </div>

        <FilterBar>
          <SearchInput
            placeholder="Search taxonomy records"
            value={taxonomyFilters.search}
            onChange={(value) =>
              setTaxonomyFilters((current) => ({ ...current, search: value }))
            }
          />
          <Select
            value={taxonomyFilters.domain}
            onValueChange={(value) =>
              setTaxonomyFilters((current) => ({ ...current, domain: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Domain" />
            </SelectTrigger>
            <SelectContent>
              {taxonomyDomainOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={taxonomyFilters.suggestionStatus}
            onValueChange={(value) =>
              setTaxonomyFilters((current) => ({
                ...current,
                suggestionStatus: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Suggestion state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All suggestion states</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={taxonomyFilters.catalogVisibility}
            onValueChange={(value) =>
              setTaxonomyFilters((current) => ({
                ...current,
                catalogVisibility: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Catalog visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All catalog entries</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="inactive">Inactive only</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-4">
            <div className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    Suggestion review
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Approve or reject user and organization taxonomy requests.
                  </p>
                </div>
                <StatusBadge status="pending" label={`${pendingSuggestionCount} pending`} />
              </div>
            </div>

            {filteredSuggestions.length === 0 ? (
              <EmptyState
                icon={Tag}
                title="No suggestions match this filter"
                description="Adjust the taxonomy filters to review pending or historical suggestions."
              />
            ) : (
              filteredSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="rounded-xl border border-border/50 bg-white p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-base font-semibold">{suggestion.name}</h3>
                    <StatusBadge status={suggestion.status} />
                    <StatusBadge
                      status="reviewing"
                      label={formatTaxonomyDomain(suggestion.domain)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Submitted by{" "}
                    {suggestion.organization?.name ||
                      suggestion.suggested_by.full_name ||
                      suggestion.suggested_by.email}
                  </p>
                  {suggestion.description ? (
                    <p className="mt-3 text-sm text-muted-foreground">{suggestion.description}</p>
                  ) : null}
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <ReviewField label="Requester email" value={suggestion.suggested_by.email} />
                    <ReviewField label="Created" value={formatDateTime(suggestion.created_at)} />
                  </div>
                  {suggestion.resolved_entry_name ? (
                    <p className="mt-3 rounded-2xl bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                      Resolved as {suggestion.resolved_entry_name} ({suggestion.resolved_entry_slug})
                    </p>
                  ) : null}
                  <Textarea
                    rows={3}
                    value={suggestionNotes[suggestion.id] ?? suggestion.reviewer_notes ?? ""}
                    onChange={(event) =>
                      setSuggestionNotes((current) => ({
                        ...current,
                        [suggestion.id]: event.target.value,
                      }))
                    }
                    className="mt-4"
                    placeholder="Reviewer notes"
                  />
                  {suggestion.status === "pending" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                        disabled={actingKey === `suggestion-approve-${suggestion.id}`}
                        onClick={() =>
                          runAction(
                            `suggestion-approve-${suggestion.id}`,
                            () =>
                              decideAdminTaxonomySuggestion(suggestion.id, {
                                decision: "approved",
                                reviewerNotes:
                                  suggestionNotes[suggestion.id] ??
                                  suggestion.reviewer_notes ??
                                  "",
                              }),
                            "Suggestion approved",
                          )
                        }
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-red-600 hover:bg-red-50"
                        disabled={actingKey === `suggestion-reject-${suggestion.id}`}
                        onClick={() =>
                          runAction(
                            `suggestion-reject-${suggestion.id}`,
                            () =>
                              decideAdminTaxonomySuggestion(suggestion.id, {
                                decision: "rejected",
                                reviewerNotes:
                                  suggestionNotes[suggestion.id] ??
                                  suggestion.reviewer_notes ??
                                  "",
                              }),
                            "Suggestion rejected",
                          )
                        }
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </section>

          <section className="space-y-4">
            <div className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    Controlled catalog
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Activate, deactivate, and refine the fixed taxonomy lists used across the platform.
                  </p>
                </div>
                <StatusBadge
                  status="active"
                  label={`${taxonomyCatalog.filter((entry) => entry.is_active).length} active`}
                />
              </div>
            </div>

            {filteredCatalog.length === 0 ? (
              <EmptyState
                icon={Tag}
                title="No catalog entries match this filter"
                description="Adjust the filters or create a controlled entry above."
              />
            ) : (
              filteredCatalog.map((entry) => {
                const cachedName = catalogNames[entry.id];
                const cachedDescription = catalogDescriptions[entry.id];
                return (
                  <div key={`${entry.domain}-${entry.id}`} className="rounded-xl border border-border/50 bg-white p-5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge
                        status={entry.is_active ? "active" : "cancelled"}
                        label={entry.is_active ? "Active" : "Inactive"}
                      />
                      <StatusBadge
                        status="reviewing"
                        label={formatTaxonomyDomain(entry.domain)}
                      />
                      <span className="text-xs text-muted-foreground">{entry.slug}</span>
                    </div>

                    <Input
                      value={cachedName ?? entry.name}
                      onChange={(event) =>
                        setCatalogNames((current) => ({
                          ...current,
                          [entry.id]: event.target.value,
                        }))
                      }
                      placeholder="Catalog name"
                    />
                    <Textarea
                      rows={3}
                      value={cachedDescription ?? entry.description}
                      onChange={(event) =>
                        setCatalogDescriptions((current) => ({
                          ...current,
                          [entry.id]: event.target.value,
                        }))
                      }
                      className="mt-3"
                      placeholder="Catalog description"
                    />
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <ReviewField label="Created" value={formatDateTime(entry.created_at)} />
                      <ReviewField label="Updated" value={formatDateTime(entry.updated_at)} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actingKey === `catalog-save-${entry.id}`}
                        onClick={() =>
                          runAction(
                            `catalog-save-${entry.id}`,
                            () =>
                              updateAdminTaxonomyCatalogEntry(entry.domain, entry.id, {
                                name: (catalogNames[entry.id] ?? entry.name).trim(),
                                description:
                                  (catalogDescriptions[entry.id] ?? entry.description).trim(),
                              }),
                            "Catalog entry updated",
                          )
                        }
                      >
                        Save details
                      </Button>
                      <Button
                        size="sm"
                        className={
                          entry.is_active
                            ? "gap-1.5 bg-red-600 hover:bg-red-700"
                            : "gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                        }
                        disabled={actingKey === `catalog-toggle-${entry.id}`}
                        onClick={() =>
                          runAction(
                            `catalog-toggle-${entry.id}`,
                            () =>
                              updateAdminTaxonomyCatalogEntry(entry.domain, entry.id, {
                                isActive: !entry.is_active,
                              }),
                            entry.is_active
                              ? "Catalog entry deactivated"
                              : "Catalog entry reactivated",
                          )
                        }
                      >
                        {entry.is_active ? (
                          <>
                            <Ban className="h-3.5 w-3.5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Reactivate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </div>
      </TabsContent>

      <TabsContent value="audit" className="mt-0 space-y-6">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <MiniMetric label="Total records" value={auditSummary.total} />
          <MiniMetric label="Recent activity" value={auditSummary.recent} />
          <MiniMetric label="Verification and finance" value={auditSummary.verification + auditSummary.finance} />
          <MiniMetric label="Payment actions" value={auditSummary.payments} />
        </div>

        <FilterBar>
          <SearchInput
            placeholder="Search summary, actor, action, or target"
            value={auditFilters.search}
            onChange={(value) =>
              setAuditFilters((current) => ({ ...current, search: value }))
            }
          />
          <Select
            value={auditFilters.family}
            onValueChange={(value) =>
              setAuditFilters((current) => ({ ...current, family: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Action family" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All action families</SelectItem>
              <SelectItem value="moderation">Moderation</SelectItem>
              <SelectItem value="verification">Verification</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="payments">Payments</SelectItem>
              <SelectItem value="taxonomy">Taxonomy</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={auditFilters.targetType}
            onValueChange={(value) =>
              setAuditFilters((current) => ({ ...current, targetType: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Target type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All target types</SelectItem>
              {auditTargetTypeOptions.map((targetType) => (
                <SelectItem key={targetType} value={targetType}>
                  {formatTargetType(targetType)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={auditFilters.actor}
            onValueChange={(value) =>
              setAuditFilters((current) => ({ ...current, actor: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Actor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actors</SelectItem>
              {auditActorOptions.map((actorOption) => (
                <SelectItem key={actorOption.value} value={actorOption.value}>
                  {actorOption.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>

        {filteredAuditLogs.length === 0 ? (
          <EmptyState
            icon={History}
            title="No audit records match this filter"
            description="Adjust the audit filters to inspect governance and security-sensitive actions."
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <section className="space-y-3">
              {filteredAuditLogs.map((log) => {
                const isSelected = log.id === selectedAuditId;
                return (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setSelectedAuditId(log.id)}
                    className={`w-full rounded-3xl border px-5 py-5 text-left shadow-sm shadow-black/5 transition ${
                      isSelected
                        ? "border-teal-200 bg-teal-50/60"
                        : "border-border/60 bg-white hover:border-teal-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status={getAuditFamilyBadgeStatus(log.action)}
                            label={formatAuditFamilyLabel(getAuditActionFamily(log.action))}
                          />
                          <StatusBadge
                            status="reviewing"
                            label={formatTargetType(log.target_type)}
                          />
                        </div>
                        <p className="mt-3 text-sm font-medium text-foreground">{log.summary}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>{formatAuditActor(log)}</span>
                          <span>{formatDateTime(log.created_at)}</span>
                          <span>{formatAuditAction(log.action)}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                        #{log.target_id}
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>

            <section className="xl:sticky xl:top-24">
              <div className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-700" />
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    Audit detail
                  </h2>
                </div>

                {!selectedAuditLog ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    Select an audit record to inspect who acted, what changed, and which workflow it belongs to.
                  </p>
                ) : (
                  <div className="mt-5 space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        status={getAuditFamilyBadgeStatus(selectedAuditLog.action)}
                        label={formatAuditFamilyLabel(
                          getAuditActionFamily(selectedAuditLog.action),
                        )}
                      />
                      <StatusBadge
                        status="reviewing"
                        label={formatTargetType(selectedAuditLog.target_type)}
                      />
                      {auditDetailLoading ? (
                        <span className="text-xs text-muted-foreground">Refreshing…</span>
                      ) : null}
                    </div>

                    <div>
                      <h3 className="font-heading text-xl font-semibold text-foreground">
                        {selectedAuditLog.summary}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {formatAuditAction(selectedAuditLog.action)}
                      </p>
                    </div>

                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <ReviewField label="Actor" value={formatAuditActor(selectedAuditLog)} />
                      <ReviewField
                        label="Actor role"
                        value={
                          selectedAuditLog.actor_role
                            ? formatActorRole(selectedAuditLog.actor_role)
                            : "System"
                        }
                      />
                      <ReviewField label="Recorded" value={formatDateTime(selectedAuditLog.created_at)} />
                      <ReviewField
                        label="Target"
                        value={`${formatTargetType(selectedAuditLog.target_type)} #${selectedAuditLog.target_id}`}
                      />
                    </dl>

                    <div className="rounded-2xl bg-secondary/20 p-4">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Metadata
                      </div>
                      {Object.keys(selectedAuditLog.metadata || {}).length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          No additional metadata was recorded for this action.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {Object.entries(selectedAuditLog.metadata).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex flex-col gap-1 rounded-2xl bg-white px-3 py-3"
                            >
                              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                {formatMetadataLabel(key)}
                              </div>
                              <div className="text-sm text-foreground">
                                {formatMetadataValue(value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {getAuditRouteTab(selectedAuditLog) ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setActiveTab(getAuditRouteTab(selectedAuditLog))}
                        >
                          Open related queue
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setAuditFilters((current) => ({
                            ...current,
                            family: getAuditActionFamily(selectedAuditLog.action),
                          }))
                        }
                      >
                        Filter to this family
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </TabsContent>
    </WorkspaceShell>
  );
}

function matchesSearchTerm(values, searchValue) {
  const normalizedSearch = String(searchValue || "").trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  return values.some((value) =>
    String(value || "").toLowerCase().includes(normalizedSearch),
  );
}

function getAuditActionFamily(action) {
  const normalizedAction = String(action || "").toLowerCase();
  if (normalizedAction.startsWith("taxonomy.")) {
    return "taxonomy";
  }
  if (normalizedAction.startsWith("payment.")) {
    return "payments";
  }
  if (normalizedAction.startsWith("financial_account.")) {
    return "finance";
  }
  if (normalizedAction.startsWith("organization.verification.")) {
    return "verification";
  }
  if (
    normalizedAction.startsWith("account.admin.") ||
    normalizedAction.startsWith("organization.admin.") ||
    normalizedAction.startsWith("course.admin.") ||
    normalizedAction.startsWith("opportunity.admin.") ||
    normalizedAction.startsWith("event.admin.")
  ) {
    return "moderation";
  }
  return "other";
}

function getAuditFamilyBadgeStatus(action) {
  return {
    moderation: "restricted",
    verification: "pending",
    finance: "ready",
    payments: "active",
    taxonomy: "reviewing",
    other: "closed",
  }[getAuditActionFamily(action)];
}

function formatAuditFamilyLabel(family) {
  return {
    moderation: "Moderation",
    verification: "Verification",
    finance: "Finance",
    payments: "Payments",
    taxonomy: "Taxonomy",
    other: "Other",
  }[family] || "Other";
}

function formatAuditAction(action) {
  return String(action || "")
    .split(".")
    .filter(Boolean)
    .map((part) => part.replaceAll("_", " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

function formatTargetType(targetType) {
  return String(targetType || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMetadataLabel(key) {
  return String(key || "")
    .replaceAll("_", " ")
    .replaceAll(".", " ")
    .trim();
}

function formatMetadataValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Not recorded";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return value.length > 0
      ? value
          .map((item) =>
            typeof item === "object" ? JSON.stringify(item) : String(item),
          )
          .join(", ")
      : "None";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function formatAuditActor(log) {
  if (log.actor_full_name && log.actor_email) {
    return `${log.actor_full_name} (${log.actor_email})`;
  }
  if (log.actor_full_name) {
    return log.actor_full_name;
  }
  if (log.actor_email) {
    return log.actor_email;
  }
  return "System";
}

function getAuditRouteTab(log) {
  return {
    organization_verification: "orgs",
    financial_account: "financial",
    user: "users",
    organization: "organizations",
    course_program: "courses",
    opportunity: "jobs",
    event: "events",
    category_suggestion: "taxonomy",
    managed_category: "taxonomy",
    skill: "taxonomy",
    field_interest: "taxonomy",
    payment_transaction: "audit",
    payment_webhook_event: "audit",
  }[log?.target_type] || null;
}

function formatActorRole(role) {
  return {
    regular_user: "Regular User",
    organization: "Organization",
    admin: "Admin",
  }[role] || role;
}

function formatOrganizationType(type) {
  return String(type || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatOpportunityType(type) {
  return String(type || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTaxonomyDomain(domain) {
  const label = taxonomyDomainOptions.find((option) => option.value === domain)?.label;
  return label || domain;
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }
  return moment(value).format("MMM D, YYYY h:mm A");
}

function formatDate(value) {
  if (!value) {
    return "Not provided";
  }
  return moment(value).format("MMM D, YYYY");
}

function FilterBar({ children }) {
  return (
    <div className="grid gap-3 rounded-3xl border border-border/60 bg-white p-4 md:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative md:col-span-2 xl:col-span-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-10"
      />
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

function QueuePreview({ title, description, items, emptyTitle }) {
  return (
    <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
      <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{emptyTitle}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl bg-secondary/20 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewField({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value || "Not provided"}</dd>
    </div>
  );
}
