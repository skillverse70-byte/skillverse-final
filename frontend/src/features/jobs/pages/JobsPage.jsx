import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Input } from "@/components/ui/input";
import {
  Search,
  Briefcase,
  MapPin,
  Globe,
  Clock,
  CheckCircle,
  Building,
  ArrowRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EmptyState from "@/components/shared/EmptyState";
import moment from "moment";

const typeLabels = {
  full_time: "Full Time",
  part_time: "Part Time",
  internship: "Internship",
  freelance: "Freelance",
  volunteer: "Volunteer",
};

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await appClient.entities.Job.filter(
          { status: "open" },
          "-created_date",
          50,
        );
        setJobs(data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = jobs.filter(
    (j) =>
      (!search ||
        j.title?.toLowerCase().includes(search.toLowerCase()) ||
        j.company_name?.toLowerCase().includes(search.toLowerCase())) &&
      (typeFilter === "all" || j.type === typeFilter),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl text-foreground mb-2">
          Jobs & Internships
        </h1>
        <p className="text-muted-foreground">
          Opportunities matched to the skills you're building.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs or companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Job Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="full_time">Full Time</SelectItem>
            <SelectItem value="part_time">Part Time</SelectItem>
            <SelectItem value="internship">Internship</SelectItem>
            <SelectItem value="freelance">Freelance</SelectItem>
            <SelectItem value="volunteer">Volunteer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No openings right now"
          description="Check back soon or adjust your filters. New opportunities are added regularly."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((job) => (
            <Link key={job.id} to={`/jobs/${job.id}`}>
              <div className="bg-white rounded-2xl border border-border/50 p-5 sm:p-6 card-hover flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Building className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-heading font-semibold text-base">
                      {job.title}
                    </h3>
                    {job.is_verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {job.company_name}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-full bg-secondary font-medium">
                      {typeLabels[job.type] || job.type}
                    </span>
                    <span className="capitalize px-2 py-0.5 rounded-full bg-secondary font-medium">
                      {job.experience_level} level
                    </span>
                    {job.is_remote ? (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" /> Remote
                      </span>
                    ) : job.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {job.location}
                      </span>
                    ) : null}
                    {job.salary_range && <span>{job.salary_range}</span>}
                    {job.deadline && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Apply by{" "}
                        {moment(job.deadline).format("MMM D")}
                      </span>
                    )}
                  </div>
                  {job.required_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {job.required_skills.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700"
                        >
                          {s}
                        </span>
                      ))}
                      {job.required_skills.length > 4 && (
                        <span className="text-xs text-muted-foreground">
                          +{job.required_skills.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 hidden sm:block" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
