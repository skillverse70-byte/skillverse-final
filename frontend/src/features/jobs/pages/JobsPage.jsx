import React, { useEffect, useMemo, useState } from "react";
import { Briefcase, Search } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OpportunityCard from "@/features/jobs/components/OpportunityCard";
import { fetchPublicOpportunities } from "@/services/jobs/jobs.service";

const typeLabels = {
  job: "Jobs",
  internship: "Internships",
  program: "Programs",
  volunteer: "Volunteer roles",
};

export default function JobsPage() {
  const [opportunities, setOpportunities] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchPublicOpportunities();
        if (active) {
          setOpportunities(data);
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
      opportunities.filter((opportunity) => {
        const searchValue = search.trim().toLowerCase();
        const matchesSearch =
          !searchValue ||
          opportunity.title?.toLowerCase().includes(searchValue) ||
          opportunity.company_name?.toLowerCase().includes(searchValue) ||
          opportunity.category?.toLowerCase().includes(searchValue) ||
          opportunity.required_skills.some((skill) =>
            skill.toLowerCase().includes(searchValue),
          );
        const matchesType =
          typeFilter === "all" || opportunity.type === typeFilter;
        const matchesStatus =
          statusFilter === "all" || opportunity.status === statusFilter;

        return matchesSearch && matchesType && matchesStatus;
      }),
    [opportunities, search, typeFilter, statusFilter],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
            Opportunity hub
          </p>
          <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            Jobs & Opportunities
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Roles, internships, and programs published by organizations across the platform.
          </p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-white px-5 py-4 shadow-sm shadow-black/5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Live openings
              </div>
              <div className="font-heading text-2xl font-bold text-foreground">
                {opportunities.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-3 rounded-3xl border border-border/60 bg-white p-4 shadow-sm shadow-black/5 md:grid-cols-[minmax(0,1fr)_180px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by role, organization, category, or skill"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="job">Jobs</SelectItem>
            <SelectItem value="internship">Internships</SelectItem>
            <SelectItem value="program">Programs</SelectItem>
            <SelectItem value="volunteer">Volunteer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="filled">Filled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No opportunities found"
          description="Try a different filter or check back soon for new openings."
        />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{filtered.length} opportunities</span>
            <span className="text-border">·</span>
            <span>{typeFilter === "all" ? "All opportunity types" : typeLabels[typeFilter]}</span>
          </div>

          <div className="space-y-4">
            {filtered.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
