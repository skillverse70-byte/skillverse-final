import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertCircle, Calendar } from "lucide-react";
import { getOrganizationTrustBadgeState } from "@/lib/trust-state";

const configs = {
  verified: {
    label: "Verified",
    icon: CheckCircle,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  unverified: {
    label: "Unverified",
    icon: AlertCircle,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  going: {
    label: "Going",
    icon: CheckCircle,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  interested: {
    label: "Interested",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  not_started: {
    label: "Not Started",
    icon: Clock,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  ready: {
    label: "Ready",
    icon: CheckCircle,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  restricted: {
    label: "Restricted",
    icon: XCircle,
    className: "bg-red-50 text-red-700 border-red-200",
  },
  planned: {
    label: "Planned",
    icon: Calendar,
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle,
    className: "bg-teal-50 text-teal-700 border-teal-200",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  applied: {
    label: "Applied",
    icon: Clock,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  shortlisted: {
    label: "Shortlisted",
    icon: CheckCircle,
    className: "bg-teal-50 text-teal-700 border-teal-200",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-50 text-red-700 border-red-200",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  free: {
    label: "Free",
    icon: null,
    className: "bg-teal-50 text-teal-700 border-teal-200",
  },
  paid: {
    label: "Paid",
    icon: null,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  open: {
    label: "Open",
    icon: null,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  closed: {
    label: "Closed",
    icon: null,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  filled: {
    label: "Filled",
    icon: CheckCircle,
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  hired: {
    label: "Hired",
    icon: CheckCircle,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  withdrawn: {
    label: "Withdrawn",
    icon: XCircle,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  enrollment_unavailable: {
    label: "Enrollment Unavailable",
    icon: XCircle,
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
  upcoming: {
    label: "Upcoming",
    icon: Clock,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  live: {
    label: "Live Now",
    icon: null,
    className: "bg-red-50 text-red-600 border-red-200",
  },
  ongoing: {
    label: "Live Now",
    icon: null,
    className: "bg-red-50 text-red-600 border-red-200",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  submitted: {
    label: "Submitted",
    icon: Clock,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  reviewing: {
    label: "Under Review",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  interview: {
    label: "Interview",
    icon: null,
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  offered: {
    label: "Offered",
    icon: CheckCircle,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  active: {
    label: "Active",
    icon: null,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  succeeded: {
    label: "Payment Verified",
    icon: CheckCircle,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  failed: {
    label: "Payment Failed",
    icon: XCircle,
    className: "bg-red-50 text-red-700 border-red-200",
  },
  refunded: {
    label: "Refunded",
    icon: AlertCircle,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  reversed: {
    label: "Reversed",
    icon: AlertCircle,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  draft: {
    label: "Draft",
    icon: null,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

export default function StatusBadge({ status, label, organization }) {
  const trustState = organization ? getOrganizationTrustBadgeState(organization) : null;
  const resolvedStatus = trustState?.status || status;
  const resolvedLabel = trustState?.label || label;
  const config = configs[status] || {
    label: resolvedLabel || resolvedStatus,
    icon: null,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  };
  const finalConfig = configs[resolvedStatus] || config;
  const Icon = finalConfig.icon;

  return (
    <Badge
      variant="outline"
      className={`${finalConfig.className} gap-1 font-medium text-xs`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {resolvedLabel || finalConfig.label}
    </Badge>
  );
}
