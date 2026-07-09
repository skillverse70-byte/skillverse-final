import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Activity,
  BadgeCheck,
  CreditCard,
  LayoutDashboard,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import WorkspaceShell from "@/components/shared/WorkspaceShell";
import DashboardStats from "@/features/dashboard/components/DashboardStats";
import PaymentTransactionCard from "@/features/payments/components/PaymentTransactionCard";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceTab } from "@/hooks/dashboard/useWorkspaceTab";
import {
  paymentAutomationStatuses,
  paymentTransactionPurposes,
  paymentTransactionStatuses,
  roles,
} from "@/lib/domain-enums";
import {
  fetchPaymentTransactions,
  retryPaymentAutomation,
  verifyPaymentTransaction,
} from "@/services/payments/payments.service";

const learnerTabs = [
  {
    value: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Checkout and verification snapshot.",
  },
  {
    value: "transactions",
    label: "Transactions",
    icon: CreditCard,
    description: "All course checkout records.",
  },
  {
    value: "receipts",
    label: "Receipts",
    icon: ReceiptText,
    description: "Verified payments and trust records.",
  },
];

const operatorTabs = [
  {
    value: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Monetization snapshot.",
  },
  {
    value: "transactions",
    label: "Transactions",
    icon: CreditCard,
    description: "Learner checkout history.",
  },
  {
    value: "automation",
    label: "Automation",
    icon: RefreshCw,
    description: "Service-credit fulfillment state.",
  },
];

function formatActorCopy(actorRole) {
  if (actorRole === roles.organization) {
    return {
      eyebrow: "Organization payments",
      title: "Monetization Workspace",
      description:
        "Track learner checkouts, verified enrollments, and community-service automation without overcrowding the main organization dashboard.",
      emptyTitle: "No payment records yet",
      emptyDescription:
        "When learners start paid course checkouts, the monetization trail will appear here.",
    };
  }

  if (actorRole === roles.admin) {
    return {
      eyebrow: "Admin payments",
      title: "Payment Operations",
      description:
        "Inspect payment state and service-credit automation separately from finance review so operational follow-up stays focused.",
      emptyTitle: "No payment records yet",
      emptyDescription:
        "Payment transactions will appear here as organizations begin receiving paid enrollments.",
    };
  }

  return {
    eyebrow: "Learner payments",
    title: "My Payment Workspace",
    description:
      "Keep checkout progress, receipts, and verified community-service records in one place instead of digging through individual course pages.",
    emptyTitle: "No payment records yet",
    emptyDescription:
      "Your paid course checkouts, receipts, and community-service payment history will appear here.",
  };
}

function purposeLabel(value) {
  return {
    all: "All payments",
    [paymentTransactionPurposes.courseEnrollment]: "Course payments",
    [paymentTransactionPurposes.communityServiceEnrollment]: "Community service",
  }[value] || "All payments";
}

function statusLabel(value) {
  return {
    all: "All statuses",
    [paymentTransactionStatuses.pending]: "Pending",
    [paymentTransactionStatuses.succeeded]: "Verified",
    [paymentTransactionStatuses.failed]: "Failed",
    [paymentTransactionStatuses.cancelled]: "Cancelled",
  }[value] || "All statuses";
}

function automationLabel(value) {
  return {
    all: "All automation",
    [paymentAutomationStatuses.none]: "No automation",
    [paymentAutomationStatuses.pending]: "Pending",
    [paymentAutomationStatuses.completed]: "Completed",
    [paymentAutomationStatuses.failed]: "Failed",
  }[value] || "All automation";
}

export default function PaymentsPage() {
  const { actorRole } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const isLearner = actorRole === roles.regularUser;
  const tabs = isLearner ? learnerTabs : operatorTabs;
  const { activeTab, setActiveTab } = useWorkspaceTab(
    tabs.map((tab) => tab.value),
    "overview",
  );
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [purposeFilter, setPurposeFilter] = useState(searchParams.get("purpose") || "all");
  const [automationFilter, setAutomationFilter] = useState(
    searchParams.get("automation") || "all",
  );
  const courseFilter = searchParams.get("course") || "";
  const copy = formatActorCopy(actorRole);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    if (statusFilter === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", statusFilter);
    }
    if (purposeFilter === "all") {
      nextParams.delete("purpose");
    } else {
      nextParams.set("purpose", purposeFilter);
    }
    if (automationFilter === "all") {
      nextParams.delete("automation");
    } else {
      nextParams.set("automation", automationFilter);
    }
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [automationFilter, purposeFilter, searchParams, setSearchParams, statusFilter]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const records = await fetchPaymentTransactions({
          status: statusFilter,
          purpose: purposeFilter,
          automation_status: automationFilter,
          course_program_id: courseFilter || undefined,
        });
        if (!active) {
          return;
        }
        setTransactions(records);
      } catch (loadError) {
        console.error(loadError);
        if (active) {
          setError(loadError.message || "Unable to load payment records.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [automationFilter, courseFilter, purposeFilter, statusFilter]);

  const summary = useMemo(() => {
    const pending = transactions.filter(
      (item) => item.status === paymentTransactionStatuses.pending,
    ).length;
    const verified = transactions.filter(
      (item) => item.status === paymentTransactionStatuses.succeeded,
    ).length;
    const failed = transactions.filter(
      (item) => item.status === paymentTransactionStatuses.failed,
    ).length;
    const communityService = transactions.filter(
      (item) =>
        item.purpose === paymentTransactionPurposes.communityServiceEnrollment ||
        item.is_community_service_payment,
    ).length;
    const receiptsReady = transactions.filter((item) => Boolean(item.receipt_url)).length;
    const automationFailures = transactions.filter(
      (item) => item.automation_status === paymentAutomationStatuses.failed,
    ).length;
    const automationPending = transactions.filter(
      (item) => item.automation_status === paymentAutomationStatuses.pending,
    ).length;

    return {
      pending,
      verified,
      failed,
      communityService,
      receiptsReady,
      automationFailures,
      automationPending,
    };
  }, [transactions]);

  const statsCards = isLearner
    ? [
        {
          icon: CreditCard,
          label: "Pending checkouts",
          count: summary.pending,
          description: "Return to checkout or verify status.",
          color: "bg-amber-50 text-amber-600",
          onClick: () => {
            setActiveTab("transactions");
            setStatusFilter(paymentTransactionStatuses.pending);
          },
        },
        {
          icon: BadgeCheck,
          label: "Verified payments",
          count: summary.verified,
          description: "Ready enrollments and completed checkouts.",
          color: "bg-emerald-50 text-emerald-600",
          onClick: () => {
            setActiveTab("receipts");
            setStatusFilter(paymentTransactionStatuses.succeeded);
          },
        },
        {
          icon: ShieldCheck,
          label: "Community service",
          count: summary.communityService,
          description: "Payments connected to service-credit learning offers.",
          color: "bg-teal-50 text-teal-600",
          onClick: () => {
            setActiveTab("transactions");
            setPurposeFilter(paymentTransactionPurposes.communityServiceEnrollment);
          },
        },
        {
          icon: ReceiptText,
          label: "Receipts ready",
          count: summary.receiptsReady,
          description: "Open receipts and trust records here.",
          color: "bg-blue-50 text-blue-600",
          onClick: () => setActiveTab("receipts"),
        },
      ]
    : [
        {
          icon: CreditCard,
          label: "Pending payments",
          count: summary.pending,
          description: "Learner checkouts awaiting completion.",
          color: "bg-amber-50 text-amber-600",
          onClick: () => {
            setActiveTab("transactions");
            setStatusFilter(paymentTransactionStatuses.pending);
          },
        },
        {
          icon: BadgeCheck,
          label: "Verified payments",
          count: summary.verified,
          description: "Transactions already confirmed server-side.",
          color: "bg-emerald-50 text-emerald-600",
          onClick: () => {
            setActiveTab("transactions");
            setStatusFilter(paymentTransactionStatuses.succeeded);
          },
        },
        {
          icon: Activity,
          label: "Automation failures",
          count: summary.automationFailures,
          description: "Community-service records that need retry.",
          color: "bg-rose-50 text-rose-600",
          onClick: () => {
            setActiveTab("automation");
            setAutomationFilter(paymentAutomationStatuses.failed);
          },
        },
        {
          icon: ShieldCheck,
          label: "Community service",
          count: summary.communityService,
          description: "Transactions tied to service-credit offers.",
          color: "bg-teal-50 text-teal-600",
          onClick: () => {
            setActiveTab("automation");
            setPurposeFilter(paymentTransactionPurposes.communityServiceEnrollment);
          },
        },
      ];

  const recentTransactions = transactions.slice(0, 4);
  const receiptTransactions = transactions.filter(
    (item) =>
      item.status === paymentTransactionStatuses.succeeded ||
      item.receipt_url ||
      item.service_credit_record,
  );
  const automationTransactions = transactions.filter(
    (item) =>
      item.purpose === paymentTransactionPurposes.communityServiceEnrollment ||
      item.is_community_service_payment ||
      item.automation_status !== paymentAutomationStatuses.none,
  );

  const handleVerify = async (transaction) => {
    setBusyAction(`verify-${transaction.tx_ref}`);
    try {
      const updated = await verifyPaymentTransaction(transaction.tx_ref);
      setTransactions((current) =>
        current.map((item) => (item.tx_ref === updated.tx_ref ? updated : item)),
      );
      toast({
        title:
          updated.status === paymentTransactionStatuses.succeeded
            ? "Payment verified"
            : "Payment is still pending",
        description:
          updated.status === paymentTransactionStatuses.succeeded
            ? "The payment is confirmed and the course is ready to activate."
            : "Complete the checkout in Chapa, then check again.",
      });
    } catch (verifyError) {
      console.error(verifyError);
      toast({
        title: "Unable to verify payment",
        description: verifyError.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyAction("");
    }
  };

  const handleRetryAutomation = async (transaction) => {
    setBusyAction(`retry-${transaction.tx_ref}`);
    try {
      const updated = await retryPaymentAutomation(transaction.tx_ref);
      setTransactions((current) =>
        current.map((item) => (item.tx_ref === updated.tx_ref ? updated : item)),
      );
      toast({
        title: "Automation retried",
        description:
          updated.automation_status === paymentAutomationStatuses.completed
            ? "The post-payment automation completed successfully."
            : "The retry was submitted. Refresh this workspace if more updates are needed.",
      });
    } catch (retryError) {
      console.error(retryError);
      toast({
        title: "Unable to retry automation",
        description: retryError.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyAction("");
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <WorkspaceShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      value={activeTab}
      onValueChange={setActiveTab}
      tabs={tabs}
      showTabDescriptions={false}
      actions={
        <>
          {isLearner ? (
            <Link to="/dashboard?tab=learning">
              <Button variant="outline">Open dashboard</Button>
            </Link>
          ) : actorRole === roles.organization ? (
            <Link to="/org?tab=setup">
              <Button variant="outline">Open finance setup</Button>
            </Link>
          ) : (
            <Link to="/admin?tab=financial">
              <Button variant="outline">Open finance review</Button>
            </Link>
          )}
        </>
      }
    >
      <TabsContent value="overview" className="mt-0 space-y-6">
        <DashboardStats stats={statsCards} />

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-teal-600" />
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Payment focus
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLearner
                ? "Use this workspace to finish checkouts, confirm payment status, and collect receipts without reopening every course."
                : "Use this workspace to inspect payment state and service-credit fulfillment without mixing it into broader dashboard operations."}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <QuickMetric label="Pending" value={summary.pending} />
              <QuickMetric label="Verified" value={summary.verified} />
              <QuickMetric label="Community service" value={summary.communityService} />
              <QuickMetric
                label={isLearner ? "Receipts ready" : "Automation pending"}
                value={isLearner ? summary.receiptsReady : summary.automationPending}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <FilterPill
                active={statusFilter === "all"}
                label="Reset filters"
                onClick={() => {
                  setStatusFilter("all");
                  setPurposeFilter("all");
                  setAutomationFilter("all");
                }}
              />
              {courseFilter ? (
                <FilterPill
                  active
                  label={`Course #${courseFilter}`}
                  onClick={() => {
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.delete("course");
                    setSearchParams(nextParams, { replace: true });
                  }}
                />
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Attention queue
              </h2>
            </div>
            <div className="mt-5 space-y-3">
              <AttentionRow
                label="Payment status filter"
                value={statusLabel(statusFilter)}
                actionLabel="Open transactions"
                onAction={() => setActiveTab("transactions")}
              />
              <AttentionRow
                label="Purpose filter"
                value={purposeLabel(purposeFilter)}
                actionLabel="Adjust filters"
                onAction={() => setActiveTab(isLearner ? "transactions" : "automation")}
              />
              <AttentionRow
                label={isLearner ? "Receipts ready" : "Automation failures"}
                value={String(isLearner ? summary.receiptsReady : summary.automationFailures)}
                actionLabel={isLearner ? "Open receipts" : "Open automation"}
                onAction={() => setActiveTab(isLearner ? "receipts" : "automation")}
              />
            </div>
          </section>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={copy.emptyTitle}
            description={copy.emptyDescription}
            actionLabel={isLearner ? "Browse courses" : "Open dashboard"}
            onAction={() => window.location.assign(isLearner ? "/courses" : actorRole === roles.organization ? "/org" : "/admin")}
          />
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  Recent activity
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The latest payment records stay visible here, while full history lives in the transaction tab.
                </p>
              </div>
              <Button variant="outline" onClick={() => setActiveTab("transactions")}>
                Open all transactions
              </Button>
            </div>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <PaymentTransactionCard
                  key={transaction.tx_ref}
                  actorRole={actorRole}
                  transaction={transaction}
                  onVerify={handleVerify}
                  onRetryAutomation={handleRetryAutomation}
                  busyAction={busyAction}
                  compact
                />
              ))}
            </div>
          </section>
        )}
      </TabsContent>

      <TabsContent value="transactions" className="mt-0 space-y-6">
        <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Transaction filters
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Filter by lifecycle state and payment purpose without turning this page into a long list of ungrouped records.
              </p>
            </div>

            <div className="space-y-4">
              <FilterGroup
                title="Status"
                options={[
                  { value: "all", label: "All statuses" },
                  { value: paymentTransactionStatuses.pending, label: "Pending" },
                  { value: paymentTransactionStatuses.succeeded, label: "Verified" },
                  { value: paymentTransactionStatuses.failed, label: "Failed" },
                  { value: paymentTransactionStatuses.cancelled, label: "Cancelled" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <FilterGroup
                title="Purpose"
                options={[
                  { value: "all", label: "All payments" },
                  {
                    value: paymentTransactionPurposes.courseEnrollment,
                    label: "Course payments",
                  },
                  {
                    value: paymentTransactionPurposes.communityServiceEnrollment,
                    label: "Community service",
                  },
                ]}
                value={purposeFilter}
                onChange={setPurposeFilter}
              />
              {!isLearner ? (
                <FilterGroup
                  title="Automation"
                  options={[
                    { value: "all", label: "All automation" },
                    { value: paymentAutomationStatuses.pending, label: "Pending" },
                    { value: paymentAutomationStatuses.completed, label: "Completed" },
                    { value: paymentAutomationStatuses.failed, label: "Failed" },
                  ]}
                  value={automationFilter}
                  onChange={setAutomationFilter}
                />
              ) : null}
            </div>
          </div>
        </section>

        {transactions.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No transactions match these filters"
            description="Adjust the filter pills to reopen the wider payment history."
            actionLabel="Reset filters"
            onAction={() => {
              setStatusFilter("all");
              setPurposeFilter("all");
              setAutomationFilter("all");
            }}
          />
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <PaymentTransactionCard
                key={transaction.tx_ref}
                actorRole={actorRole}
                transaction={transaction}
                onVerify={handleVerify}
                onRetryAutomation={handleRetryAutomation}
                busyAction={busyAction}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="receipts" className="mt-0 space-y-6">
        {receiptTransactions.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No receipts or verified records yet"
            description="Receipts, successful checkouts, and service-credit records will appear here after payment verification completes."
          />
        ) : (
          <div className="space-y-4">
            {receiptTransactions.map((transaction) => (
              <PaymentTransactionCard
                key={transaction.tx_ref}
                actorRole={actorRole}
                transaction={transaction}
                onVerify={handleVerify}
                onRetryAutomation={handleRetryAutomation}
                busyAction={busyAction}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="automation" className="mt-0 space-y-6">
        <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-teal-600" />
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Community-service automation
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            This lane isolates post-payment fulfillment so service-credit issues do not get buried inside finance setup or general organization/admin dashboards.
          </p>
        </section>

        {automationTransactions.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="No community-service automation records yet"
            description="Transactions that trigger service-credit workflows will appear here once those offers start receiving paid enrollments."
          />
        ) : (
          <div className="space-y-4">
            {automationTransactions.map((transaction) => (
              <PaymentTransactionCard
                key={transaction.tx_ref}
                actorRole={actorRole}
                transaction={transaction}
                onVerify={handleVerify}
                onRetryAutomation={handleRetryAutomation}
                busyAction={busyAction}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </WorkspaceShell>
  );
}

function QuickMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-heading text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function AttentionRow({ label, value, actionLabel, onAction }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="mt-1 break-words text-sm text-muted-foreground">{value}</div>
        </div>
        {actionLabel ? (
          <Button variant="outline" className="shrink-0" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function FilterGroup({ title, options, value, onChange }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <FilterPill
            key={option.value}
            active={value === option.value}
            label={option.label}
            onClick={() => onChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

function FilterPill({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-teal-600 text-white"
          : "border border-border/60 bg-white text-muted-foreground hover:bg-secondary"
      }`}
    >
      {label}
    </button>
  );
}
