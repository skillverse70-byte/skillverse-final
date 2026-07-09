import React from "react";
import { BrainCircuit, CameraOff, Eye, ShieldCheck, Users } from "lucide-react";
import { aiRolloutStates } from "@/lib/domain-enums";

function formatDateTime(value) {
  if (!value) {
    return "Not yet";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not yet" : date.toLocaleString();
}

function rolloutLabel(value) {
  if (value === aiRolloutStates.ready) {
    return "Ready";
  }
  if (value === aiRolloutStates.fallbackOnly) {
    return "Fallback only";
  }
  return "Disabled";
}

function SummaryMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 font-heading text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

export default function AdminAICognitiveMonitoringPanel({
  feature = null,
  overview,
  loading = false,
  error = "",
}) {
  const policy = overview?.policy || {};
  const summary = overview?.summary || {};
  const signalCounts = Array.isArray(overview?.signal_counts) ? overview.signal_counts : [];
  const recentRecords = Array.isArray(overview?.recent_records) ? overview.recent_records : [];
  const rolloutState = policy.rollout_state || feature?.rollout_state || aiRolloutStates.disabled;

  if (loading) {
    return (
      <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
        <div className="h-6 w-64 animate-pulse rounded-full bg-secondary/40" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-secondary/30" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`admin-monitoring-skeleton-${index}`}
              className="h-24 animate-pulse rounded-2xl bg-secondary/20"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-teal-600" />
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Adaptive monitoring governance
            </h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Admin visibility for opt-in adaptive monitoring stays limited to policy, consent state, and safe signal coverage. Camera assumptions remain off unless policy changes explicitly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-border/60 bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {rolloutLabel(rolloutState)}
          </span>
          <span className="inline-flex items-center rounded-full border border-border/60 bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CameraOff className="mr-1.5 h-3.5 w-3.5" />
            Camera off by default
          </span>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          icon={Users}
          label="Active consents"
          value={summary.active_consents ?? 0}
        />
        <SummaryMetric
          icon={ShieldCheck}
          label="Distinct learners"
          value={summary.distinct_consented_users ?? 0}
        />
        <SummaryMetric
          icon={Eye}
          label="Currently active"
          value={summary.currently_monitored_users ?? 0}
        />
        <SummaryMetric
          icon={CameraOff}
          label="Revoked"
          value={summary.revoked_consents ?? 0}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-emerald-50 p-5">
            <div className="text-sm font-medium text-foreground">Policy snapshot</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <PolicyLine label="Policy version" value={policy.policy_version || "Not set"} />
              <PolicyLine
                label="Retention"
                value={policy.retention_days ? `${policy.retention_days} days` : "Not set"}
              />
              <PolicyLine
                label="Consent required"
                value={policy.consent_required ? "Yes" : "No"}
              />
              <PolicyLine
                label="Biometric inference"
                value={policy.biometric_inference_allowed ? "Allowed" : "Blocked"}
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {policy.storage_policy ||
                "Consent settings and derived summaries are retained without raw biometric capture."}
            </p>
            {Array.isArray(policy.blocked_signal_keys) && policy.blocked_signal_keys.length ? (
              <div className="mt-3 text-sm text-muted-foreground">
                Blocked signals:{" "}
                <span className="font-medium text-foreground">
                  {policy.blocked_signal_keys.join(", ")}
                </span>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border/60 bg-white p-5">
            <div className="font-medium text-foreground">Signal adoption</div>
            {signalCounts.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Signal counts will appear once learners opt in.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {signalCounts.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-foreground">{item.label}</div>
                      <div className="font-heading text-xl font-bold text-foreground">
                        {item.count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-white p-5">
          <div className="font-medium text-foreground">Recent consent records</div>
          <p className="mt-2 text-sm text-muted-foreground">
            This stays limited to governance-safe metadata so admins can audit consent flow without reading private learner content.
          </p>
          {recentRecords.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No learner consent records have been saved yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {recentRecords.map((record) => (
                <div
                  key={record.id}
                  className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-foreground">
                        {record.user?.full_name || record.user?.email || "Learner"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {record.user?.email || "No email available"}
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {record.status}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <div>Granted: {formatDateTime(record.granted_at)}</div>
                    <div>Source: {record.source_surface || "Not recorded"}</div>
                  </div>
                  {record.allowed_signals?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {record.allowed_signals.map((signalKey) => (
                        <span
                          key={`${record.id}-${signalKey}`}
                          className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          {signalKey}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {record.revoked_reason ? (
                    <div className="mt-3 text-sm text-muted-foreground">
                      Revoke note: {record.revoked_reason}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PolicyLine({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium text-foreground">{value}</div>
    </div>
  );
}
