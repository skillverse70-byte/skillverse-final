import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Calendar,
  CheckCircle,
  CircleX,
  Clock3,
  Eye,
  MessageCircle,
  X,
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
import StatusBadge from "@/components/shared/StatusBadge";

function titleForRequest(request) {
  if (request.status === "accepted") {
    return "Active skill swap";
  }
  if (request.my_role === "recipient") {
    return "Incoming request";
  }
  if (request.my_role === "requester") {
    return "Outgoing request";
  }
  return "Swap request";
}

function renderSkillList(skills = [], emptyLabel) {
  if (!skills.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <span
          key={`${skill.id}-${skill.slug}`}
          className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
        >
          {skill.name}
        </span>
      ))}
    </div>
  );
}

export default function SwapRequestCard({
  request,
  acting,
  onAccept,
  onReject,
  onCancel,
  onOpenDetails,
  onOpenMessage,
  highlighted = false,
  compact = false,
}) {
  const latestHistory = request.status_history?.[request.status_history.length - 1];
  const cardRef = useRef(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (highlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlighted]);

  return (
    <>
      <article
        ref={cardRef}
        className={`rounded-2xl border bg-white p-5 transition-shadow ${
          highlighted
            ? "border-teal-300 shadow-[0_0_0_4px_rgba(13,148,136,0.12)]"
            : "border-border/60"
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-base font-semibold text-foreground">
                {request.counterparty?.full_name || "Swap partner"}
              </h3>
              <StatusBadge status={request.status} />
            </div>
            <p className="text-sm font-medium text-foreground">{titleForRequest(request)}</p>
            <p className="text-sm text-muted-foreground">
              {request.exchange_summary}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
            <ArrowLeftRight className="h-5 w-5 text-teal-600" />
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              You teach
            </p>
            {renderSkillList(
              request.my_teaching_skills,
              "Teaching skills are not attached to this swap yet.",
            )}
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              You learn
            </p>
            {renderSkillList(
              request.my_learning_skills,
              "Learning goals are not attached to this swap yet.",
            )}
          </div>
        </div>

        {!compact && request.message ? (
          <div className="mb-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted-foreground">
            {request.message}
          </div>
        ) : null}

        {!compact ? (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Sent note
                </p>
                <p className="text-sm text-foreground">
                  {request.requester_note || "No note provided."}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Latest status note
                </p>
                <p className="text-sm text-foreground">
                  {latestHistory?.note ||
                    request.recipient_note ||
                    request.cancelled_reason ||
                    "No update yet."}
                </p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
                <Clock3 className="h-3.5 w-3.5" />
                Created {new Date(request.created_at).toLocaleString()}
              </span>
              {request.responded_at ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Responded {new Date(request.responded_at).toLocaleString()}
                </span>
              ) : null}
            </div>
          </>
        ) : (
          <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
              <Clock3 className="h-3.5 w-3.5" />
              Created {new Date(request.created_at).toLocaleDateString()}
            </span>
            {request.responded_at ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
                <Calendar className="h-3.5 w-3.5" />
                Updated {new Date(request.responded_at).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setDetailsOpen(true)}
          >
            <Eye className="h-4 w-4" />
            View Details
          </Button>
          {request.status === "accepted" && onOpenMessage ? (
            <Button
              size="sm"
              className="gap-2 bg-teal-600 hover:bg-teal-700"
              onClick={() => onOpenMessage(request)}
            >
              <MessageCircle className="h-4 w-4" />
              Message Partner
            </Button>
          ) : null}
          {!compact && request.can_accept ? (
            <Button
              size="sm"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={acting}
              onClick={() => onAccept(request.id)}
            >
              <CheckCircle className="h-4 w-4" />
              {acting ? "Accepting..." : "Accept"}
            </Button>
          ) : null}
          {!compact && request.can_reject ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={acting}
              onClick={() => onReject(request.id)}
            >
              <CircleX className="h-4 w-4" />
              {acting ? "Rejecting..." : "Reject"}
            </Button>
          ) : null}
          {!compact && request.can_cancel ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={acting}
              onClick={() => onCancel(request.id)}
            >
              <X className="h-4 w-4" />
              {acting ? "Cancelling..." : "Cancel"}
            </Button>
          ) : null}
        </div>
      </article>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{request.counterparty?.full_name || "Swap partner"}</DialogTitle>
            <DialogDescription>
              Review the full skill swap context, notes, and status history before taking the next step.
            </DialogDescription>
          </DialogHeader>

          {request.message ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted-foreground">
              {request.message}
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-border/60 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                You teach
              </p>
              {renderSkillList(
                request.my_teaching_skills,
                "Teaching skills are not attached to this swap yet.",
              )}
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                You learn
              </p>
              {renderSkillList(
                request.my_learning_skills,
                "Learning goals are not attached to this swap yet.",
              )}
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sent note
              </p>
              <p className="text-sm text-foreground">
                {request.requester_note || "No note provided."}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Latest status note
              </p>
              <p className="text-sm text-foreground">
                {latestHistory?.note ||
                  request.recipient_note ||
                  request.cancelled_reason ||
                  "No update yet."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
              <Clock3 className="h-3.5 w-3.5" />
              Created {new Date(request.created_at).toLocaleString()}
            </span>
            {request.responded_at ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
                <Calendar className="h-3.5 w-3.5" />
                Responded {new Date(request.responded_at).toLocaleString()}
              </span>
            ) : null}
          </div>

          <DialogFooter>
            {request.status === "accepted" && onOpenMessage ? (
              <Button
                className="gap-2 bg-teal-600 hover:bg-teal-700"
                onClick={() => onOpenMessage(request)}
              >
                <MessageCircle className="h-4 w-4" />
                Message Partner
              </Button>
            ) : null}
            {request.can_accept ? (
              <Button
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                disabled={acting}
                onClick={() => onAccept(request.id)}
              >
                <CheckCircle className="h-4 w-4" />
                {acting ? "Accepting..." : "Accept"}
              </Button>
            ) : null}
            {request.can_reject ? (
              <Button
                variant="outline"
                className="gap-2"
                disabled={acting}
                onClick={() => onReject(request.id)}
              >
                <CircleX className="h-4 w-4" />
                {acting ? "Rejecting..." : "Reject"}
              </Button>
            ) : null}
            {request.can_cancel ? (
              <Button
                variant="outline"
                className="gap-2"
                disabled={acting}
                onClick={() => onCancel(request.id)}
              >
                <X className="h-4 w-4" />
                {acting ? "Cancelling..." : "Cancel"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
