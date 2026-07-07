import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import {
  Building,
  CheckCircle,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Calendar,
  ShieldCheck,
  Users,
  BookOpen,
  Briefcase,
  XCircle,
} from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import WorkspaceShell from "@/components/shared/WorkspaceShell";
import DashboardStats from "@/features/dashboard/components/DashboardStats";
import { useToast } from "@/components/ui/use-toast";
import { decideAdminEvent } from "@/services/events/events.service";
import {
  decideAdminFinancialAccount,
  decideAdminOrganizationVerificationRequest,
} from "@/services/organizations/organization.service";
import { useAdminDashboardData } from "@/hooks/dashboard/useAdminDashboardData";
import { useWorkspaceTab } from "@/hooks/dashboard/useWorkspaceTab";
import moment from "moment";

const validTabs = ["overview", "orgs", "financial", "events"];

export default function AdminReviewPage() {
  const { activeTab, setActiveTab } = useWorkspaceTab(validTabs, "overview");
  const [reviewerNotes, setReviewerNotes] = useState({});
  const [overrideFlags, setOverrideFlags] = useState({});
  const [financialNotes, setFinancialNotes] = useState({});
  const [restrictionReasons, setRestrictionReasons] = useState({});
  const [eventNotes, setEventNotes] = useState({});
  const [eventFilters, setEventFilters] = useState({
    status: "all",
    verificationStatus: "all",
    search: "",
  });
  const [actingId, setActingId] = useState(null);
  const { toast } = useToast();
  const {
    summary,
    oversight,
    organizationVerificationRequests,
    financialAccounts,
    events,
    loading,
    error,
    refresh,
  } = useAdminDashboardData();

  const filteredEvents = useMemo(() => {
    const searchValue = eventFilters.search.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch =
        !searchValue ||
        event.title?.toLowerCase().includes(searchValue) ||
        event.organization_name?.toLowerCase().includes(searchValue) ||
        event.category?.toLowerCase().includes(searchValue);
      const matchesStatus =
        eventFilters.status === "all" || event.status === eventFilters.status;
      const matchesVerification =
        eventFilters.verificationStatus === "all" ||
        event.organization_verification_status === eventFilters.verificationStatus;
      return matchesSearch && matchesStatus && matchesVerification;
    });
  }, [events, eventFilters]);

  if (loading) {
    return <PageLoader />;
  }

  const runAction = async (action, successTitle) => {
    setActingId(successTitle);
    try {
      await action();
      await refresh();
      toast({ title: successTitle });
    } catch (actionError) {
      console.error(actionError);
      toast({
        title: "Action failed",
        description: actionError.message || "Unable to save the admin decision.",
        variant: "destructive",
      });
      throw actionError;
    } finally {
      setActingId(null);
    }
  };

  const tabs = [
    {
      value: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      description: "Platform snapshot.",
    },
    {
      value: "orgs",
      label: `Organizations (${organizationVerificationRequests.length})`,
      icon: Building,
      description: "Verification queue.",
    },
    {
      value: "financial",
      label: `Financial (${financialAccounts.length})`,
      icon: CreditCard,
      description: "Finance queue.",
    },
    {
      value: "events",
      label: `Events (${events.length})`,
      icon: Calendar,
      description: "Event oversight lane.",
    },
  ];

  const statCards = [
    {
      icon: Building,
      label: "Verification queue",
      count: oversight.pending_verification_requests ?? 0,
      description: "Organizations awaiting review.",
      color: "bg-amber-50 text-amber-600",
      onClick: () => setActiveTab("orgs"),
    },
    {
      icon: CreditCard,
      label: "Finance queue",
      count: oversight.pending_financial_accounts ?? 0,
      description: "Financial setups awaiting review.",
      color: "bg-blue-50 text-blue-600",
      onClick: () => setActiveTab("financial"),
    },
    {
      icon: Calendar,
      label: "Event oversight",
      count: events.length,
      description: "Published events visible to admins.",
      color: "bg-teal-50 text-teal-600",
      onClick: () => setActiveTab("events"),
    },
    {
      icon: ShieldCheck,
      label: "Verified orgs",
      count: summary.verified_organizations ?? 0,
      description: "Trusted organizations on platform.",
      color: "bg-emerald-50 text-emerald-600",
      onClick: () => setActiveTab("orgs"),
    },
  ];

  return (
    <WorkspaceShell
      eyebrow="Admin workspace"
      title="Admin Dashboard"
      description="Verification, finance, event oversight, and platform-level review from one controlled workspace."
      value={activeTab}
      onValueChange={setActiveTab}
      tabs={tabs}
      showTabDescriptions={false}
    >
      <TabsContent value="overview" className="mt-0 space-y-6">
        <DashboardStats stats={statCards} />

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Platform summary
              </h2>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MiniMetric label="Total users" value={summary.total_users ?? 0} />
              <MiniMetric label="Regular users" value={summary.regular_users ?? 0} />
              <MiniMetric label="Organizations" value={summary.organizations ?? 0} />
              <MiniMetric label="Published courses" value={summary.published_courses ?? 0} />
              <MiniMetric label="Open jobs" value={summary.open_opportunities ?? 0} />
              <MiniMetric label="Active events" value={summary.active_events ?? 0} />
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Oversight focus
              </h2>
            </div>
            <div className="mt-5 space-y-3">
              <AttentionRow
                label="Pending verification requests"
                value={String(oversight.pending_verification_requests ?? 0)}
                actionLabel="Review organizations"
                onAction={() => setActiveTab("orgs")}
              />
              <AttentionRow
                label="Pending financial accounts"
                value={String(oversight.pending_financial_accounts ?? 0)}
                actionLabel="Review finance"
                onAction={() => setActiveTab("financial")}
              />
              <AttentionRow
                label="Restricted financial accounts"
                value={String(oversight.restricted_financial_accounts ?? 0)}
                actionLabel="Open finance"
                onAction={() => setActiveTab("financial")}
              />
              <AttentionRow
                label="Events from unverified orgs"
                value={String(oversight.events_from_unverified_organizations ?? 0)}
                actionLabel="Open events"
                onAction={() => setActiveTab("events")}
              />
            </div>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <QueuePreview
            title="Organization verification"
            description="Trust-sensitive organizations waiting for review."
            items={organizationVerificationRequests.slice(0, 3).map((request) => ({
              id: request.id,
              title: `Organization #${request.organization}`,
              subtitle: request.requested_by_email,
              status: request.used_admin_override ? "reviewing" : "pending",
            }))}
            emptyTitle="No organization reviews pending"
          />
          <QueuePreview
            title="Financial setup review"
            description="Monetization readiness for companies that want paid enrollment enabled."
            items={financialAccounts.slice(0, 3).map((account) => ({
              id: account.id,
              title: account.organization_name,
              subtitle: account.organization_email,
              status: account.status,
            }))}
            emptyTitle="No financial reviews pending"
          />
          <QueuePreview
            title="Event oversight"
            description="Published events visible to admins for moderation-ready intervention."
            items={events.slice(0, 3).map((event) => ({
              id: event.id,
              title: event.title,
              subtitle: event.organization_name,
              status: event.status,
            }))}
            emptyTitle="No event reviews pending"
          />
        </div>
      </TabsContent>

      <TabsContent value="orgs" className="mt-0">
        {organizationVerificationRequests.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Verification queue is clear"
            description="No organizations are waiting for trust review right now."
          />
        ) : (
          <div className="space-y-4">
            {organizationVerificationRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-border/50 bg-white p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50">
                    <Building className="h-6 w-6 text-teal-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-heading font-semibold">
                        Organization #{request.organization}
                      </h3>
                      <StatusBadge status={request.status} />
                      {request.used_admin_override ? (
                        <StatusBadge status="warning" label="Override Used" />
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{request.requested_by_email}</p>
                    {request.request_notes ? (
                      <p className="mt-4 border-l-2 border-border pl-3 text-sm text-muted-foreground">
                        {request.request_notes}
                      </p>
                    ) : null}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Textarea
                        rows={3}
                        value={reviewerNotes[request.id] || ""}
                        onChange={(event) =>
                          setReviewerNotes((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder="Internal review notes"
                      />
                      <label className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(overrideFlags[request.id])}
                          onChange={(event) =>
                            setOverrideFlags((current) => ({
                              ...current,
                              [request.id]: event.target.checked,
                            }))
                          }
                        />
                        Use admin override when evidence is incomplete
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 sm:pl-16">
                  <Button
                    onClick={() =>
                      runAction(
                        () =>
                          decideAdminOrganizationVerificationRequest(request.id, {
                            decision: "approved",
                            reviewerNotes: reviewerNotes[request.id] || "",
                            useAdminOverride: Boolean(overrideFlags[request.id]),
                          }),
                        "Verification approved",
                      )
                    }
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    disabled={actingId === "Verification approved"}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Verify
                  </Button>
                  <Button
                    onClick={() =>
                      runAction(
                        () =>
                          decideAdminOrganizationVerificationRequest(request.id, {
                            decision: "rejected",
                            reviewerNotes: reviewerNotes[request.id] || "",
                            useAdminOverride: false,
                          }),
                        "Verification rejected",
                      )
                    }
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-red-600 hover:bg-red-50"
                    disabled={actingId === "Verification rejected"}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="financial" className="mt-0">
        {financialAccounts.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Financial queue is clear"
            description="No company financial setups are waiting for review."
          />
        ) : (
          <div className="space-y-4">
            {financialAccounts.map((account) => (
              <div key={account.id} className="rounded-xl border border-border/50 bg-white p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50">
                    <CreditCard className="h-6 w-6 text-teal-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-heading font-semibold">{account.organization_name}</h3>
                      <StatusBadge status={account.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{account.organization_email}</p>

                    <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                      <ReviewField label="Account holder" value={account.account_holder_name} />
                      <ReviewField
                        label="Bank"
                        value={
                          account.bank_name
                            ? `${account.bank_name}${account.account_number_last4 ? ` · ending ${account.account_number_last4}` : ""}`
                            : "Not provided"
                        }
                      />
                      <ReviewField label="Bank code" value={account.bank_code} />
                      <ReviewField label="Mobile money" value={account.mobile_money_number} />
                    </dl>

                    {account.setup_notes ? (
                      <p className="mt-4 border-l-2 border-border pl-3 text-sm text-muted-foreground">
                        {account.setup_notes}
                      </p>
                    ) : null}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Textarea
                        rows={3}
                        value={financialNotes[account.id] || ""}
                        onChange={(event) =>
                          setFinancialNotes((current) => ({
                            ...current,
                            [account.id]: event.target.value,
                          }))
                        }
                        placeholder="Internal review notes"
                      />
                      <Textarea
                        rows={3}
                        value={restrictionReasons[account.id] || ""}
                        onChange={(event) =>
                          setRestrictionReasons((current) => ({
                            ...current,
                            [account.id]: event.target.value,
                          }))
                        }
                        placeholder="Reason required only when restricting"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 sm:pl-16">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    disabled={actingId === "Financial account approved"}
                    onClick={() =>
                      runAction(
                        () =>
                          decideAdminFinancialAccount(account.id, {
                            decision: "ready",
                            reviewNotes: financialNotes[account.id] || "",
                          }),
                        "Financial account approved",
                      )
                    }
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-red-600 hover:bg-red-50"
                    disabled={actingId === "Financial account restricted"}
                    onClick={() =>
                      runAction(
                        () =>
                          decideAdminFinancialAccount(account.id, {
                            decision: "restricted",
                            reviewNotes: financialNotes[account.id] || "",
                            restrictedReason: restrictionReasons[account.id] || "",
                          }),
                        "Financial account restricted",
                      )
                    }
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Restrict
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="events" className="mt-0 space-y-4">
        <div className="grid gap-3 rounded-3xl border border-border/60 bg-white p-4 md:grid-cols-3">
          <Input
            placeholder="Search event or organization"
            value={eventFilters.search}
            onChange={(event) =>
              setEventFilters((current) => ({ ...current, search: event.target.value }))
            }
          />
          <select
            value={eventFilters.status}
            onChange={(event) =>
              setEventFilters((current) => ({ ...current, status: event.target.value }))
            }
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={eventFilters.verificationStatus}
            onChange={(event) =>
              setEventFilters((current) => ({
                ...current,
                verificationStatus: event.target.value,
              }))
            }
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All trust states</option>
            <option value="verified">Verified orgs</option>
            <option value="unverified">Unverified orgs</option>
          </select>
        </div>

        {filteredEvents.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No events match this view"
            description="Adjust the filters or wait for new events to appear."
          />
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-border/50 bg-white p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-base font-semibold">{event.title}</h3>
                      <StatusBadge status={event.status} />
                      <StatusBadge
                        status={event.organization_verification_status}
                        label={
                          event.organization_verification_status === "verified"
                            ? "Verified Org"
                            : "Unverified Org"
                        }
                      />
                      <StatusBadge
                        status={event.rsvp_open ? "active" : "cancelled"}
                        label={event.rsvp_open ? "RSVP Open" : "RSVP Closed"}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {event.organization_name} · {event.category || "General"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Starts {moment(event.starts_at).format("MMM D, YYYY h:mm A")}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                      <ReviewField label="RSVPs" value={event.total_rsvp_count} />
                      <ReviewField label="Going" value={event.current_attendees} />
                      <ReviewField label="Attended" value={event.attended_count} />
                      <ReviewField
                        label="Spots remaining"
                        value={event.spots_remaining ?? "Unlimited"}
                      />
                    </div>
                    <Textarea
                      rows={3}
                      value={eventNotes[event.id] ?? event.admin_review_notes ?? ""}
                      onChange={(evt) =>
                        setEventNotes((current) => ({
                          ...current,
                          [event.id]: evt.target.value,
                        }))
                      }
                      className="mt-4"
                      placeholder="Admin review notes"
                    />
                    <div className="mt-2 text-xs text-muted-foreground">
                      {event.reviewed_by_email
                        ? `Last reviewed by ${event.reviewed_by_email}${
                            event.admin_reviewed_at
                              ? ` on ${moment(event.admin_reviewed_at).format("MMM D, YYYY h:mm A")}`
                              : ""
                          }`
                        : "No admin review recorded yet."}
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2 lg:w-56">
                    <Link
                      to={`/events/${event.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm font-medium text-teal-700"
                    >
                      Open public event
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <Button
                      variant="outline"
                      className="justify-center gap-2 text-red-600 hover:bg-red-50"
                      disabled={actingId === "Event oversight updated"}
                      onClick={() =>
                        runAction(
                          () =>
                            decideAdminEvent(event.id, {
                              status: "cancelled",
                              rsvpOpen: false,
                              reviewNotes: eventNotes[event.id] ?? event.admin_review_notes ?? "",
                            }),
                          "Event oversight updated",
                        )
                      }
                    >
                      Cancel event
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-center gap-2"
                      disabled={actingId === "Event oversight updated"}
                      onClick={() =>
                        runAction(
                          () =>
                            decideAdminEvent(event.id, {
                              rsvpOpen: false,
                              reviewNotes: eventNotes[event.id] ?? event.admin_review_notes ?? "",
                            }),
                          "Event oversight updated",
                        )
                      }
                    >
                      Close RSVP
                    </Button>
                    <Button
                      className="justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                      disabled={actingId === "Event oversight updated"}
                      onClick={() =>
                        runAction(
                          () =>
                            decideAdminEvent(event.id, {
                              status: "upcoming",
                              rsvpOpen: true,
                              reviewNotes: eventNotes[event.id] ?? event.admin_review_notes ?? "",
                            }),
                          "Event oversight updated",
                        )
                      }
                    >
                      Restore event
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </WorkspaceShell>
  );
}

function AttentionRow({ label, value, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-secondary/25 px-4 py-3">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{value}</div>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="text-sm font-medium text-teal-700 hover:text-teal-800"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary/20 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function QueuePreview({ title, description, items, emptyTitle }) {
  return (
    <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
      <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{emptyTitle}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl bg-secondary/20 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewField({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value || "Not provided"}</dd>
    </div>
  );
}
