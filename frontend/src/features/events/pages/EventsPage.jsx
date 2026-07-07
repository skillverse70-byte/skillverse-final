import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Globe, Search, SlidersHorizontal } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EventCard from "@/features/events/components/EventCard";
import { fetchEvents } from "@/services/events/events.service";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchEvents();
        if (active) {
          setEvents(data);
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
  }, []);

  const filtered = useMemo(
    () =>
      events.filter((event) => {
        const searchValue = search.trim().toLowerCase();
        const matchesSearch =
          !searchValue ||
          event.title?.toLowerCase().includes(searchValue) ||
          event.description?.toLowerCase().includes(searchValue) ||
          event.organization_name?.toLowerCase().includes(searchValue) ||
          event.category?.toLowerCase().includes(searchValue);
        const matchesStatus =
          statusFilter === "all" || event.status === statusFilter;
        const matchesMode =
          modeFilter === "all" ||
          (modeFilter === "online" ? event.is_online : !event.is_online);

        return matchesSearch && matchesStatus && matchesMode;
      }),
    [events, search, statusFilter, modeFilter],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
            Public events
          </p>
          <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            Events
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Workshops, meetups, and community sessions published by organizations.
          </p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-white px-5 py-4 shadow-sm shadow-black/5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Live catalog
              </div>
              <div className="font-heading text-2xl font-bold text-foreground">
                {events.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-3 rounded-3xl border border-border/60 bg-white p-4 shadow-sm shadow-black/5 md:grid-cols-[minmax(0,1fr)_180px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, category, or organization"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All formats</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="in_person">In person</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events found"
          description="Try another search or filter. Organizations can publish events here as they go live."
        />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            <span>{filtered.length} events</span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <Globe className="h-4 w-4" />
              Public discovery
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
