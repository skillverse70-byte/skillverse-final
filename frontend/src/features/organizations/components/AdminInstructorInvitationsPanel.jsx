import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Mail,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function matchesSearch(invitation, search) {
  const normalizedSearch = String(search || "").trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  return [
    invitation.course_title,
    invitation.organization_name,
    invitation.invited_email,
    invitation.invited_user_email,
    invitation.invited_user_name,
    invitation.invited_by_email,
    invitation.invited_by_name,
  ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
}

function SummaryMetric({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 font-heading text-3xl font-bold text-foreground">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{description}</div>
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value || "Not recorded"}</div>
    </div>
  );
}

export default function AdminInstructorInvitationsPanel({
  invitations,
  onOpenCoursesTab,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvitationId, setSelectedInvitationId] = useState(
    invitations[0]?.id ?? null,
  );

  const filteredInvitations = useMemo(
    () =>
      invitations.filter((invitation) => {
        const matchesStatus =
          statusFilter === "all" || invitation.status === statusFilter;
        return matchesStatus && matchesSearch(invitation, search);
      }),
    [invitations, search, statusFilter],
  );

  const summary = useMemo(
    () => ({
      total: invitations.length,
      pending: invitations.filter((invitation) => invitation.status === "pending").length,
      accepted: invitations.filter((invitation) => invitation.status === "accepted").length,
      closed: invitations.filter((invitation) =>
        ["declined", "revoked", "expired"].includes(invitation.status),
      ).length,
    }),
    [invitations],
  );

  React.useEffect(() => {
    if (!filteredInvitations.length) {
      setSelectedInvitationId(null);
      return;
    }
    if (!filteredInvitations.some((invitation) => invitation.id === selectedInvitationId)) {
      setSelectedInvitationId(filteredInvitations[0].id);
    }
  }, [filteredInvitations, selectedInvitationId]);

  const selectedInvitation =
    filteredInvitations.find((invitation) => invitation.id === selectedInvitationId) ||
    null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          label="Total invitations"
          value={summary.total}
          description="All instructor invitation records visible to admins."
        />
        <SummaryMetric
          label="Pending"
          value={summary.pending}
          description="Invitations still inside the response window."
        />
        <SummaryMetric
          label="Accepted"
          value={summary.accepted}
          description="Instructors now publicly attached to their course."
        />
        <SummaryMetric
          label="Closed"
          value={summary.closed}
          description="Declined, revoked, and expired invitation outcomes."
        />
      </div>

      <div className="grid gap-3 rounded-3xl border border-border/60 bg-white p-4 md:grid-cols-[minmax(0,1.4fr)_220px] shadow-sm shadow-black/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search invited email, course, organization, or inviter"
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredInvitations.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No instructor invitations match this filter"
          description="Adjust the search or status filter to inspect invitation history."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <section className="space-y-3">
            {filteredInvitations.map((invitation) => {
              const selected = invitation.id === selectedInvitationId;
              const invitedIdentity =
                invitation.invited_user_name ||
                invitation.invited_user_email ||
                invitation.invited_email;
              return (
                <button
                  key={invitation.id}
                  type="button"
                  onClick={() => setSelectedInvitationId(invitation.id)}
                  className={`w-full rounded-3xl border px-5 py-5 text-left shadow-sm shadow-black/5 transition ${
                    selected
                      ? "border-teal-200 bg-teal-50/60"
                      : "border-border/60 bg-white hover:border-teal-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={invitation.status} />
                        {invitation.status === "accepted" ? (
                          <StatusBadge status="active" label="Public instructor" />
                        ) : null}
                      </div>
                      <h3 className="mt-3 font-heading text-lg font-semibold text-foreground">
                        {invitedIdentity}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {invitation.course_title} · {invitation.organization_name}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Sent {formatDateTime(invitation.last_sent_at || invitation.created_at)}</span>
                        <span>Expires {formatDateTime(invitation.expires_at)}</span>
                        <span>Attempts {invitation.sent_count}</span>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                      #{invitation.id}
                    </div>
                  </div>
                </button>
              );
            })}
          </section>

          <section className="xl:sticky xl:top-24">
            <div className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-teal-700" />
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Invitation detail
                </h2>
              </div>

              {!selectedInvitation ? (
                <p className="mt-5 text-sm text-muted-foreground">
                  Select an invitation record to inspect its course, actor, and outcome.
                </p>
              ) : (
                <div className="mt-5 space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedInvitation.status} />
                    {selectedInvitation.status === "accepted" ? (
                      <StatusBadge status="active" label="Visible on course page" />
                    ) : null}
                  </div>

                  <div>
                    <h3 className="font-heading text-xl font-semibold text-foreground">
                      {selectedInvitation.course_title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selectedInvitation.organization_name}
                    </p>
                  </div>

                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <DetailField
                      label="Invited email"
                      value={selectedInvitation.invited_email}
                    />
                    <DetailField
                      label="Matched account"
                      value={
                        selectedInvitation.invited_user_name ||
                        selectedInvitation.invited_user_email ||
                        "No account linked yet"
                      }
                    />
                    <DetailField
                      label="Invited by"
                      value={
                        selectedInvitation.invited_by_name ||
                        selectedInvitation.invited_by_email
                      }
                    />
                    <DetailField
                      label="Last sent"
                      value={formatDateTime(
                        selectedInvitation.last_sent_at || selectedInvitation.created_at,
                      )}
                    />
                    <DetailField
                      label="Accepted"
                      value={formatDateTime(selectedInvitation.accepted_at)}
                    />
                    <DetailField
                      label="Declined"
                      value={formatDateTime(selectedInvitation.declined_at)}
                    />
                    <DetailField
                      label="Revoked"
                      value={formatDateTime(selectedInvitation.revoked_at)}
                    />
                    <DetailField
                      label="Expires"
                      value={formatDateTime(selectedInvitation.expires_at)}
                    />
                  </dl>

                  <div className="rounded-2xl bg-secondary/20 p-4 text-sm text-muted-foreground">
                    {selectedInvitation.status === "accepted" ? (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-teal-700" />
                        <span>
                          This instructor is now attached publicly to the course and cannot
                          enroll in the same course as a learner.
                        </span>
                      </div>
                    ) : selectedInvitation.status === "pending" ? (
                      <div className="flex items-start gap-2">
                        <Clock3 className="mt-0.5 h-4 w-4 text-amber-700" />
                        <span>
                          This invitation is still waiting on instructor action inside the
                          24-hour response window.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <XCircle className="mt-0.5 h-4 w-4 text-slate-700" />
                        <span>
                          This invitation is closed. Admins can still review the history even
                          though the instructor can no longer respond through this record.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onOpenCoursesTab}
                    >
                      Open course moderation
                    </Button>
                    {selectedInvitation.course_program ? (
                      <Link
                        to={`/courses/${selectedInvitation.course_program}`}
                        className="inline-flex"
                      >
                        <Button type="button" variant="outline">
                          View public course
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
