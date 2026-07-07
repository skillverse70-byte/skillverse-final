import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { TabsContent } from "@/components/ui/tabs";
import {
  Shield,
  Building,
  Tag,
  CheckCircle,
  XCircle,
  CreditCard,
  LayoutDashboard,
} from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import WorkspaceShell from "@/components/shared/WorkspaceShell";
import { useToast } from "@/components/ui/use-toast";
import { useAdminOrganizationVerification } from "@/hooks/organizations/useAdminOrganizationVerification";
import { useAdminFinancialAccounts } from "@/hooks/organizations/useAdminFinancialAccounts";

export default function AdminReview() {
  const [skills, setSkills] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [reviewerNotes, setReviewerNotes] = useState({});
  const [overrideFlags, setOverrideFlags] = useState({});
  const [financialNotes, setFinancialNotes] = useState({});
  const [restrictionReasons, setRestrictionReasons] = useState({});
  const { toast } = useToast();
  const {
    requests,
    loading,
    actingId,
    error,
    decide,
  } = useAdminOrganizationVerification();
  const {
    accounts: financialAccounts,
    loading: financialLoading,
    actingId: financialActingId,
    error: financialError,
    decide: decideFinancialAccount,
  } = useAdminFinancialAccounts();

  const handleSkillApprove = async (skill, approved) => {
    try {
      void approved;
      setSkills((prev) => prev.filter((current) => current.id !== skill.id));
    } catch (reviewError) {
      console.error(reviewError);
    }
  };

  if (loading || financialLoading) {
    return <PageLoader />;
  }

  const tabs = [
    {
      value: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      description: "Queue summary.",
    },
    {
      value: "orgs",
      label: `Organizations (${requests.length})`,
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
      value: "skills",
      label: `Skills (${skills.length})`,
      icon: Tag,
      description: "Moderation lane.",
    },
  ];

  return (
    <WorkspaceShell
      eyebrow="Admin workspace"
      title="Admin Dashboard"
      description="Verification, finance, moderation, and reporting."
      value={activeTab}
      onValueChange={setActiveTab}
      tabs={tabs}
      showTabDescriptions={false}
    >
      <TabsContent value="overview" className="mt-0 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <OverviewCard
            icon={Building}
            title="Organization queue"
            value={requests.length}
          />
          <OverviewCard
            icon={CreditCard}
            title="Financial queue"
            value={financialAccounts.length}
          />
          <OverviewCard
            icon={Tag}
            title="Skill moderation"
            value={skills.length}
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {financialError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {financialError}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <QueuePreview
            title="Organization verification"
            description="Trust-sensitive public organizations waiting for review."
            items={requests.slice(0, 3).map((request) => ({
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
        </div>
      </TabsContent>

      <TabsContent value="orgs" className="mt-0">
        {requests.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="All caught up"
            description="No pending organization verifications."
          />
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="rounded-xl border border-border/50 bg-white p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50">
                    <Building className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-heading text-base font-semibold">
                        Organization #{request.organization}
                      </h3>
                      <StatusBadge status="pending" />
                      {request.used_admin_override ? (
                        <StatusBadge status="reviewing" label="Override" />
                      ) : null}
                    </div>
                    <p className="mb-1 text-sm text-muted-foreground">
                      Submitted by {request.requested_by_email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.has_business_license
                        ? "Supporting document is on file."
                        : "No supporting document is on file. Override required for approval."}
                    </p>
                    {request.request_notes ? (
                      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-foreground">
                        {request.request_notes}
                      </div>
                    ) : null}
                    <div className="mt-4 space-y-3">
                      <Textarea
                        rows={3}
                        value={reviewerNotes[request.id] || ""}
                        onChange={(event) =>
                          setReviewerNotes((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder="Add reviewer notes for the organization."
                      />
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Checkbox
                          checked={Boolean(overrideFlags[request.id])}
                          onCheckedChange={(checked) =>
                            setOverrideFlags((current) => ({
                              ...current,
                              [request.id]: Boolean(checked),
                            }))
                          }
                        />
                        Use admin override if approving without a business license
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 sm:pl-16">
                  <Button
                    onClick={async () => {
                      try {
                        await decide(request.id, {
                          decision: "approved",
                          reviewerNotes: reviewerNotes[request.id] || "",
                          useAdminOverride: Boolean(overrideFlags[request.id]),
                        });
                        toast({ title: "Verification approved" });
                      } catch (reviewError) {
                        toast({
                          title: "Approval failed",
                          description: reviewError.message,
                          variant: "destructive",
                        });
                      }
                    }}
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    disabled={actingId === request.id}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Verify
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        await decide(request.id, {
                          decision: "rejected",
                          reviewerNotes: reviewerNotes[request.id] || "",
                          useAdminOverride: false,
                        });
                        toast({ title: "Verification rejected" });
                      } catch (reviewError) {
                        toast({
                          title: "Rejection failed",
                          description: reviewError.message,
                          variant: "destructive",
                        });
                      }
                    }}
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-red-600 hover:bg-red-50"
                    disabled={actingId === request.id}
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
              <div
                key={account.id}
                className="rounded-xl border border-border/50 bg-white p-5"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50">
                    <CreditCard className="h-6 w-6 text-teal-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-heading font-semibold">
                        {account.organization_name}
                      </h3>
                      <StatusBadge status={account.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {account.organization_email}
                    </p>

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
                    disabled={financialActingId === account.id}
                    onClick={async () => {
                      try {
                        await decideFinancialAccount(account.id, {
                          decision: "ready",
                          reviewNotes: financialNotes[account.id] || "",
                        });
                        toast({ title: "Financial account approved" });
                      } catch (reviewError) {
                        toast({
                          title: "Approval failed",
                          description: reviewError.message,
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-red-600 hover:bg-red-50"
                    disabled={financialActingId === account.id}
                    onClick={async () => {
                      try {
                        await decideFinancialAccount(account.id, {
                          decision: "restricted",
                          reviewNotes: financialNotes[account.id] || "",
                          restrictedReason: restrictionReasons[account.id] || "",
                        });
                        toast({ title: "Financial account restricted" });
                      } catch (reviewError) {
                        toast({
                          title: "Restriction failed",
                          description: reviewError.message,
                          variant: "destructive",
                        });
                      }
                    }}
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

      <TabsContent value="skills" className="mt-0">
        {skills.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="All caught up"
            description="No pending skill categories to review."
          />
        ) : (
          <div className="space-y-3">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center gap-4 rounded-xl border border-border/50 bg-white p-4"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <Tag className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{skill.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {skill.category} · {skill.level}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSkillApprove(skill, true)}
                    size="sm"
                    variant="outline"
                    className="gap-1 text-emerald-600 hover:bg-emerald-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleSkillApprove(skill, false)}
                    size="sm"
                    variant="outline"
                    className="gap-1 text-red-600 hover:bg-red-50"
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
    </WorkspaceShell>
  );
}

function OverviewCard({ icon: Icon, title, value }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
      <div className="inline-flex rounded-2xl bg-secondary/40 p-3 text-teal-700">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 font-heading text-3xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{title}</div>
    </div>
  );
}

function QueuePreview({ title, description, items, emptyTitle }) {
  return (
    <section className="rounded-3xl border border-border/60 bg-white p-6">
      <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{emptyTitle}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/25 px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium text-foreground">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.subtitle}</div>
              </div>
              <StatusBadge status={item.status} />
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
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value || "Not provided"}</dd>
    </div>
  );
}
