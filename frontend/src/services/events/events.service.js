import { ApiError, apiRequest } from "@/lib/http-client";
import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";

function normalizeOrganization(organization) {
  if (!organization) {
    return null;
  }

  return {
    id: organization.id,
    name: organization.name || "",
    type: organization.type || "",
    verification_status: organization.verification_status || "unverified",
  };
}

function normalizeEvent(event) {
  const organization = normalizeOrganization(event.organization);

  return {
    ...event,
    organization,
    organization_id: organization?.id ?? null,
    organization_name: organization?.name ?? "",
    organization_verification_status:
      organization?.verification_status || "unverified",
    title: event.title || "",
    description: event.description || "",
    category: event.category || "",
    location: event.location || "",
    is_online: event.is_online ?? false,
    cover_image_url: event.cover_image_url || "",
    meeting_url: event.meeting_url || "",
    max_attendees: event.max_attendees ?? null,
    current_attendees: event.current_attendees ?? 0,
    spots_remaining: event.spots_remaining ?? null,
    rsvp_open: event.rsvp_open ?? true,
    status: event.status || "upcoming",
    starts_at: event.starts_at || null,
    ends_at: event.ends_at || null,
    viewer_rsvp_status: event.viewer_rsvp_status || null,
    tags: Array.isArray(event.tags) ? event.tags : [],
  };
}

function normalizeRsvp(rsvp) {
  return {
    ...rsvp,
    status: rsvp.status || "going",
    event_id: rsvp.event_id ?? null,
    event_title: rsvp.event_title || "",
    organization_id: rsvp.organization_id ?? null,
    organization_name: rsvp.organization_name || "",
    starts_at: rsvp.starts_at || null,
    ends_at: rsvp.ends_at || null,
  };
}

export async function fetchEvents(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.organizationId) {
    searchParams.set("organization_id", params.organizationId);
  }
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.category) {
    searchParams.set("category", params.category);
  }

  const path = `/events/${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const events = await apiRequest(path, { method: "GET" });
  return events.map(normalizeEvent);
}

export async function fetchEventDetail(eventId, { authenticated = false } = {}) {
  const request = authenticated ? authenticatedApiRequest : apiRequest;
  const event = await request(`/events/${eventId}/`, { method: "GET" });
  return normalizeEvent(event);
}

export async function submitEventRsvp(eventId, statusValue = "going") {
  const rsvp = await authenticatedApiRequest(`/events/${eventId}/rsvp/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: statusValue }),
  });
  return normalizeRsvp(rsvp);
}

export async function fetchMyEventRsvps() {
  const rsvps = await authenticatedApiRequest("/events/rsvps/", {
    method: "GET",
  });
  return rsvps.map(normalizeRsvp);
}

export { ApiError };
