import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock3,
  Globe,
  MapPin,
  Users,
} from "lucide-react";
import BookmarkButton from "@/components/shared/BookmarkButton";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { roles, rsvpStatuses } from "@/lib/domain-enums";
import {
  ApiError,
  fetchEventDetail,
  submitEventRsvp,
} from "@/services/events/events.service";
import moment from "moment";

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, actorRole, navigateToLogin } = useAuth();

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchEventDetail(id, { authenticated: isAuthenticated });
        if (active) {
          setEvent(data);
        }
      } catch (error) {
        console.error(error);
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
  }, [id, isAuthenticated]);

  const handleRsvp = async (statusValue) => {
    if (!isAuthenticated) {
      navigateToLogin();
      return;
    }

    if (actorRole !== roles.regularUser) {
      toast({
        title: "RSVP is for regular users",
        description:
          "Organizations and admins can browse events, but only regular users can RSVP in V1.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const rsvp = await submitEventRsvp(id, statusValue);
      const nextEvent = await fetchEventDetail(id, { authenticated: true });
      setEvent(nextEvent);
      toast({
        title:
          rsvp.status === rsvpStatuses.going
            ? "You're on the list"
            : rsvp.status === rsvpStatuses.interested
              ? "Marked as interested"
              : "RSVP updated",
        description:
          rsvp.status === rsvpStatuses.cancelled
            ? "Your RSVP was cancelled."
            : "Your event participation status was updated.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to update RSVP",
        description:
          error instanceof ApiError
            ? error.message
            : "Something went wrong while updating your RSVP.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <EmptyState
          icon={Calendar}
          title="Event not found"
          description="This event may have been removed or is no longer public."
          actionLabel="Back to Events"
          onAction={() => {
            window.location.href = "/events";
          }}
        />
      </div>
    );
  }

  const isRegularUser = actorRole === roles.regularUser;
  const currentRsvpStatus = event.viewer_rsvp_status;
  const spotsLeft = event.spots_remaining;
  const canShowRsvpActions = !isAuthenticated || isRegularUser;
  const eventLocationLabel = event.is_online
    ? "Online event"
    : event.location || "Location to be announced";
  const meetingAccessMessage =
    event.is_online && !event.meeting_url
      ? "RSVP with Going to unlock the session link."
      : null;
  const actionSummary = useMemo(() => {
    if (!isAuthenticated) {
      return "Sign in as a regular user to RSVP.";
    }
    if (!isRegularUser) {
      return "Only regular users can RSVP in V1.";
    }
    if (currentRsvpStatus === rsvpStatuses.going) {
      return "You're marked as going.";
    }
    if (currentRsvpStatus === rsvpStatuses.interested) {
      return "You're following this event.";
    }
    return "Reserve your spot or save your interest.";
  }, [currentRsvpStatus, isAuthenticated, isRegularUser]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        to="/events"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Events
      </Link>

      <div className="overflow-hidden rounded-3xl border border-border/60 bg-white shadow-sm shadow-black/5">
        <div className="relative aspect-[3/1] bg-gradient-to-br from-sky-50 via-white to-teal-50">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Calendar className="h-16 w-16 text-sky-200" />
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap gap-2">
            <StatusBadge status={event.status} />
            {currentRsvpStatus ? (
              <StatusBadge status={currentRsvpStatus} />
            ) : null}
          </div>

          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                {event.title}
              </h1>
              {event.category ? (
                <p className="mt-2 text-sm text-muted-foreground">{event.category}</p>
              ) : null}
            </div>
            <BookmarkButton
              itemType="event"
              itemId={event.id}
              itemTitle={event.title}
              itemSubtitle={event.is_online ? "Online Event" : event.location}
              itemCategory={event.category}
            />
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl bg-secondary/20 p-4 text-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50">
                <Clock3 className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <div className="font-medium">
                  {moment(event.starts_at).format("MMMM D, YYYY")}
                </div>
                <div className="text-muted-foreground">
                  {moment(event.starts_at).format("h:mm A")}
                  {event.ends_at ? ` - ${moment(event.ends_at).format("h:mm A")}` : ""}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-secondary/20 p-4 text-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                {event.is_online ? (
                  <Globe className="h-5 w-5 text-teal-600" />
                ) : (
                  <MapPin className="h-5 w-5 text-teal-600" />
                )}
              </div>
              <div>
                <div className="font-medium">{eventLocationLabel}</div>
                <div className="text-muted-foreground">
                  {meetingAccessMessage || "Event format and access details."}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-secondary/20 p-4 text-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="font-medium">
                  {event.max_attendees
                    ? `${event.current_attendees}/${event.max_attendees} spots taken`
                    : `${event.current_attendees} RSVPs`}
                </div>
                <div className="text-muted-foreground">
                  {spotsLeft !== null ? `${spotsLeft} spots remaining` : "Open attendance"}
                </div>
              </div>
            </div>
          </div>

          {event.organization ? (
            <div className="mb-6 flex items-center gap-2 rounded-2xl bg-secondary/40 p-4 text-sm">
              <span>
                Hosted by{" "}
                <Link
                  to={`/organizations/${event.organization_id}`}
                  className="font-medium text-foreground hover:text-teal-700 hover:underline"
                >
                  {event.organization_name}
                </Link>
              </span>
              <StatusBadge organization={event.organization} />
            </div>
          ) : null}

          <div className="mb-8 prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap leading-relaxed text-foreground">
              {event.description}
            </p>
          </div>

          <div className="rounded-3xl border border-border/60 bg-secondary/20 p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  RSVP
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{actionSummary}</p>
                {event.is_online && event.meeting_url ? (
                  <a
                    href={event.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex text-sm font-medium text-teal-700 hover:text-teal-800"
                  >
                    Open event link
                  </a>
                ) : null}
              </div>

              {canShowRsvpActions ? (
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => handleRsvp(rsvpStatuses.going)}
                    className="gap-2 bg-teal-600 hover:bg-teal-700"
                    disabled={submitting || currentRsvpStatus === rsvpStatuses.going}
                  >
                    <Calendar className="h-4 w-4" />
                    {currentRsvpStatus === rsvpStatuses.going ? "You're going" : "RSVP going"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRsvp(rsvpStatuses.interested)}
                    disabled={submitting || currentRsvpStatus === rsvpStatuses.interested}
                  >
                    Interested
                  </Button>
                  {isAuthenticated && currentRsvpStatus ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleRsvp(rsvpStatuses.cancelled)}
                      disabled={submitting || currentRsvpStatus === rsvpStatuses.cancelled}
                    >
                      Cancel RSVP
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-muted-foreground">
                  Regular users can RSVP from this page.
                </div>
              )}
            </div>
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-4 text-sm">
              <div className="font-medium text-foreground">Verified participation path</div>
              <p className="mt-2 text-muted-foreground">
                After attendance is recorded, verified organizations can issue service-credit records or participation certificates tied to this event.
              </p>
              <Link to="/certificates" className="mt-3 inline-flex text-sm font-medium text-teal-700 hover:text-teal-800">
                Open certificates
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
