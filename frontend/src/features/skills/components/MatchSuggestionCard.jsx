import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  BookMarked,
  CircleHelp,
  Lightbulb,
  MessageCircle,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";

const suggestionTypeCopy = {
  direct_swap: {
    label: "Direct Swap",
    icon: ArrowLeftRight,
    tone: "bg-emerald-50 text-emerald-700",
  },
  partial_overlap: {
    label: "Partial Overlap",
    icon: Lightbulb,
    tone: "bg-amber-50 text-amber-700",
  },
  field_relevant: {
    label: "Field Relevant",
    icon: Sparkles,
    tone: "bg-blue-50 text-blue-700",
  },
};

function formatExperienceLevel(value) {
  return value ? value.replaceAll("_", " ") : "Not specified";
}

function renderTagList(items, emptyLabel) {
  if (!items?.length) {
    return <span className="text-xs text-muted-foreground">{emptyLabel}</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={`${item.slug}-${item.id}`}
          className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground"
        >
          {item.name}
        </span>
      ))}
    </div>
  );
}

export default function MatchSuggestionCard({ match, searchQuery = "" }) {
  const [message, setMessage] = useState("");
  const config = suggestionTypeCopy[match.suggestion_type] || {
    label: "Suggested Match",
    icon: CircleHelp,
    tone: "bg-slate-100 text-slate-700",
  };
  const Icon = config.icon;

  return (
    <article className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50">
            <User className="h-6 w-6 text-teal-600" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-lg font-semibold text-foreground">
                {match.target_user?.full_name || "Suggested user"}
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.tone}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {config.label}
              </span>
              <StatusBadge status="free" label={`Score ${match.score}`} />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatExperienceLevel(match.target_user?.experience_level)}
            </p>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {match.target_user?.bio || "This user has not added a bio yet."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/messages">
            <Button variant="outline" size="sm" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat
            </Button>
          </Link>
          {match.existingRequest ? (
            <Button size="sm" variant="outline" className="gap-2" disabled>
              <ArrowLeftRight className="h-4 w-4" />
              {match.existingRequest.status === "pending"
                ? "Request Pending"
                : match.existingRequest.status === "accepted"
                  ? "Swap Accepted"
                  : "Request Sent"}
            </Button>
          ) : (
            <Button
              size="sm"
              className="gap-2 bg-teal-600 hover:bg-teal-700"
              disabled={match.sending}
              onClick={() => match.onRequest(match, message)}
            >
              <ArrowLeftRight className="h-4 w-4" />
              {match.sending ? "Sending..." : "Request Swap"}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-5 rounded-2xl bg-slate-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <BookMarked className="h-4 w-4 text-teal-700" />
          Why this match appeared
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{match.rationale}</p>
        {searchQuery ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Filtered by: <span className="font-medium text-foreground">{searchQuery}</span>
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border/60 p-4">
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            You can learn from them
          </h4>
          {renderTagList(
            match.can_learn_from_match,
            "No direct learnable skill overlap in this suggestion.",
          )}
        </section>
        <section className="rounded-2xl border border-border/60 p-4">
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            You can teach them
          </h4>
          {renderTagList(
            match.can_teach_match,
            "No direct teachable swap return captured here.",
          )}
        </section>
        <section className="rounded-2xl border border-border/60 p-4">
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            Shared fields
          </h4>
          {renderTagList(match.shared_fields, "No shared field signals yet.")}
        </section>
        <section className="rounded-2xl border border-border/60 p-4">
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            Their offered skills
          </h4>
          {renderTagList(match.target_offered_skills, "No offered skills listed yet.")}
        </section>
      </div>

      {match.target_user?.interests_summary ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border p-4">
          <h4 className="mb-2 text-sm font-semibold text-foreground">
            Shared context
          </h4>
          <p className="text-sm leading-6 text-muted-foreground">
            {match.target_user.interests_summary}
          </p>
        </div>
      ) : null}

      {!match.existingRequest ? (
        <div className="mt-4 rounded-2xl border border-border/60 p-4">
          <label className="mb-2 block text-sm font-semibold text-foreground">
            Optional opening message
          </label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Example: I can help with React if you'd like to exchange for public speaking practice."
            className="min-h-[92px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          />
        </div>
      ) : null}

      <p className="mt-4 text-xs text-muted-foreground">
        Private regular-user profiles stay non-public in V1. Use this flow to start a swap request while keeping discovery focused on skill compatibility.
      </p>
    </article>
  );
}
