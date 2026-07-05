import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

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
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-50 text-red-700 border-red-200",
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
  draft: {
    label: "Draft",
    icon: null,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

export default function StatusBadge({ status, label }) {
  const config = configs[status] || {
    label: label || status,
    icon: null,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  };
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`${config.className} gap-1 font-medium text-xs`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {label || config.label}
    </Badge>
  );
}
