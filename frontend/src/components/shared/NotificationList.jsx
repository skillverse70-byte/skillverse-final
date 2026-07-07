import {
  ArrowLeftRight,
  BellRing,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock3,
  MessageCircle,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { notificationTypes } from "@/lib/domain-enums";
import { cn } from "@/lib/utils";

const notificationTypeMeta = {
  [notificationTypes.auth]: {
    icon: UserRoundCheck,
    iconClassName: "text-sky-700 bg-sky-50",
    badgeClassName: "bg-sky-100 text-sky-700",
    label: "Auth",
  },
  [notificationTypes.verification]: {
    icon: ShieldCheck,
    iconClassName: "text-emerald-700 bg-emerald-50",
    badgeClassName: "bg-emerald-100 text-emerald-700",
    label: "Verification",
  },
  [notificationTypes.swap]: {
    icon: ArrowLeftRight,
    iconClassName: "text-amber-700 bg-amber-50",
    badgeClassName: "bg-amber-100 text-amber-700",
    label: "Swap",
  },
  [notificationTypes.message]: {
    icon: MessageCircle,
    iconClassName: "text-blue-700 bg-blue-50",
    badgeClassName: "bg-blue-100 text-blue-700",
    label: "Message",
  },
  [notificationTypes.session]: {
    icon: Clock3,
    iconClassName: "text-violet-700 bg-violet-50",
    badgeClassName: "bg-violet-100 text-violet-700",
    label: "Session",
  },
  [notificationTypes.course]: {
    icon: BookOpen,
    iconClassName: "text-teal-700 bg-teal-50",
    badgeClassName: "bg-teal-100 text-teal-700",
    label: "Course",
  },
  [notificationTypes.enrollment]: {
    icon: CheckCircle2,
    iconClassName: "text-emerald-700 bg-emerald-50",
    badgeClassName: "bg-emerald-100 text-emerald-700",
    label: "Enrollment",
  },
  [notificationTypes.event]: {
    icon: Calendar,
    iconClassName: "text-fuchsia-700 bg-fuchsia-50",
    badgeClassName: "bg-fuchsia-100 text-fuchsia-700",
    label: "Event",
  },
  [notificationTypes.opportunity]: {
    icon: Briefcase,
    iconClassName: "text-orange-700 bg-orange-50",
    badgeClassName: "bg-orange-100 text-orange-700",
    label: "Opportunity",
  },
  [notificationTypes.admin]: {
    icon: BellRing,
    iconClassName: "text-rose-700 bg-rose-50",
    badgeClassName: "bg-rose-100 text-rose-700",
    label: "Admin",
  },
};

function formatNotificationTimestamp(value) {
  if (!value) {
    return "Just now";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Just now";
  }

  const diffMinutes = Math.round((Date.now() - parsedDate.getTime()) / 60000);
  if (diffMinutes < 1) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffMinutes < 1440) {
    return `${Math.round(diffMinutes / 60)}h ago`;
  }
  if (diffMinutes < 10080) {
    return `${Math.round(diffMinutes / 1440)}d ago`;
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function NotificationListItem({
  notification,
  busyNotificationId,
  onOpenNotification,
  onMarkNotificationRead,
}) {
  const meta = notificationTypeMeta[notification.type] || notificationTypeMeta.admin;
  const Icon = meta.icon;
  const isBusy = busyNotificationId === notification.id;

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        notification.is_read
          ? "border-border/50 bg-white"
          : "border-teal-200 bg-teal-50/40",
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("rounded-2xl p-2.5", meta.iconClassName)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{notification.title}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.badgeClassName)}>
              {meta.label}
            </span>
            {!notification.is_read ? (
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
            ) : null}
          </div>
          {notification.message ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {notification.message}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatNotificationTimestamp(notification.created_at)}
            </span>
            {notification.action_url ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-teal-700"
                disabled={isBusy}
                onClick={() => onOpenNotification(notification)}
              >
                Open
              </Button>
            ) : null}
            {!notification.is_read ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                disabled={isBusy}
                onClick={() => onMarkNotificationRead(notification)}
              >
                Mark read
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationList({
  notifications,
  busyNotificationId,
  emptyTitle = "No notifications yet",
  emptyDescription = "New activity will show up here.",
  onOpenNotification,
  onMarkNotificationRead,
}) {
  if (!notifications.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/10 px-4 py-8 text-center">
        <div className="font-medium text-foreground">{emptyTitle}</div>
        <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <NotificationListItem
          key={notification.id}
          notification={notification}
          busyNotificationId={busyNotificationId}
          onOpenNotification={onOpenNotification}
          onMarkNotificationRead={onMarkNotificationRead}
        />
      ))}
    </div>
  );
}

