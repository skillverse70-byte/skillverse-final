import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Globe, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import AIRecommendationDeck from "@/components/shared/AIRecommendationDeck";
import EmptyState from "@/components/shared/EmptyState";
import ModuleDetailShell from "@/components/shared/ModuleDetailShell";
import PageLoader from "@/components/shared/PageLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import EventCard from "@/features/events/components/EventCard";
import { useAIRecommendationFeed } from "@/hooks/ai/useAIRecommendationFeed";
import { useDetailPageTab } from "@/hooks/dashboard/useDetailPageTab";
import {
  buildCourseRecommendationItems,
  buildEventRecommendationItems,
} from "@/lib/ai-recommendation-items";
import { roles } from "@/lib/domain-enums";
import { fetchEvents } from "@/services/events/events.service";

export default function EventsPage() {
  const { isAuthenticated, actorRole, navigateToLogin } = useAuth();
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
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
        const data = await fetchEvents();
        if (active) {
          setEvents(data);
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
      events.filter((event) => {
        const searchValue = search.trim().toLowerCase();
        const matchesSearch =
          !searchValue ||
          event.title?.toLowerCase().includes(searchValue) ||
          event.description?.toLowerCase().includes(searchValue) ||
          event.organization_name?.toLowerCase().includes(searchValue) ||
          event.category?.toLowerCase().includes(searchValue);
        const matchesStatus =
          statusFilter === "all" || event.status === statusFilter;
        const matchesMode =
          modeFilter === "all" ||
          (modeFilter === "online" ? event.is_online : !event.is_online);

        return matchesSearch && matchesStatus && matchesMode;
      }),
    [events, search, statusFilter, modeFilter],
  );
  const recommendationSections = useMemo(
    () => [
      {
        key: "events",
        title: "Recommended events",
        icon: Calendar,
        description: "Events aligned with your field, course, and activity signals.",
        items: buildEventRecommendationItems(recommendationFeed.event_recommendations),
      },
      {
        key: "courses",
        title: "Courses tied to those events",
        icon: Globe,
        description: "Structured follow-up learning connected to what you may attend.",
        items: buildCourseRecommendationItems(recommendationFeed.course_recommendations),
      },
    ],
    [recommendationFeed],
  );
  const eventTabs = useMemo(
    () => [
      {
        value: "browse",
        label: "Browse catalog",
        description: "Search, filter, and skim public events without extra recommendation panels.",
        icon: Calendar,
        badge: filtered.length,
      },
      {
        value: "personalized",
        label: "Personalized events",
        description: "Learner-specific event suggestions tied to your profile and activity signals.",
        icon: Sparkles,
      },
    ],
    [filtered.length],
  );
  const { activeTab, setActiveTab } = useDetailPageTab(
    eventTabs.map((tab) => tab.value),
    "browse",
  );

  return (
    <ModuleDetailShell
      eyebrow="Public events"
      title="Events"
      description="Browse the public event catalog first, then open personalized discovery only when you want learner-specific recommendations."
      value={activeTab}
      onValueChange={setActiveTab}
      tabs={eventTabs}
      actions={
        <div className="rounded-3xl border border-border/60 bg-white px-5 py-4 shadow-sm shadow-black/5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Live catalog
              </div>
              <div className="font-heading text-2xl font-bold text-foreground">
                {events.length}
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
              placeholder="Search by title, category, or organization"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All formats</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="in_person">In person</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No events found"
            description="Try another search or filter. Organizations can publish events here as they go live."
          />
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              <span>{filtered.length} events</span>
              <span className="text-border">|</span>
              <span className="inline-flex items-center gap-1">
                <Globe className="h-4 w-4" />
                Public discovery
              </span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="personalized" className="mt-0">
        {shouldShowPersonalizedFeed ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_320px]">
            <AIRecommendationDeck
              title="Events picked for your learning path"
              description="Your event feed now connects with profile interests, course activity, and other discovery signals across the platform."
              feature={recommendationFeature}
              feed={recommendationFeed}
              sections={recommendationSections}
              loading={recommendationsLoading}
              error={recommendationsError}
              emptyTitle="No personalized event suggestions yet"
              emptyDescription="Attend events, enroll in courses, and expand your profile signals so the platform can connect more relevant sessions for you."
            />
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-teal-700" />
                  Recommendation mode
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Personalized event suggestions live here so the main catalog can stay easy to scan while learner-specific recommendations get their own focused space.
                </p>
                <Button
                  variant="outline"
                  className="mt-5 w-full"
                  onClick={() => setActiveTab("browse")}
                >
                  Back to catalog
                </Button>
              </div>
            </div>
          </div>
        ) : !isAuthenticated ? (
          <div className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-sky-50 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Personalized event discovery
                </div>
                <h2 className="mt-3 font-heading text-2xl font-bold text-foreground">
                  Log in to unlock event recommendations
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Regular-user accounts can open a learner-specific event feed that uses profile, course, and participation signals.
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
              Personalized event recommendations are built for regular users
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Your current actor can still browse the public event catalog, but learner-specific event matching appears only for regular-user accounts because it depends on personal learning and participation signals.
            </p>
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => setActiveTab("browse")}
            >
              Return to event catalog
            </Button>
          </div>
        )}
      </TabsContent>
    </ModuleDetailShell>
  );
}
