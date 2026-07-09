import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import AIRecommendationDeck from "@/components/shared/AIRecommendationDeck";
import EmptyState from "@/components/shared/EmptyState";
import ModuleDetailShell from "@/components/shared/ModuleDetailShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useAIRecommendationFeed } from "@/hooks/ai/useAIRecommendationFeed";
import { useDetailPageTab } from "@/hooks/dashboard/useDetailPageTab";
import {
  buildCourseRecommendationItems,
  buildEventRecommendationItems,
  buildOpportunityRecommendationItems,
  buildPeerRecommendationItems,
  buildSkillRecommendationItems,
} from "@/lib/ai-recommendation-items";
import { roles } from "@/lib/domain-enums";
import { Search, BookOpen, ArrowLeftRight, Briefcase, Calendar, TrendingUp, Sparkles } from "lucide-react";

const CATEGORIES = ["All", "Design", "Programming", "Marketing", "Photography", "Music", "Writing", "Data Science", "Languages", "Business"];

export default function Discover() {
  const { isAuthenticated, actorRole, navigateToLogin } = useAuth();
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
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
    const load = async () => {
      try {
        const data = await appClient.entities.Skill.list("-created_date", 50);
        setSkills(data);
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = skills.filter(s =>
    (category === "All" || s.category === category) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()))
  );
  const recommendationSections = useMemo(
    () => [
      {
        key: "skills",
        title: "Skills to grow",
        icon: Sparkles,
        description: "Signals from your peers, courses, and opportunities.",
        items: buildSkillRecommendationItems(recommendationFeed.skill_recommendations),
      },
      {
        key: "peers",
        title: "Peer matches",
        icon: ArrowLeftRight,
        description: "People you can learn with right now.",
        items: buildPeerRecommendationItems(recommendationFeed.peer_matches),
      },
      {
        key: "courses",
        title: "Courses",
        icon: BookOpen,
        description: "Structured paths that fit what you are already pursuing.",
        items: buildCourseRecommendationItems(recommendationFeed.course_recommendations),
      },
      {
        key: "events",
        title: "Events",
        icon: Calendar,
        description: "Workshops and live sessions connected to your field signals.",
        items: buildEventRecommendationItems(recommendationFeed.event_recommendations),
      },
      {
        key: "jobs",
        title: "Opportunities",
        icon: Briefcase,
        description: "Roles and programs your activity is pointing toward.",
        items: buildOpportunityRecommendationItems(
          recommendationFeed.opportunity_recommendations,
        ),
      },
    ],
    [recommendationFeed],
  );

  const quickLinks = [
    { icon: BookOpen, label: "Courses", path: "/courses", color: "bg-teal-50 text-teal-600", desc: "Structured learning" },
    { icon: ArrowLeftRight, label: "Skill Swap", path: "/skill-swap", color: "bg-amber-50 text-amber-600", desc: "Learn for free" },
    { icon: Calendar, label: "Events", path: "/events", color: "bg-blue-50 text-blue-600", desc: "Workshops & meetups" },
    { icon: Briefcase, label: "Jobs", path: "/jobs", color: "bg-purple-50 text-purple-600", desc: "Opportunities" },
  ];
  const discoverTabs = [
    {
      value: "explore",
      label: "Explore",
      description: "Browse skills, categories, and connected module links.",
      icon: Search,
      badge: filtered.length,
    },
    {
      value: "personalized",
      label: "Personalized discovery",
      description: "AI-assisted suggestions based on your profile and activity signals.",
      icon: Sparkles,
    },
  ];
  const { activeTab, setActiveTab } = useDetailPageTab(
    discoverTabs.map((tab) => tab.value),
    "explore",
  );

  return (
    <ModuleDetailShell
      eyebrow="Cross-module browse"
      title="Discover"
      description="Explore the directory first, then move into personalized discovery when you want AI-assisted next-step suggestions."
      value={activeTab}
      onValueChange={setActiveTab}
      tabs={discoverTabs}
    >
      <TabsContent value="explore" className="mt-0">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {quickLinks.map((ql) => {
            const Icon = ql.icon;
            return (
              <Link key={ql.path} to={ql.path} className="card-hover flex items-start gap-4 rounded-2xl border border-border/50 bg-white p-5">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${ql.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-semibold">{ql.label}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{ql.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="scrollbar-hide mt-6 flex gap-2 overflow-x-auto pb-4">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                category === c
                  ? "bg-teal-600 text-white"
                  : "border border-border bg-white text-foreground hover:bg-teal-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No skills found"
              description="Try a different search or category, or check back soon as new skills are added."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((skill) => (
                <div key={skill.id} className="card-hover rounded-2xl border border-border/50 bg-white p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                      <TrendingUp className="h-5 w-5 text-teal-600" />
                    </div>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {skill.category}
                    </span>
                  </div>
                  <h3 className="mb-1 font-heading text-base font-semibold">{skill.name}</h3>
                  <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                    {skill.description || "Explore this skill and find related courses, swaps, and opportunities."}
                  </p>
                  <div className="flex gap-2">
                    <Link to={`/courses?skill=${skill.name}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs">View Courses</Button>
                    </Link>
                    <Link to={`/skill-swap?skill=${skill.name}`} className="flex-1">
                      <Button size="sm" className="w-full bg-teal-600 text-xs hover:bg-teal-700">Swap</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="personalized" className="mt-0">
        {shouldShowPersonalizedFeed ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_320px]">
            <AIRecommendationDeck
              title="Personalized discovery"
              description="These suggestions connect your profile, learning, swap activity, and participation history into one discovery surface."
              feature={recommendationFeature}
              feed={recommendationFeed}
              sections={recommendationSections}
              loading={recommendationsLoading}
              error={recommendationsError}
              emptyTitle="Personalized discovery is warming up"
              emptyDescription="Add more profile fields and skills, then join a course, event, or swap to unlock stronger cross-module recommendations."
            />
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-teal-700" />
                  Discovery mode
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Personalized recommendations live here so the public browse grid stays clean and skimmable while your learner-specific suggestions get proper space.
                </p>
                <Button
                  variant="outline"
                  className="mt-5 w-full"
                  onClick={() => setActiveTab("explore")}
                >
                  Back to explore
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Personalized discovery
                </div>
                <h2 className="mt-3 font-heading text-2xl font-bold text-foreground">
                  Sign in to unlock learner-specific recommendations
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  SkillVerse can connect your fields, skills, courses, events, and opportunity activity into one recommendation feed once you are signed in.
                </p>
              </div>
              <Button className="bg-teal-600 hover:bg-teal-700" onClick={navigateToLogin}>
                Log in for recommendations
              </Button>
            </div>
          </div>
        )}
      </TabsContent>
    </ModuleDetailShell>
  );
}
