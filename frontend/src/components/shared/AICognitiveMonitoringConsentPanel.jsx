import React, { useEffect, useMemo, useState } from "react";
import {
  CameraOff,
  Clock3,
  Eye,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiRolloutStates } from "@/lib/domain-enums";

function formatDateTime(value) {
  if (!value) {
    return "Not yet";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not yet" : date.toLocaleString();
}

function labelForRollout(rolloutState, isConsented, monitoringActive) {
  if (monitoringActive) {
    return "Monitoring active";
  }
  if (isConsented) {
    return rolloutState === aiRolloutStates.disabled
      ? "Consent saved"
      : "Consent ready";
  }
  if (rolloutState === aiRolloutStates.fallbackOnly) {
    return "Fallback-ready";
  }
  if (rolloutState === aiRolloutStates.ready) {
    return "Ready to opt in";
  }
  return "Disabled";
}

function toneForRollout(rolloutState, monitoringActive) {
  if (monitoringActive) {
    return "border-teal-200 bg-teal-50 text-teal-700";
  }
  if (rolloutState === aiRolloutStates.fallbackOnly) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (rolloutState === aiRolloutStates.ready) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function SignalRow({ signal, selected, onToggle }) {
  return (
    <label className="flex gap-3 rounded-2xl border border-border/60 bg-white px-4 py-4">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-teal-600"
        checked={selected}
        onChange={() => onToggle(signal.key)}
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-medium text-foreground">{signal.label}</div>
          {signal.sensitivity ? (
            <span className="rounded-full bg-secondary/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {signal.sensitivity}
            </span>
          ) : null}
          {signal.category ? (
            <span className="rounded-full bg-secondary/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {signal.category.replaceAll("_", " ")}
            </span>
          ) : null}
        </div>
        {signal.description ? (
          <p className="mt-2 text-sm text-muted-foreground">{signal.description}</p>
        ) : null}
      </div>
    </label>
  );
}

export default function AICognitiveMonitoringConsentPanel({
  title = "Adaptive monitoring controls",
  description = "",
  feature = null,
  consentView,
  loading = false,
  saving = false,
  error = "",
  sourceSurface = "",
  onSave,
  onRevoke,
}) {
  const { toast } = useToast();
  const [selectedSignals, setSelectedSignals] = useState([]);
  const [revokeReason, setRevokeReason] = useState("");
  const [localError, setLocalError] = useState("");

  const policy = consentView?.policy || {};
  const rolloutState = policy.rollout_state || feature?.rollout_state || aiRolloutStates.disabled;
  const allowedSignals = Array.isArray(policy.allowed_signals) ? policy.allowed_signals : [];
  const defaultSignalKeys = Array.isArray(policy.default_signal_keys)
    ? policy.default_signal_keys
    : [];
  const blockedSignalKeys = Array.isArray(policy.blocked_signal_keys)
    ? policy.blocked_signal_keys
    : [];
  const history = Array.isArray(consentView?.history) ? consentView.history : [];
  const activeConsent = consentView?.active_consent || null;

  useEffect(() => {
    if (activeConsent?.allowed_signals?.length) {
      setSelectedSignals(activeConsent.allowed_signals);
      return;
    }
    setSelectedSignals(defaultSignalKeys);
  }, [activeConsent, defaultSignalKeys]);

  const selectedSignalLabels = useMemo(() => {
    const lookup = new Map(allowedSignals.map((signal) => [signal.key, signal.label]));
    return selectedSignals.map((key) => lookup.get(key) || key);
  }, [allowedSignals, selectedSignals]);

  const handleToggleSignal = (signalKey) => {
    setLocalError("");
    setSelectedSignals((current) =>
      current.includes(signalKey)
        ? current.filter((item) => item !== signalKey)
        : [...current, signalKey],
    );
  };

  const handleSave = async () => {
    if (!selectedSignals.length) {
      setLocalError("Choose at least one permitted signal before saving consent.");
      return;
    }

    setLocalError("");
    try {
      await onSave?.({
        allowedSignals: selectedSignals,
        sourceSurface,
      });
      toast({
        title: activeConsent ? "Monitoring choices updated" : "Monitoring consent saved",
        description:
          rolloutState === aiRolloutStates.disabled
            ? "Your preferences are saved, but adaptive monitoring stays inactive until rollout is enabled."
            : "Your monitoring preferences are now saved for this workspace.",
      });
    } catch (saveError) {
      toast({
        title: "Unable to save monitoring settings",
        description: saveError.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRevoke = async () => {
    setLocalError("");
    try {
      await onRevoke?.(revokeReason);
      setRevokeReason("");
      toast({
        title: "Monitoring consent revoked",
        description: "Adaptive monitoring is now turned off for your account.",
      });
    } catch (revokeError) {
      toast({
        title: "Unable to revoke monitoring consent",
        description: revokeError.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
        <div className="h-6 w-64 animate-pulse rounded-full bg-secondary/40" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-secondary/30" />
        <div className="mt-2 h-4 w-4/5 animate-pulse rounded-full bg-secondary/20" />
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="h-24 animate-pulse rounded-2xl bg-secondary/20" />
          <div className="h-24 animate-pulse rounded-2xl bg-secondary/20" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {description ||
              "SkillVerse only uses explicitly disclosed signals for future focus-drift and mood-aware support. Camera analysis is not assumed and is off by default."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${toneForRollout(
              rolloutState,
              Boolean(consentView?.monitoring_active),
            )}`}
          >
            {labelForRollout(
              rolloutState,
              Boolean(consentView?.is_consented),
              Boolean(consentView?.monitoring_active),
            )}
          </span>
          <span className="inline-flex items-center rounded-full border border-border/60 bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CameraOff className="mr-1.5 h-3.5 w-3.5" />
            No camera required
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-emerald-50 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-teal-700" />
              Signal disclosure
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Policy version
                </div>
                <div className="mt-1 font-medium text-foreground">
                  {policy.policy_version || "Not set"}
                </div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Retention window
                </div>
                <div className="mt-1 font-medium text-foreground">
                  {policy.retention_days ? `${policy.retention_days} days` : "Configured by admin"}
                </div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Saved signals
                </div>
                <div className="mt-1 font-medium text-foreground">
                  {selectedSignals.length}
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {policy.storage_policy ||
                "Only minimal monitoring preferences and derived status are stored."}
            </p>
            {blockedSignalKeys.length ? (
              <div className="mt-3 text-sm text-muted-foreground">
                Never used here:{" "}
                <span className="font-medium text-foreground">
                  {blockedSignalKeys.join(", ")}
                </span>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/10 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Eye className="h-4 w-4 text-sky-700" />
              Choose permitted signals
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Turn on only the signals you are comfortable using for adaptive support. You can revise or revoke this later.
            </p>
            <div className="mt-4 space-y-3">
              {allowedSignals.map((signal) => (
                <SignalRow
                  key={signal.key}
                  signal={signal}
                  selected={selectedSignals.includes(signal.key)}
                  onToggle={handleToggleSignal}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-white p-5">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-amber-600" />
              <h3 className="font-medium text-foreground">Current status</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <StatusLine
                label="Consent state"
                value={consentView?.is_consented ? "Granted" : "Not granted"}
              />
              <StatusLine
                label="Adaptive behavior"
                value={consentView?.monitoring_active ? "Active" : "Inactive"}
              />
              <StatusLine
                label="Last granted"
                value={formatDateTime(activeConsent?.granted_at)}
              />
              <StatusLine
                label="Source surface"
                value={activeConsent?.source_surface || sourceSurface || "Not recorded yet"}
              />
            </div>

            {selectedSignalLabels.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedSignalLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-secondary/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {activeConsent ? "Update consent" : "Enable adaptive monitoring"}
              </Button>
              {activeConsent ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRevoke}
                  disabled={saving}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Revoke
                </Button>
              ) : null}
            </div>

            {activeConsent ? (
              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Optional revoke note
                </div>
                <Textarea
                  rows={3}
                  value={revokeReason}
                  onChange={(event) => setRevokeReason(event.target.value)}
                  placeholder="Why are you pausing or revoking adaptive monitoring?"
                />
              </div>
            ) : null}

            {localError || error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {localError || error}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border/60 bg-white p-5">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-slate-700" />
              <h3 className="font-medium text-foreground">Consent history</h3>
            </div>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No consent history yet. Your first saved choice will appear here.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {history.slice(0, 4).map((record) => (
                  <div
                    key={record.id}
                    className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium capitalize text-foreground">
                        {record.status.replaceAll("_", " ")}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(record.granted_at)}
                      </span>
                    </div>
                    {record.allowed_signals?.length ? (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {record.allowed_signals.join(", ")}
                      </div>
                    ) : null}
                    {record.revoked_reason ? (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Revoke note: {record.revoked_reason}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 py-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
