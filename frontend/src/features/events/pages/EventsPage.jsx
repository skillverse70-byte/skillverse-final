import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Input } from "@/components/ui/input";
import {
  Search,
  Calendar,
  MapPin,
  Globe,
  Users,
  Clock,
  CheckCircle,
} from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import moment from "moment";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await appClient.entities.Event.list("-event_date", 50);
        setEvents(data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = events.filter(
    (e) => !search || e.title?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl text-foreground mb-2">
          Events
        </h1>
        <p className="text-muted-foreground">
          Workshops, meetups, and learning events from the community.
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events yet"
          description="Check back soon! Organizations post events regularly."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((event) => (
            <Link key={event.id} to={`/events/${event.id}`}>
              <div className="bg-white rounded-2xl border border-border/50 overflow-hidden card-hover">
                <div className="aspect-[2/1] bg-gradient-to-br from-blue-50 to-teal-50 relative">
                  {event.cover_image ? (
                    <img
                      src={event.cover_image}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar className="w-10 h-10 text-blue-200" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <StatusBadge status={event.status || "upcoming"} />
                    {event.is_free && <StatusBadge status="free" />}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    {moment(event.event_date).format("MMM D, YYYY · h:mm A")}
                  </div>
                  <h3 className="font-heading font-semibold text-base mb-2 line-clamp-2">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    {event.is_online ? (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" /> Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />{" "}
                        {event.location || "TBA"}
                      </span>
                    )}
                    {event.max_attendees && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />{" "}
                        {event.current_attendees || 0}/{event.max_attendees}
                      </span>
                    )}
                  </div>
                  {event.organization_name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {event.organization_name}
                      {event.is_verified && (
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                      )}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
