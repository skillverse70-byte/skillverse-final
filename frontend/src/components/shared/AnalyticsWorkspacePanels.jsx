import React from "react";
import { ArrowRight, BrainCircuit, MapPinned, Server, TrendingUp } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "0";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return String(value);
}

function severityStatus(severity) {
  return {
    critical: "restricted",
    warning: "pending",
    info: "active",
  }[severity] || "reviewing";
}

function rolloutStatus(state) {
  return {
    ready: "ready",
    fallback_only: "pending",
    disabled: "inactive",
  }[state] || "reviewing";
}

function formatSurfaceLabel(value) {
  return String(value || "")
    .split("/")
    .filter(Boolean)
    .join(" / ") || "General";
}

export function AnalyticsMetricGrid({ items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {item.label}
          </div>
          <div className="mt-2 font-heading text-3xl font-bold text-foreground">
            {formatValue(item.value)}
          </div>
          {item.helper ? (
            <div className="mt-2 text-sm text-muted-foreground">{item.helper}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function AnalyticsSectionTabs({
  title,
  description,
  value,
  onValueChange,
  sections = [],
  children,
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="space-y-6">
      <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>

        <TabsList className="mt-5 flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          {sections.map((section) => (
            <TabsTrigger
              key={section.value}
              value={section.value}
              className="h-auto min-w-0 flex-1 items-start justify-start whitespace-normal rounded-2xl border border-border/60 bg-secondary/10 px-4 py-3 text-left leading-tight data-[state=active]:border-teal-200 data-[state=active]:bg-teal-50 data-[state=active]:text-foreground data-[state=active]:shadow-none sm:min-w-[180px]"
            >
              <div className="min-w-0 text-left">
                <div className="break-words text-sm font-semibold">{section.label}</div>
                {section.description ? (
                  <div className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                    {section.description}
                  </div>
                ) : null}
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
      </section>

      {children}
    </Tabs>
  );
}

export function AnalyticsCountListCard({
  icon: Icon = TrendingUp,
  title,
  description,
  items = [],
  emptyText = "No analytics records yet.",
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-teal-600" />
        <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={`${title}-${item.key}-${item.label}`}
              className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{item.label || item.key}</div>
                  {item.key && item.key !== item.label ? (
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {item.key}
                    </div>
                  ) : null}
                </div>
                <div className="font-heading text-2xl font-bold text-foreground">
                  {formatValue(item.count)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function AnalyticsInsightPanel({
  insights = [],
  onOpenRoute,
  title = "Priority insights",
  description = "Use these cues to jump into the most important operational work.",
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
      <div className="flex items-center gap-2">
        <BrainCircuit className="h-5 w-5 text-teal-600" />
        <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>

      {insights.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Insights will appear here when platform activity needs attention.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.key}
              className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={severityStatus(insight.severity)}
                      label={String(insight.severity || "info").toUpperCase()}
                    />
                  </div>
                  <div className="mt-3 font-medium text-foreground">{insight.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {insight.description}
                  </div>
                </div>
                {insight.route ? (
                  <button
                    type="button"
                    onClick={() => onOpenRoute?.(insight.route)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm font-medium text-teal-700"
                  >
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function AnalyticsHeatmapPanel({
  items = [],
  title = "Social impact heatmap",
  description = "Geographic activity stays readable as a compact list until a map surface is needed.",
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
      <div className="flex items-center gap-2">
        <MapPinned className="h-5 w-5 text-teal-600" />
        <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Heatmap records will appear once activity spreads across locations.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={`${item.location}-${item.source_type}`}
              className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">{item.location}</div>
                  <div className="text-sm text-muted-foreground">{item.source_type}</div>
                </div>
                <div className="font-heading text-2xl font-bold text-foreground">
                  {formatValue(item.count)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function AnalyticsSystemHealthPanel({
  health = {},
  title = "System health",
  description = "Provider readiness, feature rollouts, and recent signal volume stay visible for operators.",
}) {
  const provider = health.provider || {};
  const rollouts = Array.isArray(health.feature_rollouts) ? health.feature_rollouts : [];

  return (
    <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
      <div className="flex items-center gap-2">
        <Server className="h-5 w-5 text-teal-600" />
        <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-border/60 bg-secondary/10 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={provider.healthy ? "ready" : provider.configured ? "pending" : "inactive"}
              label={provider.healthy ? "Healthy" : provider.configured ? "Configured" : "Not configured"}
            />
            {provider.provider ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {provider.provider}
              </span>
            ) : null}
          </div>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Model:</span>{" "}
              {provider.default_model || "Not set"}
            </div>
            <div>
              <span className="font-medium text-foreground">Base URL:</span>{" "}
              {provider.base_url || "Not set"}
            </div>
            <div>
              <span className="font-medium text-foreground">Timeout:</span>{" "}
              {provider.timeout_seconds ? `${provider.timeout_seconds}s` : "Not set"}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniHealthMetric label="Ready features" value={health.ready_features} />
            <MiniHealthMetric label="Fallback only" value={health.fallback_only_features} />
            <MiniHealthMetric label="Disabled" value={health.disabled_features} />
            <MiniHealthMetric
              label="Recent suggestions"
              value={health.recent_match_suggestions_7d}
            />
            <MiniHealthMetric label="Recent check-ins" value={health.recent_checkins_7d} />
            <MiniHealthMetric label="Recent enrollments" value={health.recent_enrollments_7d} />
            <MiniHealthMetric label="Recent RSVPs" value={health.recent_rsvps_7d} />
            <MiniHealthMetric
              label="Recent applications"
              value={health.recent_applications_7d}
            />
          </div>
        </div>

        <div className="space-y-3">
          {rollouts.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-4 text-sm text-muted-foreground">
              Feature rollout states will appear here once AI surfaces are configured.
            </div>
          ) : (
            rollouts.map((rollout) => (
              <div
                key={rollout.key}
                className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-foreground">{rollout.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {rollout.actor_roles?.join(", ") || "General access"}
                    </div>
                  </div>
                  <StatusBadge
                    status={rolloutStatus(rollout.rollout_state)}
                    label={String(rollout.rollout_state || "disabled").replaceAll("_", " ")}
                  />
                </div>
                {rollout.surfaces?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rollout.surfaces.map((surface) => (
                      <span
                        key={`${rollout.key}-${surface}`}
                        className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {formatSurfaceLabel(surface)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function MiniHealthMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-heading text-xl font-bold text-foreground">
        {formatValue(value)}
      </div>
    </div>
  );
}
