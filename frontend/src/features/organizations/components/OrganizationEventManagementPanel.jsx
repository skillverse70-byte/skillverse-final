import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  Calendar,
  Clock3,
  ExternalLink,
  Globe,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Radio,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  fetchOrganizationEventAttendees,
  updateOrganizationEventAttendee,
} from "@/services/events/events.service";
import moment from "moment";

const eventStatusOptions = [
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function createEmptyForm() {
  return {
    title: "",
    description: "",
    category: "",
    location: "",
    is_online: false,
    meeting_url: "",
    cover_image_url: "",
    max_attendees: "",
    rsvp_open: true,
    status: "upcoming",
    starts_at: "",
    ends_at: "",
    tags: "",
    field_signals: "",
    related_skills: "",
    related_course_ids: "",
    participation_signals: "",
  };
}

function parseStringList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseIntList(value) {
  return value
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item));
}

function toPayload(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    location: form.location.trim(),
    is_online: form.is_online,
    meeting_url: form.meeting_url.trim(),
    cover_image_url: form.cover_image_url.trim(),
    max_attendees: form.max_attendees === "" ? null : Number(form.max_attendees),
    rsvp_open: form.rsvp_open,
    status: form.status,
    starts_at: form.starts_at,
    ends_at: form.ends_at || null,
    tags: parseStringList(form.tags),
    field_signals: parseStringList(form.field_signals),
    related_skills: parseStringList(form.related_skills),
    related_course_ids: parseIntList(form.related_course_ids),
    participation_signals: parseStringList(form.participation_signals),
  };
}

function toEditableForm(event) {
  return {
    title: event.title || "",
    description: event.description || "",
    category: event.category || "",
    location: event.location || "",
    is_online: Boolean(event.is_online),
    meeting_url: event.meeting_url || "",
    cover_image_url: event.cover_image_url || "",
    max_attendees: event.max_attendees ?? "",
    rsvp_open: event.rsvp_open ?? true,
    status: event.status || "upcoming",
    starts_at: event.starts_at ? moment(event.starts_at).format("YYYY-MM-DDTHH:mm") : "",
    ends_at: event.ends_at ? moment(event.ends_at).format("YYYY-MM-DDTHH:mm") : "",
    tags: (event.tags || []).join(", "),
    field_signals: (event.field_signals || []).join(", "),
    related_skills: (event.related_skills || []).join(", "),
    related_course_ids: (event.related_course_ids || []).join(", "),
    participation_signals: (event.participation_signals || []).join(", "),
  };
}

export default function OrganizationEventManagementPanel({
  events,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onRefreshEvents,
}) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm());
  const [editingEventId, setEditingEventId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [attendeeDialogOpen, setAttendeeDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [attendeeStatusFilter, setAttendeeStatusFilter] = useState("all");
  const [attendeeAttendanceFilter, setAttendeeAttendanceFilter] = useState("all");
  const [savingAttendeeIds, setSavingAttendeeIds] = useState({});

  const summary = useMemo(() => {
    const totalRsvps = events.reduce((sum, event) => sum + Number(event.total_rsvp_count || 0), 0);
    const attended = events.reduce((sum, event) => sum + Number(event.attended_count || 0), 0);
    const live = events.filter((event) => event.status === "live").length;
    const openRsvp = events.filter((event) => event.rsvp_open).length;
    return {
      totalEvents: events.length,
      totalRsvps,
      attended,
      live,
      openRsvp,
    };
  }, [events]);

  const openCreateDialog = () => {
    setEditingEventId(null);
    setForm(createEmptyForm());
    setDialogOpen(true);
  };

  const openEditDialog = (event) => {
    setEditingEventId(event.id);
    setForm(toEditableForm(event));
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (editingEventId) {
        await onUpdateEvent(editingEventId, payload);
      } else {
        await onCreateEvent(payload);
      }
      setDialogOpen(false);
      setEditingEventId(null);
      setForm(createEmptyForm());
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event) => {
    const confirmed = window.confirm(
      `Delete "${event.title}"? This only works when no attendee records exist.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingEventId(event.id);
    try {
      await onDeleteEvent(event.id);
    } finally {
      setDeletingEventId(null);
    }
  };

  const loadAttendees = async (event, nextFilters = {}) => {
    setLoadingAttendees(true);
    try {
      const nextAttendees = await fetchOrganizationEventAttendees(event.id, nextFilters);
      setAttendees(nextAttendees);
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to load attendees",
        description: error?.message || "Something went wrong while loading attendee records.",
        variant: "destructive",
      });
    } finally {
      setLoadingAttendees(false);
    }
  };

  const openAttendeeDialog = async (event) => {
    setSelectedEvent(event);
    setAttendeeStatusFilter("all");
    setAttendeeAttendanceFilter("all");
    setAttendeeDialogOpen(true);
    await loadAttendees(event);
  };

  const handleAttendeeFilterChange = async ({ statusFilter, attendanceFilter }) => {
    if (!selectedEvent) {
      return;
    }

    const nextStatus = statusFilter ?? attendeeStatusFilter;
    const nextAttendance = attendanceFilter ?? attendeeAttendanceFilter;
    if (statusFilter !== undefined) {
      setAttendeeStatusFilter(statusFilter);
    }
    if (attendanceFilter !== undefined) {
      setAttendeeAttendanceFilter(attendanceFilter);
    }

    const params = {};
    if (nextStatus !== "all") {
      params.status = nextStatus;
    }
    if (nextAttendance === "attended") {
      params.attended = true;
    }
    if (nextAttendance === "not_attended") {
      params.attended = false;
    }
    await loadAttendees(selectedEvent, params);
  };

  const handleAttendeeSave = async (attendee, updates) => {
    if (!selectedEvent) {
      return;
    }

    setSavingAttendeeIds((current) => ({ ...current, [attendee.id]: true }));
    try {
      const nextAttendee = await updateOrganizationEventAttendee(selectedEvent.id, attendee.id, updates);
      setAttendees((current) =>
        current.map((item) => (item.id === nextAttendee.id ? nextAttendee : item)),
      );
      if (onRefreshEvents) {
        const refreshedEvents = await onRefreshEvents();
        const refreshedSelectedEvent = refreshedEvents?.find((item) => item.id === selectedEvent.id);
        if (refreshedSelectedEvent) {
          setSelectedEvent(refreshedSelectedEvent);
        }
      }
      toast({
        title: "Attendee updated",
        description: "Participation details were saved successfully.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to update attendee",
        description: error?.message || "Something went wrong while updating the attendee record.",
        variant: "destructive",
      });
    } finally {
      setSavingAttendeeIds((current) => ({ ...current, [attendee.id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Calendar} label="Events" value={summary.totalEvents} />
        <MetricCard icon={Users} label="RSVPs" value={summary.totalRsvps} />
        <MetricCard icon={Clock3} label="Attended" value={summary.attended} />
        <MetricCard icon={Radio} label="Live" value={summary.live} />
        <MetricCard icon={Globe} label="RSVP Open" value={summary.openRsvp} />
      </section>

      <section className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Event publishing
            </h2>
            <p className="text-sm text-muted-foreground">
              Create events, update lifecycle state, manage RSVP visibility, and keep your catalog current.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-teal-600 hover:bg-teal-700" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                New event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{editingEventId ? "Update event" : "Create event"}</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Title">
                  <Input
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Product workshop"
                  />
                </Field>
                <Field label="Category">
                  <Input
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    placeholder="Design"
                  />
                </Field>
                <Field label="Start date and time">
                  <Input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))}
                  />
                </Field>
                <Field label="End date and time">
                  <Input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))}
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    {eventStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Max attendees">
                  <Input
                    type="number"
                    min="1"
                    value={form.max_attendees}
                    onChange={(event) => setForm((current) => ({ ...current, max_attendees: event.target.value }))}
                    placeholder="50"
                  />
                </Field>
                <div className="md:col-span-2 flex flex-wrap gap-6">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={form.is_online}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          is_online: event.target.checked,
                          location: event.target.checked ? "" : current.location,
                        }))
                      }
                      className="h-4 w-4 rounded border-border"
                    />
                    Online event
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={form.rsvp_open}
                      onChange={(event) => setForm((current) => ({ ...current, rsvp_open: event.target.checked }))}
                      className="h-4 w-4 rounded border-border"
                    />
                    RSVP open
                  </label>
                </div>
                {form.is_online ? (
                  <Field label="Meeting URL">
                    <Input
                      value={form.meeting_url}
                      onChange={(event) => setForm((current) => ({ ...current, meeting_url: event.target.value }))}
                      placeholder="https://meet.example.com/session"
                    />
                  </Field>
                ) : (
                  <Field label="Location">
                    <Input
                      value={form.location}
                      onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                      placeholder="Addis Ababa"
                    />
                  </Field>
                )}
                <Field label="Cover image URL">
                  <Input
                    value={form.cover_image_url}
                    onChange={(event) => setForm((current) => ({ ...current, cover_image_url: event.target.value }))}
                    placeholder="https://..."
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Description">
                    <Textarea
                      rows={5}
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Describe the session, audience, and expected outcome."
                    />
                  </Field>
                </div>
                <Field label="Tags">
                  <Input
                    value={form.tags}
                    onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                    placeholder="community, workshop, design"
                  />
                </Field>
                <Field label="Field signals">
                  <Input
                    value={form.field_signals}
                    onChange={(event) => setForm((current) => ({ ...current, field_signals: event.target.value }))}
                    placeholder="design, product"
                  />
                </Field>
                <Field label="Related skills">
                  <Input
                    value={form.related_skills}
                    onChange={(event) => setForm((current) => ({ ...current, related_skills: event.target.value }))}
                    placeholder="facilitation, prototyping"
                  />
                </Field>
                <Field label="Related course IDs">
                  <Input
                    value={form.related_course_ids}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, related_course_ids: event.target.value }))
                    }
                    placeholder="12, 18"
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Participation signals">
                    <Input
                      value={form.participation_signals}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, participation_signals: event.target.value }))
                      }
                      placeholder="attendance, workshop_completion"
                    />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {saving ? "Saving..." : editingEventId ? "Save changes" : "Create event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {events.length === 0 ? (
          <div className="pt-6">
            <EmptyState
              icon={Calendar}
              title="No events yet"
              description="Create your first event to start collecting RSVPs and attendance."
              actionLabel="Create event"
              onAction={openCreateDialog}
            />
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {events.map((event) => (
              <article
                key={event.id}
                className="rounded-3xl border border-border/50 bg-secondary/15 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-lg font-semibold text-foreground">{event.title}</h3>
                      <StatusBadge status={event.status} />
                      <StatusBadge
                        status={event.rsvp_open ? "active" : "cancelled"}
                        label={event.rsvp_open ? "RSVP Open" : "RSVP Closed"}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-4 w-4" />
                        {moment(event.starts_at).format("MMM D, YYYY h:mm A")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {event.is_online ? <Globe className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                        {event.is_online ? "Online" : event.location || "Location TBA"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {event.total_rsvp_count} RSVP{event.total_rsvp_count === 1 ? "" : "s"}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {event.description}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MiniStat label="Going" value={event.current_attendees} />
                      <MiniStat label="Interested" value={event.interested_count} />
                      <MiniStat label="Attended" value={event.attended_count} />
                      <MiniStat
                        label="Spots left"
                        value={event.spots_remaining ?? "Unlimited"}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link to={`/events/${event.id}`}>
                      <Button variant="outline" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Public view
                      </Button>
                    </Link>
                    <Button variant="outline" className="gap-2" onClick={() => openEditDialog(event)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => openAttendeeDialog(event)}
                    >
                      <Users className="h-4 w-4" />
                      Attendees
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 text-red-700 hover:text-red-800"
                      onClick={() => handleDelete(event)}
                      disabled={deletingEventId === event.id}
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingEventId === event.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={attendeeDialogOpen} onOpenChange={setAttendeeDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? `Attendees: ${selectedEvent.title}` : "Attendees"}
            </DialogTitle>
          </DialogHeader>

          {selectedEvent ? (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-3xl border border-border/60 bg-secondary/10 p-4 md:grid-cols-4">
                <MiniStat label="Total RSVPs" value={selectedEvent.total_rsvp_count} />
                <MiniStat label="Going" value={selectedEvent.current_attendees} />
                <MiniStat label="Interested" value={selectedEvent.interested_count} />
                <MiniStat label="Attended" value={selectedEvent.attended_count} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="RSVP state">
                  <select
                    value={attendeeStatusFilter}
                    onChange={(event) =>
                      handleAttendeeFilterChange({ statusFilter: event.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All attendees</option>
                    <option value="going">Going</option>
                    <option value="interested">Interested</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </Field>
                <Field label="Attendance">
                  <select
                    value={attendeeAttendanceFilter}
                    onChange={(event) =>
                      handleAttendeeFilterChange({ attendanceFilter: event.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All attendance states</option>
                    <option value="attended">Attended</option>
                    <option value="not_attended">Not attended</option>
                  </select>
                </Field>
              </div>

              {loadingAttendees ? (
                <div className="flex items-center justify-center rounded-3xl border border-dashed border-border/60 py-12 text-muted-foreground">
                  <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                  Loading attendees...
                </div>
              ) : attendees.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No attendee records in this view"
                  description="Try a different filter or wait for regular users to RSVP."
                />
              ) : (
                <div className="space-y-3">
                  {attendees.map((attendee) => (
                    <AttendeeRow
                      key={attendee.id}
                      attendee={attendee}
                      saving={Boolean(savingAttendeeIds[attendee.id])}
                      onSave={handleAttendeeSave}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AttendeeRow({ attendee, saving, onSave }) {
  const [status, setStatus] = useState(attendee.status);

  React.useEffect(() => {
    setStatus(attendee.status);
  }, [attendee.status]);

  return (
    <div className="rounded-3xl border border-border/50 bg-secondary/15 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-foreground">
              {attendee.attendee.full_name || attendee.attendee.email}
            </h3>
            <StatusBadge status={attendee.status} />
            {attendee.attendance_recorded ? (
              <StatusBadge status="completed" label="Attended" />
            ) : (
              <StatusBadge status="pending" label="Not Attended" />
            )}
            {attendee.review_unlock_ready ? (
              <StatusBadge status="verified" label="Review Ready" />
            ) : null}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">{attendee.attendee.email}</div>
          <div className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
            RSVP updated {moment(attendee.updated_at).fromNow()}
          </div>
        </div>

        <div className="grid min-w-[280px] gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="going">Going</option>
            <option value="interested">Interested</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onSave(attendee, {
                status,
                attended: !attendee.attendance_recorded,
              })
            }
            disabled={saving || status !== "going"}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {attendee.attendance_recorded ? "Clear attendance" : "Mark attended"}
          </Button>
          <Button
            type="button"
            onClick={() =>
              onSave(attendee, {
                status,
              })
            }
            disabled={saving}
            className="gap-2 bg-teal-600 hover:bg-teal-700"
          >
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-2 font-heading text-3xl font-bold text-foreground">{value}</div>
        </div>
        <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/80 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}
