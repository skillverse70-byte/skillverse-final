import React from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  CreditCard,
  ExternalLink,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  courseOfferingTypes,
  paymentAutomationStatuses,
  paymentTransactionPurposes,
  paymentTransactionStatuses,
  roles,
} from "@/lib/domain-enums";

function formatMoney(amount, currency = "ETB") {
  const numericAmount = Number(amount || 0);
  return `${currency} ${numericAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function purposeLabel(purpose) {
  return {
    [paymentTransactionPurposes.courseEnrollment]: "Course enrollment",
    [paymentTransactionPurposes.communityServiceEnrollment]: "Community service",
  }[purpose] || "Payment";
}

function automationTone(status) {
  return {
    [paymentAutomationStatuses.completed]: "ready",
    [paymentAutomationStatuses.pending]: "pending",
    [paymentAutomationStatuses.failed]: "restricted",
  }[status] || "inactive";
}

function automationLabel(status) {
  return {
    [paymentAutomationStatuses.none]: "No automation",
    [paymentAutomationStatuses.pending]: "Automation pending",
    [paymentAutomationStatuses.completed]: "Automation completed",
    [paymentAutomationStatuses.failed]: "Automation failed",
  }[status] || "Automation";
}

export default function PaymentTransactionCard({
  actorRole,
  transaction,
  onVerify,
  onRetryAutomation,
  busyAction = "",
  compact = false,
}) {
  const isLearner = actorRole === roles.regularUser;
  const canRetryAutomation =
    actorRole !== roles.regularUser &&
    transaction.automation_status === paymentAutomationStatuses.failed;
  const canVerify =
    isLearner && transaction.status === paymentTransactionStatuses.pending;
  const title = transaction.course_program?.title || "Course payment";
  const isCommunityService =
    transaction.purpose === paymentTransactionPurposes.communityServiceEnrollment ||
    transaction.course_program?.offering_type === courseOfferingTypes.communityService ||
    transaction.is_community_service_payment;

  return (
    <article className="overflow-hidden rounded-3xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={transaction.status} />
            <StatusBadge
              status={automationTone(transaction.automation_status)}
              label={automationLabel(transaction.automation_status)}
            />
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {purposeLabel(transaction.purpose)}
            </span>
            {isCommunityService ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                Service credit flow
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate font-heading text-lg font-semibold text-foreground">
                {title}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{formatMoney(transaction.amount, transaction.currency)}</span>
                {transaction.organization?.name ? (
                  <span className="truncate">Org: {transaction.organization.name}</span>
                ) : null}
                {!isLearner && transaction.user?.full_name ? (
                  <span className="truncate">Learner: {transaction.user.full_name}</span>
                ) : null}
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-3 text-right">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Transaction ref
              </div>
              <div className="mt-1 max-w-[220px] break-all text-xs font-medium text-foreground">
                {transaction.tx_ref}
              </div>
            </div>
          </div>

          <div
            className={`mt-4 grid gap-3 ${
              compact ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"
            }`}
          >
            <MetaBlock label="Started" value={formatDateTime(transaction.created_at)} />
            <MetaBlock
              label="Verification"
              value={transaction.verified_at ? formatDateTime(transaction.verified_at) : "Awaiting verification"}
            />
            <MetaBlock
              label="Fulfillment"
              value={transaction.fulfilled_at ? formatDateTime(transaction.fulfilled_at) : "Not fulfilled yet"}
            />
            <MetaBlock
              label="Service credit"
              value={
                transaction.service_credit_record?.title ||
                (isCommunityService ? "Pending issuance" : "Not applicable")
              }
            />
          </div>

          {transaction.automation_error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {transaction.automation_error}
            </div>
          ) : null}

          {isCommunityService && transaction.course_program?.service_credit_hours ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
              {transaction.course_program.service_credit_hours} service-credit hours are attached to
              this learning offer.
            </div>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-2 lg:w-56">
          {transaction.course_program?.id ? (
            <Link to={`/courses/${transaction.course_program.id}`}>
              <Button variant="outline" className="w-full justify-between">
                Open course
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          ) : null}

          {transaction.checkout_url &&
          transaction.status === paymentTransactionStatuses.pending &&
          isLearner ? (
            <a href={transaction.checkout_url} target="_blank" rel="noreferrer">
              <Button variant="outline" className="w-full justify-between">
                Return to checkout
                <CreditCard className="h-4 w-4" />
              </Button>
            </a>
          ) : null}

          {canVerify ? (
            <Button
              className="w-full justify-between bg-teal-600 hover:bg-teal-700"
              disabled={busyAction === `verify-${transaction.tx_ref}`}
              onClick={() => onVerify?.(transaction)}
            >
              {busyAction === `verify-${transaction.tx_ref}` ? "Checking..." : "Check status"}
              <RefreshCw
                className={`h-4 w-4 ${
                  busyAction === `verify-${transaction.tx_ref}` ? "animate-spin" : ""
                }`}
              />
            </Button>
          ) : null}

          {transaction.receipt_url ? (
            <a href={transaction.receipt_url} target="_blank" rel="noreferrer">
              <Button variant="outline" className="w-full justify-between">
                View receipt
                <ReceiptText className="h-4 w-4" />
              </Button>
            </a>
          ) : null}

          {canRetryAutomation ? (
            <Button
              variant="outline"
              className="w-full justify-between"
              disabled={busyAction === `retry-${transaction.tx_ref}`}
              onClick={() => onRetryAutomation?.(transaction)}
            >
              {busyAction === `retry-${transaction.tx_ref}` ? "Retrying..." : "Retry automation"}
              <RefreshCw
                className={`h-4 w-4 ${
                  busyAction === `retry-${transaction.tx_ref}` ? "animate-spin" : ""
                }`}
              />
            </Button>
          ) : null}

          {transaction.service_credit_record ? (
            <Link to="/certificates?tab=records">
              <Button variant="outline" className="w-full justify-between">
                Open trust records
                <BadgeCheck className="h-4 w-4" />
              </Button>
            </Link>
          ) : null}

          {!isLearner && transaction.automation_status === paymentAutomationStatuses.completed ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="h-4 w-4" />
                Automation settled
              </div>
              <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                This payment already completed its post-payment workflow.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function MetaBlock({ label, value }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
