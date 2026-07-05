import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Globe, Users, Clock, ArrowLeft, CheckCircle } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import BookmarkButton from "@/components/shared/BookmarkButton";
import moment from "moment";

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rsvpd, setRsvpd] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await appClient.entities.Event.get(id);
        setEvent(data);
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleRSVP = async () => {
    try {
      const me = await appClient.auth.me();
      await appClient.entities.RSVP.create({ user_id: me.id, event_id: id, status: "going" });
      setRsvpd(true);
    } catch(e) { console.error(e); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>;
  }

  if (!event) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="font-heading font-bold text-xl mb-2">Event not found</h2>
        <Link to="/events"><Button variant="outline">Back to Events</Button></Link>
      </div>
    );
  }

  const spotsLeft = event.max_attendees ? event.max_attendees - (event.current_attendees || 0) : null;
  const organization = {
    id: event.organization_id,
    verification_status: event.organization_verification_status,
    is_verified: event.is_verified,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/events" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Events
      </Link>

      <div className="bg-white rounded-2xl border border-border/50 overflow-hidden">
        <div className="aspect-[3/1] bg-gradient-to-br from-blue-50 to-teal-50 relative">
          {event.cover_image ? (
            <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="w-16 h-16 text-blue-200" />
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap gap-2 mb-4">
            <StatusBadge status={event.status || "upcoming"} />
            {event.is_free ? <StatusBadge status="free" /> : <StatusBadge status="paid" label={`$${event.price}`} />}
          </div>

          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl">{event.title}</h1>
            <BookmarkButton itemType="event" itemId={event.id} itemTitle={event.title} itemSubtitle={event.is_online ? "Online Event" : event.location} itemCategory={event.category} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">{moment(event.event_date).format("MMMM D, YYYY")}</div>
                <div className="text-muted-foreground">{moment(event.event_date).format("h:mm A")}
                  {event.end_date && ` – ${moment(event.end_date).format("h:mm A")}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                {event.is_online ? <Globe className="w-5 h-5 text-teal-600" /> : <MapPin className="w-5 h-5 text-teal-600" />}
              </div>
              <div>
                <div className="font-medium">{event.is_online ? "Online Event" : event.location || "Location TBA"}</div>
                {event.is_online && <div className="text-muted-foreground">Link provided after RSVP</div>}
              </div>
            </div>
          </div>

          {event.organization_name && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50 mb-6 text-sm">
              <span>
                Hosted by{" "}
                {event.organization_id ? (
                  <Link
                    to={`/organizations/${event.organization_id}`}
                    className="font-medium text-foreground hover:text-teal-700 hover:underline"
                  >
                    {event.organization_name}
                  </Link>
                ) : (
                  <span className="font-medium">{event.organization_name}</span>
                )}
              </span>
              <StatusBadge organization={organization} />
            </div>
          )}

          <div className="prose prose-sm max-w-none mb-8">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>

          {/* RSVP Section */}
          <div className="bg-secondary/30 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              {spotsLeft !== null && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Users className="w-4 h-4" /> {spotsLeft} spots remaining
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {event.is_free ? "This event is free to attend." : `Registration fee: $${event.price}`}
              </p>
            </div>
            {rsvpd ? (
              <Button disabled className="gap-2">
                <CheckCircle className="w-4 h-4" /> You're going!
              </Button>
            ) : (
              <Button onClick={handleRSVP} className="bg-teal-600 hover:bg-teal-700 gap-2">
                <Calendar className="w-4 h-4" /> RSVP Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
