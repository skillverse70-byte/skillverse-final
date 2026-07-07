import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Building,
  CheckCircle,
  Clock3,
  Globe,
  MapPin,
  Send,
} from "lucide-react";
import BookmarkButton from "@/components/shared/BookmarkButton";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { jobApplicationStatuses, roles } from "@/lib/domain-enums";
import {
  ApiError,
  applyToOpportunity,
  fetchOpportunityDetail,
} from "@/services/jobs/jobs.service";
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

export default function JobDetailPage() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const { toast } = useToast();
  const { isAuthenticated, actorRole, navigateToLogin } = useAuth();

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchOpportunityDetail(id, { authenticated: isAuthenticated });
        if (active) {
          setJob(data);
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
  }, [id, isAuthenticated]);

  const handleApply = async () => {
    if (!isAuthenticated) {
      navigateToLogin();
      return;
    }

    if (actorRole !== roles.regularUser) {
      toast({
        title: "Applications are for regular users",
        description:
          "Organizations and admins can browse opportunities, but only regular users can apply in V1.",
        variant: "destructive",
      });
      return;
    }

    setApplying(true);
    try {
      await applyToOpportunity(id, { coverLetter });
      const refreshed = await fetchOpportunityDetail(id, { authenticated: true });
      setJob(refreshed);
      toast({
        title: "Application submitted",
        description: "Your application was sent successfully.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to submit application",
        description:
          error instanceof ApiError
            ? error.message
            : "Something went wrong while submitting your application.",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <EmptyState
          icon={Briefcase}
          title="Opportunity not found"
          description="This listing may have been removed or is no longer public."
          actionLabel="Back to Jobs"
          onAction={() => {
            window.location.href = "/jobs";
          }}
        />
      </div>
    );
  }

  const canApply = job.status === "open";
  const alreadyApplied = Boolean(job.viewer_application_status);
  const isRegularUser = actorRole === roles.regularUser;
  const applicationSummary = useMemo(() => {
    if (!isAuthenticated) {
      return "Sign in as a regular user to apply.";
    }
    if (!isRegularUser) {
      return "Only regular users can apply in V1.";
    }
    if (alreadyApplied) {
      return `Application status: ${job.viewer_application_status.replace("_", " ")}.`;
    }
    return "Send your application directly through the platform.";
  }, [alreadyApplied, isAuthenticated, isRegularUser, job.viewer_application_status]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        to="/jobs"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Jobs
      </Link>

      <div className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5 sm:p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <Building className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-foreground">
                {job.title}
              </h1>
              <StatusBadge status={job.status} />
              {job.viewer_application_status ? (
                <StatusBadge status={job.viewer_application_status} />
              ) : null}
            </div>
            <p className="text-muted-foreground">
              {job.organization_id ? (
                <Link
                  to={`/organizations/${job.organization_id}`}
                  className="hover:text-teal-700 hover:underline"
                >
                  {job.company_name}
                </Link>
              ) : (
                job.company_name
              )}
            </p>
          </div>
          <BookmarkButton
            itemType="job"
            itemId={job.id}
            itemTitle={job.title}
            itemSubtitle={job.company_name}
            itemCategory={job.category}
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {typeLabels[job.type] || job.type}
          </span>
          {job.experience_level ? (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {experienceLabels[job.experience_level] || job.experience_level}
            </span>
          ) : null}
          {job.category ? (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {job.category}
            </span>
          ) : null}
          <StatusBadge organization={job.organization} />
        </div>

        <div className="mb-8 grid gap-4 rounded-2xl bg-secondary/25 p-4 sm:grid-cols-3">
          <div className="flex items-center gap-2 text-sm">
            {job.is_remote ? (
              <Globe className="h-4 w-4 text-teal-600" />
            ) : (
              <MapPin className="h-4 w-4 text-teal-600" />
            )}
            <span>{job.is_remote ? "Remote" : job.location || "Location TBA"}</span>
          </div>
          {job.salary_range ? (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-teal-600" />
              <span>{job.salary_range}</span>
            </div>
          ) : null}
          {job.deadline ? (
            <div className="flex items-center gap-2 text-sm">
              <Clock3 className="h-4 w-4 text-teal-600" />
              <span>Apply by {moment(job.deadline).format("MMM D, YYYY")}</span>
            </div>
          ) : null}
        </div>

        <section className="mb-8">
          <h2 className="mb-3 font-heading text-lg font-semibold">About this opportunity</h2>
          <p className="whitespace-pre-wrap leading-relaxed text-foreground">
            {job.description}
          </p>
        </section>

        {job.required_skills.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-3 font-heading text-lg font-semibold">Required skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.required_skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {job.field_signals.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-3 font-heading text-lg font-semibold">Relevant fields</h2>
            <div className="flex flex-wrap gap-2">
              {job.field_signals.map((fieldSignal) => (
                <span
                  key={fieldSignal}
                  className="rounded-full bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700"
                >
                  {fieldSignal}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <div className="border-t border-border/60 pt-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Apply
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {applicationSummary}
              </p>
            </div>

            {alreadyApplied ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                You already applied to this opportunity.
              </div>
            ) : canApply ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="h-11 gap-2 bg-teal-600 hover:bg-teal-700">
                    <Send className="h-4 w-4" />
                    Apply now
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Apply for {job.title}</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label className="text-sm font-medium">
                        Cover letter
                      </Label>
                      <Textarea
                        placeholder="Share why you are a good fit for this opportunity."
                        value={coverLetter}
                        onChange={(event) => setCoverLetter(event.target.value)}
                        className="mt-1.5 resize-none"
                        rows={6}
                      />
                    </div>
                    <Button
                      onClick={handleApply}
                      disabled={applying}
                      className="w-full bg-teal-600 hover:bg-teal-700"
                    >
                      {applying ? "Submitting..." : "Submit application"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Button disabled>Applications closed</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
