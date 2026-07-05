import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Briefcase, MapPin, Globe, Clock, ArrowLeft, CheckCircle, Building, Send } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import BookmarkButton from "@/components/shared/BookmarkButton";
import moment from "moment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const typeLabels = { full_time: "Full Time", part_time: "Part Time", internship: "Internship", freelance: "Freelance", volunteer: "Volunteer" };

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await appClient.entities.Job.get(id);
        setJob(data);
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleApply = async () => {
    setApplying(true);
    try {
      const me = await appClient.auth.me();
      await appClient.entities.JobApplication.create({
        user_id: me.id,
        job_id: id,
        job_title: job.title,
        company_name: job.company_name,
        cover_letter: coverLetter,
        applied_date: new Date().toISOString().split("T")[0],
      });
      setApplied(true);
    } catch(e) { console.error(e); }
    setApplying(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>;
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="font-heading font-bold text-xl mb-2">Job not found</h2>
        <Link to="/jobs"><Button variant="outline">Back to Jobs</Button></Link>
      </div>
    );
  }

  const organization = {
    id: job.organization_id,
    verification_status: job.organization_verification_status,
    is_verified: job.is_verified,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </Link>

      <div className="bg-white rounded-2xl border border-border/50 p-6 sm:p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Building className="w-7 h-7 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="font-heading font-bold text-2xl">{job.title}</h1>
              <StatusBadge organization={organization} />
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
          <BookmarkButton itemType="job" itemId={job.id} itemTitle={job.title} itemSubtitle={job.company_name} itemCategory={job.category} />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <StatusBadge status={job.status} />
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{typeLabels[job.type]}</span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground capitalize">{job.experience_level} level</span>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-8 p-4 rounded-xl bg-secondary/30">
          <div className="flex items-center gap-2 text-sm">
            {job.is_remote ? <Globe className="w-4 h-4 text-teal-600" /> : <MapPin className="w-4 h-4 text-teal-600" />}
            <span>{job.is_remote ? "Remote" : job.location || "Location TBA"}</span>
          </div>
          {job.salary_range && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="w-4 h-4 text-teal-600" />
              <span>{job.salary_range}</span>
            </div>
          )}
          {job.deadline && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-teal-600" />
              <span>Apply by {moment(job.deadline).format("MMM D, YYYY")}</span>
            </div>
          )}
        </div>

        <div className="mb-8">
          <h2 className="font-heading font-semibold text-lg mb-3">About this role</h2>
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">{job.description}</p>
        </div>

        {job.required_skills?.length > 0 && (
          <div className="mb-8">
            <h2 className="font-heading font-semibold text-lg mb-3">Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.required_skills.map(s => (
                <span key={s} className="px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-sm font-medium">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Apply */}
        <div className="border-t border-border/50 pt-6">
          {applied ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Application submitted! You'll hear back soon.</span>
            </div>
          ) : job.status === "open" ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700 gap-2 h-11">
                  <Send className="w-4 h-4" /> Apply Now
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Apply for {job.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-sm font-medium">Cover Letter (optional)</Label>
                    <Textarea
                      placeholder="Tell the team why you'd be a great fit..."
                      value={coverLetter}
                      onChange={e => setCoverLetter(e.target.value)}
                      className="mt-1.5 resize-none"
                      rows={5}
                    />
                  </div>
                  <Button onClick={handleApply} disabled={applying} className="w-full bg-teal-600 hover:bg-teal-700 gap-2">
                    {applying ? "Submitting..." : "Submit Application"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button disabled className="gap-2">Applications Closed</Button>
          )}
        </div>
      </div>
    </div>
  );
}
