import React, { useEffect, useMemo, useState } from "react";
import { Briefcase, Search } from "lucide-react";
import AIRecommendationDeck from "@/components/shared/AIRecommendationDeck";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useAIRecommendationFeed } from "@/hooks/ai/useAIRecommendationFeed";
import OpportunityCard from "@/features/jobs/components/OpportunityCard";
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
            Opportunity hub
          </p>
          <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            Jobs & Opportunities
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Roles, internships, and programs published by organizations across the platform.
          </p>
        </div>

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
      </div>

      {shouldShowPersonalizedFeed ? (
        <div className="mb-8">
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
            compact
          />
        </div>
      ) : !isAuthenticated ? (
        <div className="mb-8 rounded-3xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Personalized opportunity matching
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Log in as a regular user to see jobs and programs connected to your skills, courses, events, and field signals.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
              onClick={navigateToLogin}
            >
              Log in to personalize
            </button>
          </div>
        </div>
      ) : null}

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
            <span className="text-border">·</span>
            <span>{typeFilter === "all" ? "All opportunity types" : typeLabels[typeFilter]}</span>
          </div>

          <div className="space-y-4">
            {filtered.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
