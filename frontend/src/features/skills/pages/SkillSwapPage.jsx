import React from "react";
import { useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  ArrowLeftRight,
  Calendar,
  Filter,
  Heart,
  Search,
  Sparkles,
} from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import MatchSuggestionCard from "@/features/skills/components/MatchSuggestionCard";
import SwapRequestCard from "@/features/skills/components/SwapRequestCard";
import { useSkillSwapHub } from "@/hooks/skills/useSkillSwapHub";
import { ensureSwapConversation } from "@/services/messages/swap-messaging.service";

export default function SkillSwap() {
  const location = useLocation();
  const initialSearch = new URLSearchParams(location.search).get("skill") || "";
  const highlightedRequestId = new URLSearchParams(location.search).get("request") || "";
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

  const openDetails = (request) => {
    window.location.href = `/skill-swap?request=${request.id}`;
  };

  const openMessages = async (request) => {
    const conversation = await ensureSwapConversation({
      counterparty: request.counterparty,
      exchangeSummary: request.exchange_summary,
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
        <div className="space-y-8">
          {requestGroups.incoming.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge status="pending" label="Needs response" />
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  Incoming requests
                </h2>
              </div>
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
            </section>
          ) : null}

          {requestGroups.active.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge status="accepted" label="Active" />
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  Active swaps
                </h2>
              </div>
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
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-4">
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
          </section>

          {(requestGroups.outgoing.length > 0 || requestGroups.closed.length > 0) ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge status="closed" label="History" />
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  Request history
                </h2>
              </div>
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
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
