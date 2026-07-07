import { ApiError, apiRequest } from "@/lib/http-client";
import { normalizeRelevanceSignals } from "@/lib/relevance-signals";
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
    total_rsvp_count: event.total_rsvp_count ?? 0,
    interested_count: event.interested_count ?? 0,
    cancelled_count: event.cancelled_count ?? 0,
    attended_count: event.attended_count ?? 0,
    spots_remaining: event.spots_remaining ?? null,
    rsvp_open: event.rsvp_open ?? true,
    status: event.status || "upcoming",
    starts_at: event.starts_at || null,
    ends_at: event.ends_at || null,
    viewer_rsvp_status: event.viewer_rsvp_status || null,
    tags: Array.isArray(event.tags) ? event.tags : [],
    field_signals: Array.isArray(event.field_signals) ? event.field_signals : [],
    related_skills: Array.isArray(event.related_skills) ? event.related_skills : [],
    related_course_ids: Array.isArray(event.related_course_ids) ? event.related_course_ids : [],
    participation_signals: Array.isArray(event.participation_signals)
      ? event.participation_signals
      : [],
    relevance_signals: normalizeRelevanceSignals(event.relevance_signals, {
      fields: event.field_signals,
      skills: event.related_skills,
      courses: event.related_course_ids,
      participationSignals: event.participation_signals,
      organizationVerificationStatus: organization?.verification_status,
    }),
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
    relevance_signals: normalizeRelevanceSignals(rsvp.relevance_signals),
  };
}

function normalizeAttendee(attendee) {
  return {
    ...attendee,
    status: attendee.status || "going",
    attended_at: attendee.attended_at || null,
    attendance_recorded: Boolean(attendee.attendance_recorded),
    review_unlock_ready: Boolean(attendee.review_unlock_ready),
    attendee: {
      id: attendee.attendee?.id ?? null,
      full_name: attendee.attendee?.full_name || "",
      email: attendee.attendee?.email || "",
    },
    relevance_signals: normalizeRelevanceSignals(attendee.relevance_signals),
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

export async function fetchOrganizationEvents() {
  const events = await authenticatedApiRequest("/events/manage/", {
    method: "GET",
  });
  return events.map(normalizeEvent);
}

export async function createOrganizationEvent(payload) {
  const event = await authenticatedApiRequest("/events/manage/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return normalizeEvent(event);
}

export async function updateOrganizationEvent(eventId, payload) {
  const event = await authenticatedApiRequest(`/events/manage/${eventId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return normalizeEvent(event);
}

export async function deleteOrganizationEvent(eventId) {
  return authenticatedApiRequest(`/events/manage/${eventId}/`, {
    method: "DELETE",
  });
}

export async function fetchOrganizationEventAttendees(eventId, params = {}) {
  const searchParams = new URLSearchParams();
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (typeof params.attended === "boolean") {
    searchParams.set("attended", String(params.attended));
  }

  const attendees = await authenticatedApiRequest(
    `/events/manage/${eventId}/attendees/${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
    {
      method: "GET",
    },
  );
  return attendees.map(normalizeAttendee);
}

export async function updateOrganizationEventAttendee(
  eventId,
  attendeeId,
  { status, attended } = {},
) {
  const payload = {};
  if (status) {
    payload.status = status;
  }
  if (typeof attended === "boolean") {
    payload.attended = attended;
  }

  const attendee = await authenticatedApiRequest(
    `/events/manage/${eventId}/attendees/${attendeeId}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  return normalizeAttendee(attendee);
}

export async function fetchAdminEvents(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.organizationId) {
    searchParams.set("organization_id", String(params.organizationId));
  }
  if (params.verificationStatus) {
    searchParams.set("verification_status", params.verificationStatus);
  }

  const events = await authenticatedApiRequest(
    `/admin/events/${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
    { method: "GET" },
  );
  return events.map(normalizeEvent).map((event) => ({
    ...event,
    admin_review_notes: event.admin_review_notes || "",
    reviewed_by_email: event.reviewed_by_email || "",
    admin_reviewed_at: event.admin_reviewed_at || null,
  }));
}

export async function decideAdminEvent(
  eventId,
  { status, rsvpOpen, reviewNotes = "" } = {},
) {
  const payload = {};
  if (status) {
    payload.status = status;
  }
  if (typeof rsvpOpen === "boolean") {
    payload.rsvp_open = rsvpOpen;
  }
  if (reviewNotes !== undefined) {
    payload.review_notes = reviewNotes;
  }

  const event = await authenticatedApiRequest(`/admin/events/${eventId}/decision/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return normalizeEvent(event);
}

export { ApiError };
