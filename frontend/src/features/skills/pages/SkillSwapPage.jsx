import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeftRight,
  BookOpen,
  Calendar,
  Filter,
  Heart,
  Lightbulb,
  Search,
  Sparkles,
} from "lucide-react";
import AIRecommendationDeck from "@/components/shared/AIRecommendationDeck";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useAIRecommendationFeed } from "@/hooks/ai/useAIRecommendationFeed";
import {
  buildCourseRecommendationItems,
  buildPeerRecommendationItems,
  buildSkillRecommendationItems,
} from "@/lib/ai-recommendation-items";
import MatchSuggestionCard from "@/features/skills/components/MatchSuggestionCard";
import SwapRequestCard from "@/features/skills/components/SwapRequestCard";
import { useSkillSwapHub } from "@/hooks/skills/useSkillSwapHub";
import { ensureSwapConversation } from "@/services/messages/swap-messaging.service";

export default function SkillSwap() {
  const location = useLocation();
  const initialSearch = new URLSearchParams(location.search).get("skill") || "";
  const highlightedRequestId = new URLSearchParams(location.search).get("request") || "";
  const [activeTab, setActiveTab] = useState("incoming");
  const {
    filteredMatches,
    hasMatches,
    hasRequests,
    requestMap,
    requestGroups,
    search,
    setSearch,
    loading,
    actingId,
    error,
    refresh,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
  } = useSkillSwapHub(initialSearch);
  const {
    feature: recommendationFeature,
    feed: recommendationFeed,
    loading: recommendationsLoading,
    error: recommendationsError,
  } = useAIRecommendationFeed({
    limitPerType: 2,
  });

  const defaultTab = useMemo(() => {
    if (!highlightedRequestId) {
      return "incoming";
    }
    const allRequests = [
      ...requestGroups.incoming,
      ...requestGroups.active,
      ...requestGroups.outgoing,
      ...requestGroups.closed,
    ];
    const highlightedRequest = allRequests.find(
      (request) => String(request.id) === highlightedRequestId,
    );
    if (!highlightedRequest) {
      return "incoming";
    }
    if (highlightedRequest.status === "accepted") {
      return "active";
    }
    if (highlightedRequest.my_role === "recipient" && highlightedRequest.status === "pending") {
      return "incoming";
    }
    return "history";
  }, [highlightedRequestId, requestGroups]);
  const recommendationSections = useMemo(
    () => [
      {
        key: "peers",
        title: "Peer matches",
        icon: ArrowLeftRight,
        description: "Suggested exchange partners grounded in your current profile.",
        items: buildPeerRecommendationItems(recommendationFeed.peer_matches),
      },
      {
        key: "skills",
        title: "Skills to unlock better swaps",
        icon: Lightbulb,
        description: "Strengthen your portfolio with skills that expand reciprocal options.",
        items: buildSkillRecommendationItems(recommendationFeed.skill_recommendations),
      },
      {
        key: "courses",
        title: "Courses that support your swaps",
        icon: BookOpen,
        description: "Structured learning paths tied to the same signals behind your matches.",
        items: buildCourseRecommendationItems(recommendationFeed.course_recommendations),
      },
    ],
    [recommendationFeed],
  );

  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const openDetails = (request) => {
    window.location.href = `/skill-swap?request=${request.id}`;
  };

  const openMessages = async (request) => {
    const conversation = await ensureSwapConversation({
      swapRequestId: request.id,
    });
    window.location.href = `/messages?conversation=${encodeURIComponent(conversation.id)}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-heading font-bold text-3xl text-foreground">
            Skill Swap
          </h1>
          <StatusBadge status="free" label="Always Free" />
        </div>
        <p className="text-muted-foreground">
          Find reciprocal peer matches based on what you want to learn, what you can teach, and the field signals already in your profile.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-border/50 p-6 mb-8">
        <h2 className="font-heading font-semibold text-base mb-4">
          How Skill Swap Works
        </h2>
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            {
              icon: Heart,
              step: "1",
              title: "Find a Match",
              desc: "See people whose skills line up with your learning goals",
            },
            {
              icon: Sparkles,
              step: "2",
              title: "Review the Why",
              desc: "Understand the overlap before you commit to a swap",
            },
            {
              icon: Calendar,
              step: "3",
              title: "Schedule",
              desc: "Coordinate accepted swaps and plan a learning session",
            },
            {
              icon: ArrowLeftRight,
              step: "4",
              title: "Swap & Learn",
              desc: "Meet, teach each other, and grow together",
            },
          ].map((stepCard) => {
            const Icon = stepCard.icon;
            return (
              <div key={stepCard.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 font-semibold text-sm">
                  {stepCard.step}
                </div>
                <h3 className="font-heading font-semibold text-sm mb-1">
                  {stepCard.title}
                </h3>
                <p className="text-xs text-muted-foreground">{stepCard.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by skill, field, or person..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm text-muted-foreground">
          <Filter className="h-4 w-4 text-amber-600" />
          Deterministic match logic, rationale included
        </div>
      </div>

      {!loading && (
        <div className="mb-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-white p-5">
            <p className="text-sm font-medium text-foreground">Incoming requests</p>
            <p className="mt-1 text-3xl font-heading font-bold text-foreground">
              {requestGroups.incoming.length}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Requests waiting for your response.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white p-5">
            <p className="text-sm font-medium text-foreground">Active swaps</p>
            <p className="mt-1 text-3xl font-heading font-bold text-foreground">
              {requestGroups.active.length}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Accepted swaps ready for coordination.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white p-5">
            <p className="text-sm font-medium text-foreground">Outgoing requests</p>
            <p className="mt-1 text-3xl font-heading font-bold text-foreground">
              {requestGroups.outgoing.length}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Pending requests you have already sent.
            </p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <AIRecommendationDeck
          title="Swap-adjacent recommendations"
          description="Use these signals to find better partners, fill skill gaps, and move from discovery into a stronger exchange."
          feature={recommendationFeature}
          feed={recommendationFeed}
          sections={recommendationSections}
          loading={recommendationsLoading}
          error={recommendationsError}
          emptyTitle="Build stronger swap signals"
          emptyDescription="Add more offered and requested skills, then keep using swaps and courses so the recommendation layer can sharpen your next best matches."
          compact
        />
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="We couldn't load your matches"
          description={error}
          actionLabel="Refresh"
          onAction={refresh}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl bg-white p-2">
            <TabsTrigger value="incoming" className="rounded-xl px-4 py-2">
              Incoming
              {requestGroups.incoming.length ? ` (${requestGroups.incoming.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-xl px-4 py-2">
              Active swaps
              {requestGroups.active.length ? ` (${requestGroups.active.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="suggested" className="rounded-xl px-4 py-2">
              Suggested partners
              {filteredMatches.length ? ` (${filteredMatches.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl px-4 py-2">
              Request history
              {requestGroups.outgoing.length + requestGroups.closed.length
                ? ` (${requestGroups.outgoing.length + requestGroups.closed.length})`
                : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status="pending" label="Needs response" />
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Incoming requests
              </h2>
            </div>
            {requestGroups.incoming.length > 0 ? (
              <div className="space-y-4">
                {requestGroups.incoming.map((request) => (
                  <SwapRequestCard
                    key={request.id}
                    request={request}
                    acting={actingId === request.id}
                    highlighted={String(request.id) === highlightedRequestId}
                    onAccept={acceptRequest}
                    onReject={rejectRequest}
                    onCancel={cancelRequest}
                    onOpenDetails={openDetails}
                    onOpenMessage={openMessages}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ArrowLeftRight}
                title="No incoming requests"
                description="New swap requests that need your response will appear here."
              />
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status="accepted" label="Active" />
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Active swaps
              </h2>
            </div>
            {requestGroups.active.length > 0 ? (
              <div className="space-y-4">
                {requestGroups.active.map((request) => (
                  <SwapRequestCard
                    key={request.id}
                    request={request}
                    acting={actingId === request.id}
                    highlighted={String(request.id) === highlightedRequestId}
                    onAccept={acceptRequest}
                    onReject={rejectRequest}
                    onCancel={cancelRequest}
                    onOpenDetails={openDetails}
                    onOpenMessage={openMessages}
                    compact
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ArrowLeftRight}
                title="No active swaps"
                description="Accepted swaps will show up here once both sides agree to learn together."
              />
            )}
          </TabsContent>

          <TabsContent value="suggested" className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status="free" label="Discovery" />
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Suggested swap partners
              </h2>
            </div>
            {filteredMatches.length > 0 ? (
              <div className="space-y-5">
                {filteredMatches.map((match) => (
                  <MatchSuggestionCard
                    key={match.id}
                    match={{
                      ...match,
                      existingRequest: requestMap.get(match.target_user?.id) || null,
                      sending: actingId === `match-${match.id}`,
                      onRequest: sendRequest,
                    }}
                    searchQuery={search}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ArrowLeftRight}
                title={hasMatches ? "No matches fit this search" : "No match suggestions yet"}
                description={
                  hasMatches
                    ? "Try a different skill, field, or person name to surface more peer matches."
                    : hasRequests
                      ? "You already have swap activity in motion. Add more offered and requested skills to unlock fresh recommendations."
                      : "Add at least one offered skill and one requested skill to improve reciprocal match quality. Shared fields also help the system surface more relevant people."
                }
                actionLabel="Open Skill Portfolio"
                onAction={() => {
                  window.location.href = "/skill-portfolio";
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status="closed" label="History" />
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Request history
              </h2>
            </div>
            {requestGroups.outgoing.length > 0 || requestGroups.closed.length > 0 ? (
              <div className="space-y-4">
                {[...requestGroups.outgoing, ...requestGroups.closed].map((request) => (
                  <SwapRequestCard
                    key={request.id}
                    request={request}
                    acting={actingId === request.id}
                    highlighted={String(request.id) === highlightedRequestId}
                    onAccept={acceptRequest}
                    onReject={rejectRequest}
                    onCancel={cancelRequest}
                    onOpenDetails={openDetails}
                    onOpenMessage={openMessages}
                    compact
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ArrowLeftRight}
                title="No request history yet"
                description="Outgoing requests and closed swaps will show up here once you start using the swap flow."
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
