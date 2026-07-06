import React, { useState } from "react";
import moment from "moment";
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  History,
  Link2,
  MapPin,
  Plus,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/shared/StatusBadge";
import ParticipationReviewDialog from "@/features/reviews/components/ParticipationReviewDialog";

function createInitialFormValues() {
  return {
    title: "",
    description: "",
    scheduled_start_at: "",
    scheduled_end_at: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    meeting_url: "",
    meeting_notes: "",
    location_note: "",
  };
}

function formatSessionTime(session) {
  return `${moment(session.scheduled_start_at).format("ddd, MMM D · h:mm A")}${
    session.timezone ? ` (${session.timezone})` : ""
  }`;
}

function SessionCard({ session, saving, onConfirm, onComplete, onCancel, children }) {
  const statusLabel =
    session.status === "planned"
      ? "Planned"
      : session.status === "confirmed"
        ? "Confirmed"
        : undefined;

  return (
    <div className="rounded-2xl border border-border/60 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-semibold text-foreground">
              {session.title}
            </h3>
            <StatusBadge status={session.status} label={statusLabel} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-teal-600" />
              {formatSessionTime(session)}
            </span>
          </div>
          {session.description ? (
            <p className="text-sm text-muted-foreground">{session.description}</p>
          ) : null}
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {session.meeting_url ? (
              <a
                href={session.meeting_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-medium text-teal-700"
              >
                <Link2 className="h-4 w-4" />
                Open meeting link
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
            {session.meeting_notes ? <span>{session.meeting_notes}</span> : null}
            {session.location_note ? (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {session.location_note}
              </span>
            ) : null}
            {session.completion_notes ? (
              <span className="rounded-xl bg-secondary/70 px-3 py-2 text-foreground">
                {session.completion_notes}
              </span>
            ) : null}
          </div>
        </div>

        {session.status === "planned" || session.status === "confirmed" ? (
          <div className="flex flex-wrap gap-2">
            {session.status === "planned" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onConfirm(session)}
                disabled={saving}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirm
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => onComplete(session)}
              disabled={saving}
            >
              Complete
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onCancel(session)}
              disabled={saving}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        ) : children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
      </div>
    </div>
  );
}

export default function SessionPlannerPanel({
  sessions,
  loading,
  saving,
  error,
  onCreateSession,
  onConfirmSession,
  onCompleteSession,
  onCancelSession,
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [completionDialog, setCompletionDialog] = useState({
    open: false,
    session: null,
    notes: "",
  });
  const [formValues, setFormValues] = useState(createInitialFormValues());

  const upcoming = sessions.filter(
    (session) => session.status === "planned" || session.status === "confirmed",
  );
  const completed = sessions.filter((session) => session.status === "completed");

  const resetForm = () => setFormValues(createInitialFormValues());

  const submitPlan = async () => {
    await onCreateSession({
      ...formValues,
      scheduled_end_at: formValues.scheduled_end_at || null,
    });
    resetForm();
    setPlanOpen(false);
    setHistoryOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setHistoryOpen(true)}
          className="hidden sm:inline-flex"
        >
          <History className="mr-2 h-4 w-4" />
          Session history
        </Button>
        <Button
          type="button"
          size="sm"
          className="bg-teal-600 hover:bg-teal-700"
          onClick={() => setPlanOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Plan session
        </Button>
      </div>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Plan a learning session</DialogTitle>
            <DialogDescription>
              Sessions are optional. Use this to save time, meeting link, and quick notes without leaving the conversation.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Session title</label>
              <Input
                value={formValues.title}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Python fundamentals walkthrough"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">What will you cover?</label>
              <Textarea
                value={formValues.description}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Outline what this session is for so both people know what to prepare."
                className="min-h-[96px]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Start time</label>
                <Input
                  type="datetime-local"
                  value={formValues.scheduled_start_at}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      scheduled_start_at: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">End time</label>
                <Input
                  type="datetime-local"
                  value={formValues.scheduled_end_at}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      scheduled_end_at: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Timezone</label>
                <Input
                  value={formValues.timezone}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, timezone: event.target.value }))
                  }
                  placeholder="Africa/Nairobi"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Meeting link</label>
                <Input
                  value={formValues.meeting_url}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, meeting_url: event.target.value }))
                  }
                  placeholder="https://meet.google.com/..."
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Meeting notes</label>
                <Input
                  value={formValues.meeting_notes}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, meeting_notes: event.target.value }))
                  }
                  placeholder="Join five minutes early"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Location or fallback</label>
                <Input
                  value={formValues.location_note}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, location_note: event.target.value }))
                  }
                  placeholder="External call or campus lab"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPlanOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-teal-600 hover:bg-teal-700"
              onClick={submitPlan}
              disabled={saving || !formValues.title.trim() || !formValues.scheduled_start_at}
            >
              Save session plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Session history</DialogTitle>
            <DialogDescription>
              Sessions are optional helpers for planning and tracking exchanges. Your messages stay the main workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button
              type="button"
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => {
                setHistoryOpen(false);
                setPlanOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Plan another session
            </Button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-secondary/10 px-4 py-8 text-center text-sm text-muted-foreground">
              Loading session history...
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-secondary/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No session plan saved yet.
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Upcoming and active
                  </h3>
                  {upcoming.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      saving={saving}
                      onConfirm={onConfirmSession}
                      onComplete={(activeSession) =>
                        setCompletionDialog({
                          open: true,
                          session: activeSession,
                          notes: activeSession.completion_notes || "",
                        })}
                      onCancel={onCancelSession}
                    />
                  ))}
                </div>
              ) : null}

              {completed.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Completed records
                  </h3>
                  {completed.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      saving={saving}
                      onConfirm={onConfirmSession}
                      onComplete={onCompleteSession}
                      onCancel={onCancelSession}
                    >
                      <ParticipationReviewDialog
                        context="skill_swap"
                        sourceId={session.swap_request}
                        title="Review this completed swap"
                        description="This feedback is tied to the completed swap participation behind this session."
                        triggerLabel="Leave review"
                        triggerClassName="bg-teal-600 text-white hover:bg-teal-700"
                      />
                    </SessionCard>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={completionDialog.open}
        onOpenChange={(open) =>
          setCompletionDialog((current) => ({
            ...current,
            open,
          }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete session</DialogTitle>
            <DialogDescription>
              Save a short note about what was covered so this session has a useful record later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground">Completion notes</label>
            <Textarea
              value={completionDialog.notes}
              onChange={(event) =>
                setCompletionDialog((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Covered Python basics, reviewed exercises, and shared follow-up links."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setCompletionDialog({
                  open: false,
                  session: null,
                  notes: "",
                })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={saving || !completionDialog.notes.trim()}
              onClick={async () => {
                await onCompleteSession(
                  completionDialog.session,
                  completionDialog.notes.trim(),
                );
                setCompletionDialog({
                  open: false,
                  session: null,
                  notes: "",
                });
              }}
            >
              Mark completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
