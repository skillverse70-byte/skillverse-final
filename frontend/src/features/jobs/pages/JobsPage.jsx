import React, { useEffect, useMemo, useState } from "react";
import { Briefcase, Search, Sparkles } from "lucide-react";
import AIRecommendationDeck from "@/components/shared/AIRecommendationDeck";
import EmptyState from "@/components/shared/EmptyState";
import ModuleDetailShell from "@/components/shared/ModuleDetailShell";
import PageLoader from "@/components/shared/PageLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import OpportunityCard from "@/features/jobs/components/OpportunityCard";
import { useAIRecommendationFeed } from "@/hooks/ai/useAIRecommendationFeed";
import { useDetailPageTab } from "@/hooks/dashboard/useDetailPageTab";
import {
  buildOpportunityRecommendationItems,
  buildSkillRecommendationItems,
} from "@/lib/ai-recommendation-items";
import { roles } from "@/lib/domain-enums";
import { fetchPublicOpportunities } from "@/services/jobs/jobs.service";

const typeLabels = {
  job: "Jobs",
  internship: "Internships",
  program: "Programs",
  volunteer: "Volunteer roles",
};

export default function JobsPage() {
  const { isAuthenticated, actorRole, navigateToLogin } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const shouldShowPersonalizedFeed = isAuthenticated && actorRole === roles.regularUser;
  const {
    feature: recommendationFeature,
    feed: recommendationFeed,
    loading: recommendationsLoading,
    error: recommendationsError,
  } = useAIRecommendationFeed({
    enabled: shouldShowPersonalizedFeed,
    limitPerType: 2,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchPublicOpportunities();
        if (active) {
          setOpportunities(data);
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

  const filtered = useMemo(
    () =>
      opportunities.filter((opportunity) => {
        const searchValue = search.trim().toLowerCase();
        const matchesSearch =
          !searchValue ||
          opportunity.title?.toLowerCase().includes(searchValue) ||
          opportunity.company_name?.toLowerCase().includes(searchValue) ||
          opportunity.category?.toLowerCase().includes(searchValue) ||
          opportunity.required_skills.some((skill) =>
            skill.toLowerCase().includes(searchValue),
          );
        const matchesType =
          typeFilter === "all" || opportunity.type === typeFilter;
        const matchesStatus =
          statusFilter === "all" || opportunity.status === statusFilter;

        return matchesSearch && matchesType && matchesStatus;
      }),
    [opportunities, search, typeFilter, statusFilter],
  );
  const recommendationSections = useMemo(
    () => [
      {
        key: "jobs",
        title: "Recommended opportunities",
        icon: Briefcase,
        description: "Openings connected to your current learning and participation signals.",
        items: buildOpportunityRecommendationItems(
          recommendationFeed.opportunity_recommendations,
        ),
      },
      {
        key: "skills",
        title: "Skills these roles point toward",
        icon: Search,
        description: "High-value skills surfacing across your relevant opportunities.",
        items: buildSkillRecommendationItems(recommendationFeed.skill_recommendations),
      },
    ],
    [recommendationFeed],
  );
  const jobTabs = useMemo(
    () => [
      {
        value: "browse",
        label: "Browse openings",
        description: "Search and filter the opportunity catalog without recommendation panels crowding the list.",
        icon: Briefcase,
        badge: filtered.length,
      },
      {
        value: "personalized",
        label: "Personalized matches",
        description: "Learner-specific opportunity suggestions based on your activity and skills.",
        icon: Sparkles,
      },
    ],
    [filtered.length],
  );
  const { activeTab, setActiveTab } = useDetailPageTab(
    jobTabs.map((tab) => tab.value),
    "browse",
  );

  return (
    <ModuleDetailShell
      eyebrow="Opportunity hub"
      title="Jobs & Opportunities"
      description="Browse live openings first, then open personalized matching when you want recommendations connected to your learning signals."
      value={activeTab}
      onValueChange={setActiveTab}
      tabs={jobTabs}
      actions={
        <div className="rounded-3xl border border-border/60 bg-white px-5 py-4 shadow-sm shadow-black/5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Live openings
              </div>
              <div className="font-heading text-2xl font-bold text-foreground">
                {opportunities.length}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <TabsContent value="browse" className="mt-0">
        <div className="mb-8 grid gap-3 rounded-3xl border border-border/60 bg-white p-4 shadow-sm shadow-black/5 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by role, organization, category, or skill"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="job">Jobs</SelectItem>
              <SelectItem value="internship">Internships</SelectItem>
              <SelectItem value="program">Programs</SelectItem>
              <SelectItem value="volunteer">Volunteer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="filled">Filled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No opportunities found"
            description="Try a different filter or check back soon for new openings."
          />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span>{filtered.length} opportunities</span>
              <span className="text-border">|</span>
              <span>{typeFilter === "all" ? "All opportunity types" : typeLabels[typeFilter]}</span>
            </div>

            <div className="space-y-4">
              {filtered.map((opportunity) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="personalized" className="mt-0">
        {shouldShowPersonalizedFeed ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_320px]">
            <AIRecommendationDeck
              title="Opportunity suggestions for you"
              description="These recommendations use your profile, learning activity, events, and skill signals so jobs do not feel disconnected from the rest of the platform."
              feature={recommendationFeature}
              feed={recommendationFeed}
              sections={recommendationSections}
              loading={recommendationsLoading}
              error={recommendationsError}
              emptyTitle="No personalized job signals yet"
              emptyDescription="Complete your profile, build your skill portfolio, and participate in courses or events to unlock more relevant opportunities."
            />
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-teal-700" />
                  Match mode
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Personalized opportunity matching lives here so the main openings list remains easy to scan while learner-specific recommendations get their own dedicated surface.
                </p>
                <Button
                  variant="outline"
                  className="mt-5 w-full"
                  onClick={() => setActiveTab("browse")}
                >
                  Back to openings
                </Button>
              </div>
            </div>
          </div>
        ) : !isAuthenticated ? (
          <div className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-amber-50 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Personalized opportunity matching
                </div>
                <h2 className="mt-3 font-heading text-2xl font-bold text-foreground">
                  Log in to unlock opportunity recommendations
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Regular-user accounts can open a learner-specific job and opportunity feed tied to skills, courses, events, and participation signals.
                </p>
              </div>
              <Button className="bg-teal-600 hover:bg-teal-700" onClick={navigateToLogin}>
                Log in to personalize
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-teal-700" />
              Learner-only surface
            </div>
            <h2 className="mt-4 font-heading text-2xl font-bold text-foreground">
              Personalized opportunity matching is built for regular users
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Your current actor can still browse public opportunities, but learner-specific opportunity matching appears only for regular-user accounts because it depends on personal learning, skill, and participation signals.
            </p>
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => setActiveTab("browse")}
            >
              Return to openings
            </Button>
          </div>
        )}
      </TabsContent>
    </ModuleDetailShell>
  );
}
