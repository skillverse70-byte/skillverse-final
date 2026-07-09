import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ExternalLink, ReceiptText, ShieldCheck } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  courseOfferingTypes,
  paymentTransactionPurposes,
  paymentTransactionStatuses,
} from "@/lib/domain-enums";

const blockedMessages = {
  organization_unverified:
    "Paid enrollment is unavailable until this organization is verified.",
  financial_setup_incomplete:
    "Paid enrollment is unavailable while the organization completes financial setup.",
  manual_closure: "The organization has closed enrollment for this course.",
};

export default function PaidEnrollmentStatus({ enrollmentGate, transaction, courseId }) {
  const isCommunityServicePayment =
    transaction?.purpose === paymentTransactionPurposes.communityServiceEnrollment ||
    transaction?.is_community_service_payment ||
    transaction?.course_program?.offering_type === courseOfferingTypes.communityService;

  if (!enrollmentGate.canEnroll) {
    return (
      <div className="mb-4 border-t border-border/60 pt-4 text-sm">
        <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          Enrollment Unavailable
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {blockedMessages[enrollmentGate.reason] ||
            "This course is not accepting paid enrollment right now."}
        </p>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="mb-4 border-t border-border/60 pt-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <ShieldCheck className="h-4 w-4 text-teal-600" />
          Secure Chapa checkout
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Your enrollment activates only after SkillVerse verifies the payment with Chapa.
        </p>
        <Link
          to={courseId ? `/payments?course=${encodeURIComponent(courseId)}` : "/payments"}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:underline"
        >
          Open payment workspace
        </Link>
      </div>
    );
  }

  const statusMessages = {
    [paymentTransactionStatuses.pending]:
      "Payment is awaiting confirmation. You can return to checkout or check its status.",
    [paymentTransactionStatuses.succeeded]:
      "Payment is verified. Your course enrollment is ready to activate.",
    [paymentTransactionStatuses.failed]:
      transaction.failure_reason || "The payment could not be completed. You can try again.",
    [paymentTransactionStatuses.cancelled]:
      "This checkout was cancelled. Start a new payment when you are ready.",
    [paymentTransactionStatuses.refunded]:
      "This payment has been refunded and cannot be used for enrollment.",
    [paymentTransactionStatuses.reversed]:
      "This payment was reversed and cannot be used for enrollment.",
  };

  return (
    <div className="mb-4 border-t border-border/60 pt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">Payment status</span>
        <StatusBadge status={transaction.status} />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {statusMessages[transaction.status] || "Payment status is being updated."}
      </p>

      {isCommunityServicePayment ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          This checkout is linked to a community-service learning offer, so service-credit
          fulfillment will follow payment verification.
        </p>
      ) : null}

      {transaction.status === paymentTransactionStatuses.pending &&
        transaction.checkout_url && (
          <a
            href={transaction.checkout_url}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:underline"
          >
            Return to Chapa checkout
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

      <Link
        to={courseId ? `/payments?course=${encodeURIComponent(courseId)}` : "/payments"}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:underline"
      >
        Open payment workspace
      </Link>

      {transaction.status === paymentTransactionStatuses.succeeded &&
        transaction.receipt_url && (
          <a
            href={transaction.receipt_url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:underline"
          >
            <ReceiptText className="h-3.5 w-3.5" />
            View Chapa receipt
          </a>
        )}
    </div>
  );
}
