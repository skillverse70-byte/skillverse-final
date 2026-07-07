import React, { useState } from "react";
import { Bell, BellRing, Wifi, WifiOff } from "lucide-react";
import NotificationList from "@/components/shared/NotificationList";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { cn } from "@/lib/utils";

export default function NotificationCenter({
  buttonVariant = "ghost",
  buttonSize = "icon",
  className = "",
  showLabel = false,
}) {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadNotificationCount,
    notificationConnectionState,
    busyNotificationId,
    markingAll,
    openNotification,
    markNotificationRead,
    markAllAsRead,
  } = useNotifications();

  const connectionLabel =
    notificationConnectionState === "connected"
      ? "Live"
      : notificationConnectionState === "connecting"
        ? "Syncing"
        : "Offline";
  const connectionIcon =
    notificationConnectionState === "connected" ? Wifi : WifiOff;
  const ConnectionIcon = connectionIcon;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          className={cn(showLabel ? "relative gap-2 px-3" : "relative", className)}
        >
          {unreadNotificationCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {showLabel ? <span>Notifications</span> : null}
          {unreadNotificationCount > 0 ? (
            <span
              className={cn(
                "absolute min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white",
                showLabel ? "-right-2 -top-2" : "-right-1 -top-1",
              )}
            >
              {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription>
                Stored activity updates with deep links into the relevant workflow.
              </SheetDescription>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/20 px-3 py-1 text-xs font-medium text-muted-foreground">
              <ConnectionIcon className="h-3.5 w-3.5" />
              {connectionLabel}
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {unreadNotificationCount > 0
              ? `${unreadNotificationCount} unread`
              : "All caught up"}
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

        <ScrollArea className="mt-4 h-[calc(100vh-14rem)] pr-3">
          <NotificationList
            notifications={notifications}
            busyNotificationId={busyNotificationId}
            emptyTitle="No notifications yet"
            emptyDescription="When swaps, messages, enrollments, reviews, or approvals change, they will land here."
            onOpenNotification={(notification) =>
              openNotification(notification, { close: setOpen })
            }
            onMarkNotificationRead={markNotificationRead}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

