import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Gauge,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const moodOptions = [
  { value: "energized", label: "Energized" },
  { value: "steady", label: "Steady" },
  { value: "tired", label: "Tired" },
  { value: "distracted", label: "Distracted" },
  { value: "stuck", label: "Stuck" },
  { value: "overwhelmed", label: "Overwhelmed" },
];

const driftTone = {
  inactive: "border-slate-200 bg-slate-100 text-slate-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-red-200 bg-red-50 text-red-700",
};

function prettyLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function MetricDial({ label, value, tone = "text-foreground" }) {
  return (
    <div className="rounded-lg border border-border/60 bg-white px-4 py-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 font-heading text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function RangeControl({ label, value, onChange }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{value}/5</span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-teal-600"
      />
    </label>
  );
}

export default function AIAdaptiveMonitoringPanel({
  title = "Adaptive focus",
  description = "",
  adaptiveState,
  loading = false,
  error = "",
  submitting = false,
  onSubmitCheckIn,
  manageHref = "/profile?tab=adaptive",
  compact = false,
  allowCheckIn = true,
}) {
  const { toast } = useToast();
  const [moodLabel, setMoodLabel] = useState("steady");
  const [focusLevel, setFocusLevel] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [stressLevel, setStressLevel] = useState(2);
  const [reflectionNote, setReflectionNote] = useState("");

  if (loading) {
    return (
      <section className="rounded-lg border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
        <div className="h-5 w-48 animate-pulse rounded-full bg-secondary/40" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-secondary/30" />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="h-20 animate-pulse rounded-lg bg-secondary/20" />
          <div className="h-20 animate-pulse rounded-lg bg-secondary/20" />
          <div className="h-20 animate-pulse rounded-lg bg-secondary/20" />
        </div>
      </section>
    );
  }

  const safeState = adaptiveState || {};
  const focusDrift = safeState.focus_drift || {};
  const moodMirror = safeState.mood_mirror || {};
  const responses = Array.isArray(safeState.adaptive_responses)
    ? safeState.adaptive_responses
    : [];
  const signals = Array.isArray(safeState.signals) ? safeState.signals : [];
  const monitoringActive = Boolean(safeState.monitoring_active);
  const driftLevel = focusDrift.level || "inactive";
  const score = Number(focusDrift.score || 0);

  const handleSubmit = async () => {
    try {
      await onSubmitCheckIn?.({
        moodLabel,
        focusLevel,
        energyLevel,
        stressLevel,
        reflectionNote,
      });
      setReflectionNote("");
      toast({
        title: "Check-in saved",
        description: "Your adaptive focus state has been refreshed.",
      });
    } catch (submitError) {
      toast({
        title: "Unable to save check-in",
        description: submitError.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="rounded-lg border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-teal-600" />
            <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
          </div>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              driftTone[driftLevel] || driftTone.inactive
            }`}
          >
            {monitoringActive ? `${prettyLabel(driftLevel)} drift` : "Consent needed"}
          </span>
          <Link
            to={manageHref}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-secondary/30"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Settings
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!monitoringActive ? (
        <div className="mt-5 rounded-lg border border-border/60 bg-secondary/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium text-foreground">Adaptive support is off</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Turn it on from profile settings to use focus drift, mood mirror, and response suggestions.
              </p>
            </div>
            <Button asChild className="bg-teal-600 hover:bg-teal-700">
              <Link to={manageHref}>Open settings</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MetricDial
              label="Focus drift"
              value={`${score}%`}
              tone={driftLevel === "high" ? "text-red-700" : driftLevel === "medium" ? "text-amber-700" : "text-emerald-700"}
            />
            <MetricDial label="Mood mirror" value={moodMirror.label || "Steady"} />
            <MetricDial label="Signals" value={signals.length} />
          </div>

          <div className={`mt-5 grid gap-4 ${compact ? "" : "xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]"}`}>
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-secondary/10 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Gauge className="h-4 w-4 text-teal-700" />
                  Focus drift
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-teal-600"
                    style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {focusDrift.rationale || "Focus signals are still warming up."}
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  Mood mirror
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {moodMirror.rationale || "Submit a check-in to improve the mood mirror."}
                </p>
                {moodMirror.self_report ? (
                  <div className="mt-3 rounded-lg bg-secondary/15 px-3 py-2 text-sm text-muted-foreground">
                    Latest check-in: {prettyLabel(moodMirror.self_report.mood_label)}
                    {formatDateTime(moodMirror.self_report.created_at)
                      ? ` at ${formatDateTime(moodMirror.self_report.created_at)}`
                      : ""}
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-border/60 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Activity className="h-4 w-4 text-sky-700" />
                  Suggested responses
                </div>
                <div className="mt-3 space-y-3">
                  {responses.map((item) => (
                    <Link
                      key={item.key}
                      to={item.route || "/dashboard"}
                      className="block rounded-lg border border-border/60 bg-secondary/10 px-4 py-3 transition hover:border-teal-200 hover:bg-teal-50/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-foreground">{item.title}</div>
                          <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                        </div>
                        <ArrowRight className="mt-0.5 h-4 w-4 text-teal-700" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {allowCheckIn && onSubmitCheckIn ? (
              <div className="rounded-lg border border-border/60 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <RefreshCw className="h-4 w-4 text-teal-700" />
                  Quick check-in
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="mb-2 text-sm font-medium text-foreground">Mood</div>
                    <Select value={moodLabel} onValueChange={setMoodLabel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {moodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <RangeControl label="Focus" value={focusLevel} onChange={setFocusLevel} />
                  <RangeControl label="Energy" value={energyLevel} onChange={setEnergyLevel} />
                  <RangeControl label="Stress" value={stressLevel} onChange={setStressLevel} />
                  <Textarea
                    rows={4}
                    value={reflectionNote}
                    onChange={(event) => setReflectionNote(event.target.value)}
                    placeholder="Optional reflection"
                  />
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full bg-teal-600 hover:bg-teal-700"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Save check-in
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {signals.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {signals.map((signal) => (
                <span
                  key={signal.key}
                  className="rounded-full bg-secondary/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  title={signal.explanation}
                >
                  {signal.label}
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
