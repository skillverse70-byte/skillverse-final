import React from "react";
import { BellRing } from "lucide-react";
import NotificationList from "@/components/shared/NotificationList";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/notifications/useNotifications";

export default function NotificationFeedPanel({
  title = "Recent notifications",
  description = "Important workflow changes across your workspace.",
  limit = 4,
  emptyTitle = "No notifications yet",
  emptyDescription = "Updates will appear here as activity happens.",
}) {
  const {
    notifications,
    unreadNotificationCount,
    busyNotificationId,
    markingAll,
    openNotification,
    markNotificationRead,
    markAllAsRead,
  } = useNotifications({ limit });

  return (
    <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-amber-600" />
            <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={markingAll || unreadNotificationCount <= 0}
          onClick={() => markAllAsRead()}
        >
          Mark all read
        </Button>
      </div>

      <div className="mt-5">
        <NotificationList
          notifications={notifications}
          busyNotificationId={busyNotificationId}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          onOpenNotification={openNotification}
          onMarkNotificationRead={markNotificationRead}
        />
      </div>
    </section>
  );
}

