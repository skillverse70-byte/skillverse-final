import React from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  CheckCircle,
  Clock3,
  Globe,
  MapPin,
  Users,
} from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import moment from "moment";

export default function EventCard({ event }) {
  return (
    <Link to={`/events/${event.id}`} className="group">
      <article className="overflow-hidden rounded-3xl border border-border/60 bg-white shadow-sm shadow-black/5 transition-all hover:-translate-y-1 hover:shadow-md">
        <div className="relative aspect-[2/1] bg-gradient-to-br from-sky-50 via-white to-teal-50">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Calendar className="h-12 w-12 text-sky-200" />
            </div>
          )}
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <StatusBadge status={event.status} />
            {event.viewer_rsvp_status ? (
              <StatusBadge status={event.viewer_rsvp_status} />
            ) : null}
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2 text-xs">
            {event.category ? (
              <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-muted-foreground">
                {event.category}
              </span>
            ) : null}
            {event.is_online ? (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-700">
                Online
              </span>
            ) : null}
          </div>

          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground transition-colors group-hover:text-teal-700">
              {event.title}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {event.description || "Event details will be shared on the full page."}
            </p>
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-sky-600" />
              <span>{moment(event.starts_at).format("MMM D, YYYY · h:mm A")}</span>
            </div>
            <div className="flex items-center gap-2">
              {event.is_online ? (
                <Globe className="h-4 w-4 text-teal-600" />
              ) : (
                <MapPin className="h-4 w-4 text-teal-600" />
              )}
              <span>{event.is_online ? "Online event" : event.location || "Location to be announced"}</span>
            </div>
            {event.max_attendees ? (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-600" />
                <span>
                  {event.current_attendees}/{event.max_attendees} attending
                </span>
              </div>
            ) : null}
          </div>

          {event.organization_name ? (
            <div className="flex items-center gap-2 border-t border-border/60 pt-4 text-sm text-muted-foreground">
              <span className="truncate">{event.organization_name}</span>
              {event.organization_verification_status === "verified" ? (
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
