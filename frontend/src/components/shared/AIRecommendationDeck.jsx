import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, Sparkles, Wand2 } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

function getModeConfig(feature, feed) {
  if (feed.used_ai) {
    return {
      label: "AI-assisted",
      hint: "Suggestions are enhanced with AI rationale on top of structured platform signals.",
      tone: "teal",
      Icon: Wand2,
    };
  }

  if (feed.fallback_active || feature?.rollout_state === "fallback_only") {
    return {
      label: "Signal-based fallback",
      hint:
        feature?.fallback_behavior ||
        "Recommendations stay available through structured signals when AI is unavailable.",
      tone: "amber",
      Icon: Sparkles,
    };
  }

  return {
    label: "Structured recommendations",
    hint:
      feature?.fallback_behavior ||
      "Recommendations are grounded in your profile, activity, and connected platform signals.",
    tone: "slate",
    Icon: Sparkles,
  };
}

const toneClassNames = {
  teal: "border-teal-200 bg-teal-50 text-teal-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
};

function RecommendationItem({ item }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-heading text-base font-semibold text-foreground">
            {item.title}
          </h4>
          {item.subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {(item.badges || []).filter(Boolean).slice(0, 3).map((badge) => (
            <span
              key={`${item.key}-${badge}`}
              className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-foreground">{item.rationale}</p>

      {(item.meta || []).filter(Boolean).length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {(item.meta || []).filter(Boolean).slice(0, 4).map((value) => (
            <span key={`${item.key}-meta-${value}`}>{value}</span>
          ))}
        </div>
      ) : null}

      {item.to ? (
        <div className="mt-4">
          <Link
            to={item.to}
            className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            {item.actionLabel || "Open"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default function AIRecommendationDeck({
  title,
  description,
  feature = null,
  feed,
  sections = [],
  loading = false,
  error = "",
  emptyTitle = "No recommendations yet",
  emptyDescription = "Keep building your profile and activity signals to unlock stronger recommendations.",
  action = null,
  compact = false,
}) {
  const populatedSections = sections
    .map((section) => ({
      ...section,
      items: Array.isArray(section.items) ? section.items.filter(Boolean) : [],
    }))
    .filter((section) => section.items.length > 0);

  const modeConfig = getModeConfig(feature, feed);
  const ModeIcon = modeConfig.Icon;

  return (
    <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
          </div>
          {description ? (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              toneClassNames[modeConfig.tone] || toneClassNames.slate
            }`}
          >
            <ModeIcon className="h-3.5 w-3.5" />
            {modeConfig.label}
          </div>
          <p className="max-w-sm text-xs text-muted-foreground sm:text-right">
            {modeConfig.hint}
          </p>
        </div>
      </div>

      {action ? <div className="mt-4">{action}</div> : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: compact ? 2 : 3 }).map((_, index) => (
            <div
              key={`ai-rec-skeleton-${index}`}
              className="h-36 animate-pulse rounded-2xl border border-border/60 bg-secondary/20"
            />
          ))}
        </div>
      ) : populatedSections.length === 0 ? (
        <div className="mt-2">
          <EmptyState
            icon={Sparkles}
            title={emptyTitle}
            description={emptyDescription}
          />
        </div>
      ) : (
        <div className={`mt-6 grid gap-4 ${compact ? "xl:grid-cols-2" : "xl:grid-cols-3"}`}>
          {populatedSections.map((section) => {
            const SectionIcon = section.icon || Sparkles;
            return (
              <div
                key={section.key}
                className="rounded-3xl border border-border/60 bg-white p-5"
              >
                <div className="flex items-center gap-2">
                  <SectionIcon className="h-4.5 w-4.5 text-teal-600" />
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    {section.title}
                  </h3>
                </div>
                {section.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
                ) : null}

                <div className="mt-4 space-y-3">
                  {section.items.map((item) => (
                    <RecommendationItem key={item.key} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
