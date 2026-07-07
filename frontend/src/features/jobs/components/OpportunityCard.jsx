import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  CheckCircle,
  Clock3,
  Globe,
  MapPin,
} from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import moment from "moment";

const typeLabels = {
  job: "Job",
  internship: "Internship",
  program: "Program",
  volunteer: "Volunteer",
};

const experienceLabels = {
  student: "Student",
  early_career: "Early Career",
  mid_career: "Mid Career",
  experienced: "Experienced",
};

export default function OpportunityCard({ opportunity }) {
  return (
    <Link to={`/jobs/${opportunity.id}`} className="group">
      <article className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5 transition-all hover:-translate-y-1 hover:shadow-md sm:flex-row sm:items-center sm:p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <Briefcase className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold text-foreground transition-colors group-hover:text-teal-700">
              {opportunity.title}
            </h2>
            <StatusBadge status={opportunity.status} />
            {opportunity.viewer_application_status ? (
              <StatusBadge status={opportunity.viewer_application_status} />
            ) : null}
          </div>

          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{opportunity.company_name}</span>
            {opportunity.organization_verification_status === "verified" ? (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-muted-foreground">
              {typeLabels[opportunity.type] || opportunity.type}
            </span>
            {opportunity.experience_level ? (
              <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-muted-foreground">
                {experienceLabels[opportunity.experience_level] || opportunity.experience_level}
              </span>
            ) : null}
            {opportunity.category ? (
              <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-muted-foreground">
                {opportunity.category}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              {opportunity.is_remote ? (
                <Globe className="h-4 w-4 text-teal-600" />
              ) : (
                <MapPin className="h-4 w-4 text-teal-600" />
              )}
              {opportunity.is_remote ? "Remote" : opportunity.location || "Location TBA"}
            </span>
            {opportunity.deadline ? (
              <span className="flex items-center gap-1.5">
                <Clock3 className="h-4 w-4 text-amber-600" />
                Apply by {moment(opportunity.deadline).format("MMM D")}
              </span>
            ) : null}
            {opportunity.salary_range ? <span>{opportunity.salary_range}</span> : null}
          </div>

          {opportunity.required_skills.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {opportunity.required_skills.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700"
                >
                  {skill}
                </span>
              ))}
              {opportunity.required_skills.length > 4 ? (
                <span className="text-xs text-muted-foreground">
                  +{opportunity.required_skills.length - 4} more
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <ArrowRight className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
      </article>
    </Link>
  );
}
