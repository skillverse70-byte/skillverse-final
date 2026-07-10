import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  LoaderCircle,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  fetchCourseInstructorInvitations,
  inviteCourseInstructor,
  resendCourseInstructorInvitation,
  revokeCourseInstructorInvitation,
} from "@/services/courses/courses.service";

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return parsed.toLocaleString();
}

function InvitationMetric({ icon: Icon, label, value, tone = "teal" }) {
  const toneClasses = {
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm shadow-black/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-2 font-heading text-2xl font-bold text-foreground">{value}</div>
        </div>
        <div className={`rounded-2xl p-2.5 ${toneClasses[tone] || toneClasses.teal}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function InvitationRow({
  invitation,
  busyAction,
  onResend,
  onRevoke,
}) {
  const invitedUser = invitation.invited_user;
  const isPending = invitation.status === "pending";
  const canResend = invitation.status !== "accepted" && invitation.status !== "revoked";
  const canRevoke = invitation.status !== "accepted" && invitation.status !== "revoked";
  const primaryLabel = invitedUser?.full_name || invitation.invited_email;
  const secondaryLabel =
    invitedUser?.email && invitedUser.email !== primaryLabel
      ? invitedUser.email
      : invitation.invited_email;

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-foreground">{primaryLabel}</h3>
            <StatusBadge status={invitation.status} />
            {invitation.is_public ? (
              <StatusBadge status="verified" label="Visible on course" />
            ) : null}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">{secondaryLabel}</div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <span>Sent: {formatDateTime(invitation.last_sent_at || invitation.created_at)}</span>
            <span>Expires: {formatDateTime(invitation.expires_at)}</span>
            <span>Attempts: {invitation.sent_count}</span>
            <span>
              {isPending
                ? invitation.is_expired
                  ? "Expired before response"
                  : "Awaiting instructor response"
                : invitation.status === "accepted"
                  ? `Accepted: ${formatDateTime(invitation.accepted_at)}`
                  : invitation.status === "declined"
                    ? `Declined: ${formatDateTime(invitation.declined_at)}`
                    : invitation.status === "revoked"
                      ? `Revoked: ${formatDateTime(invitation.revoked_at)}`
                      : "Closed"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canResend ? (
            <Button
              variant="outline"
              className="gap-2"
              disabled={busyAction === `resend-${invitation.id}`}
              onClick={() => onResend(invitation)}
            >
              {busyAction === `resend-${invitation.id}` ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Resend
            </Button>
          ) : null}
          {canRevoke ? (
            <Button
              variant="outline"
              className="gap-2 text-red-700 hover:text-red-800"
              disabled={busyAction === `revoke-${invitation.id}`}
              onClick={() => onRevoke(invitation)}
            >
              {busyAction === `revoke-${invitation.id}` ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function CourseInstructorAssignmentPanel({ course }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(Boolean(course?.id));
  const [submitting, setSubmitting] = useState(false);
  const [busyAction, setBusyAction] = useState("");

  const loadInvitations = async () => {
    if (!course?.id) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await fetchCourseInstructorInvitations(course.id);
      setInvitations(result);
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to load instructors",
        description: error?.message || "Something went wrong while loading instructor invitations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, [course?.id]);

  const accepted = useMemo(
    () => invitations.filter((invitation) => invitation.status === "accepted"),
    [invitations],
  );
  const pending = useMemo(
    () => invitations.filter((invitation) => invitation.status === "pending"),
    [invitations],
  );
  const history = useMemo(
    () =>
      invitations.filter(
        (invitation) =>
          invitation.status !== "accepted" && invitation.status !== "pending",
      ),
    [invitations],
  );

  const handleInvite = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      toast({
        title: "Instructor email is required",
        variant: "destructive",
      });
      return;
    }

    if (!course?.id) {
      toast({
        title: "Save the course first",
        description: "Instructor invitations become available after the course exists.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await inviteCourseInstructor(course.id, normalizedEmail);
      setEmail("");
      await loadInvitations();
      toast({
        title: "Instructor invitation sent",
        description: "The instructor now has a 24-hour window to accept the email invitation.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to send invitation",
        description: error?.message || "Something went wrong while sending the instructor invitation.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (invitation) => {
    setBusyAction(`resend-${invitation.id}`);
    try {
      await resendCourseInstructorInvitation(course.id, invitation.id);
      await loadInvitations();
      toast({
        title: "Invitation resent",
        description: "The instructor has a fresh 24-hour invitation window.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to resend invitation",
        description: error?.message || "Something went wrong while resending the invitation.",
        variant: "destructive",
      });
    } finally {
      setBusyAction("");
    }
  };

  const handleRevoke = async (invitation) => {
    const confirmed = window.confirm(
      `Remove the invitation for ${invitation.invited_email}?`,
    );
    if (!confirmed) {
      return;
    }

    setBusyAction(`revoke-${invitation.id}`);
    try {
      await revokeCourseInstructorInvitation(course.id, invitation.id);
      await loadInvitations();
      toast({
        title: "Invitation removed",
        description: "That instructor invitation is no longer active.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to remove invitation",
        description: error?.message || "Something went wrong while removing the invitation.",
        variant: "destructive",
      });
    } finally {
      setBusyAction("");
    }
  };

  if (!course?.id) {
    return (
      <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
        <EmptyState
          icon={Users}
          title="Save the course before inviting instructors"
          description="Instructor assignment is tied to a real saved course record. Save the course first, then reopen this tab to send invitations and track responses."
        />
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <InvitationMetric
          icon={CheckCircle2}
          label="Accepted"
          value={accepted.length}
          tone="teal"
        />
        <InvitationMetric
          icon={Clock3}
          label="Pending"
          value={pending.length}
          tone="amber"
        />
        <InvitationMetric
          icon={Mail}
          label="History"
          value={history.length}
          tone="slate"
        />
      </div>

      <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Invite instructors
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Invite real instructor accounts by email. Accepted instructors become visible on the public course page automatically.
            </p>
          </div>
          <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900 lg:max-w-sm">
            Invitations expire after 24 hours. Pending, declined, and expired invites can be resent from this workspace.
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <Label htmlFor="course-instructor-email">Instructor email</Label>
            <Input
              id="course-instructor-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="mentor@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Existing regular-user accounts will also receive an in-app notification. If the email is not registered yet, the invitation email is still sent.
            </p>
          </div>
          <div className="flex items-end">
            <Button
              className="w-full gap-2 bg-teal-600 hover:bg-teal-700 lg:w-auto"
              disabled={submitting}
              onClick={handleInvite}
            >
              {submitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send invite
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-teal-700" />
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Active instructors
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          These instructors already accepted their invitation and are the only ones that should appear publicly with the course.
        </p>

        {loading ? (
          <div className="mt-5 flex items-center justify-center rounded-2xl border border-dashed border-border/60 py-10 text-muted-foreground">
            <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
            Loading instructor assignments...
          </div>
        ) : accepted.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon={Users}
              title="No accepted instructors yet"
              description="Accepted instructors will show here after they respond to an invitation."
            />
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {accepted.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                busyAction={busyAction}
                onResend={handleResend}
                onRevoke={handleRevoke}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
        <div className="flex items-center gap-2">
          <CircleAlert className="h-5 w-5 text-amber-600" />
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Pending invitations
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          These invitations are still waiting on instructor action. You can resend or remove them here without leaving the course builder.
        </p>

        {loading ? null : pending.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon={Mail}
              title="No pending invitations"
              description="Once you send an instructor invitation, active pending records will appear here until they are accepted or closed."
            />
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {pending.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                busyAction={busyAction}
                onResend={handleResend}
                onRevoke={handleRevoke}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Invitation history
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Declined, revoked, and expired invitations stay visible so your team can understand what happened before resending or replacing them.
        </p>

        {loading ? null : history.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon={Clock3}
              title="No invitation history yet"
              description="Older invitation outcomes will appear here once the instructor workflow starts moving."
            />
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {history.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                busyAction={busyAction}
                onResend={handleResend}
                onRevoke={handleRevoke}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
