import React, { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  Mail,
  Plus,
  Save,
  Sparkles,
  Users,
} from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const opportunityTypeOptions = [
  { value: "job", label: "Job" },
  { value: "internship", label: "Internship" },
  { value: "program", label: "Program" },
  { value: "volunteer", label: "Volunteer" },
];

const opportunityStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "filled", label: "Filled" },
];

const experienceLevelOptions = [
  { value: "", label: "Any level" },
  { value: "student", label: "Student" },
  { value: "early_career", label: "Early career" },
  { value: "mid_career", label: "Mid career" },
  { value: "experienced", label: "Experienced" },
];

const applicationStatusOptions = [
  { value: "applied", label: "Applied" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
];

const opportunityTypeLabels = {
  job: "Job",
  internship: "Internship",
  program: "Program",
  volunteer: "Volunteer",
};

function createEmptyOpportunityForm() {
  return {
    title: "",
    description: "",
    type: "job",
    status: "draft",
    category: "",
    location: "",
    is_remote: false,
    experience_level: "",
    salary_range: "",
    deadline: "",
    required_skills: "",
    field_signals: "",
  };
}

function parseCommaSeparated(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function serializeOpportunityForm(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    type: form.type,
    status: form.status,
    category: form.category.trim(),
    location: form.location.trim(),
    is_remote: form.is_remote,
    experience_level: form.experience_level || "",
    salary_range: form.salary_range.trim(),
    deadline: form.deadline || null,
    required_skills: parseCommaSeparated(form.required_skills),
    field_signals: parseCommaSeparated(form.field_signals),
  };
}

function toEditableOpportunityForm(opportunity) {
  return {
    title: opportunity.title || "",
    description: opportunity.description || "",
    type: opportunity.type || "job",
    status: opportunity.status || "draft",
    category: opportunity.category || "",
    location: opportunity.location || "",
    is_remote: opportunity.is_remote ?? false,
    experience_level: opportunity.experience_level || "",
    salary_range: opportunity.salary_range || "",
    deadline: opportunity.deadline || "",
    required_skills: (opportunity.required_skills || []).join(", "),
    field_signals: (opportunity.field_signals || []).join(", "),
  };
}

function buildPipelineSummary(opportunities, applications) {
  const summary = {
    openOpportunities: opportunities.filter((item) => item.status === "open").length,
    totalApplicants: applications.length,
    shortlisted: 0,
    interview: 0,
    hired: 0,
  };

  applications.forEach((application) => {
    if (application.status === "shortlisted") {
      summary.shortlisted += 1;
    }
    if (application.status === "interview") {
      summary.interview += 1;
    }
    if (application.status === "hired") {
      summary.hired += 1;
    }
  });

  return summary;
}

export default function OrganizationApplicantPipelinePanel({
  opportunities,
  applications,
  onCreateOpportunity,
  onUpdateOpportunity,
  onUpdateApplication,
}) {
  const [drafts, setDrafts] = useState({});
  const [selectedOpportunityId, setSelectedOpportunityId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [savingOpportunity, setSavingOpportunity] = useState(false);
  const [editingOpportunityId, setEditingOpportunityId] = useState(null);
  const [opportunityForm, setOpportunityForm] = useState(createEmptyOpportunityForm());
  const [savingApplicationIds, setSavingApplicationIds] = useState({});

  useEffect(() => {
    setDrafts((current) => {
      const next = {};
      applications.forEach((application) => {
        next[application.id] = current[application.id] || {
          status: application.status,
          reviewer_notes: application.reviewer_notes || "",
        };
      });
      return next;
    });
  }, [applications]);

  const pipelineSummary = useMemo(
    () => buildPipelineSummary(opportunities, applications),
    [opportunities, applications],
  );

  const filteredApplications = useMemo(
    () =>
      applications.filter((application) => {
        if (
          selectedOpportunityId !== "all" &&
          String(application.opportunity?.id || "") !== selectedOpportunityId
        ) {
          return false;
        }
        if (selectedStatus !== "all" && application.status !== selectedStatus) {
          return false;
        }
        return true;
      }),
    [applications, selectedOpportunityId, selectedStatus],
  );

  const applicantCounts = useMemo(() => {
    const counts = new Map();
    applications.forEach((application) => {
      const key = application.opportunity?.id;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [applications]);

  const openCreateDialog = () => {
    setEditingOpportunityId(null);
    setOpportunityForm(createEmptyOpportunityForm());
    setCreateOpen(true);
  };

  const openEditDialog = (opportunity) => {
    setEditingOpportunityId(opportunity.id);
    setOpportunityForm(toEditableOpportunityForm(opportunity));
    setCreateOpen(true);
  };

  const handleOpportunitySubmit = async () => {
    setSavingOpportunity(true);
    try {
      const payload = serializeOpportunityForm(opportunityForm);
      if (editingOpportunityId) {
        await onUpdateOpportunity(editingOpportunityId, payload);
      } else {
        await onCreateOpportunity(payload);
      }
      setCreateOpen(false);
      setEditingOpportunityId(null);
      setOpportunityForm(createEmptyOpportunityForm());
    } finally {
      setSavingOpportunity(false);
    }
  };

  const handleDraftChange = (applicationId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [applicationId]: {
        ...current[applicationId],
        [field]: value,
      },
    }));
  };

  const handleApplicationSave = async (applicationId) => {
    const draft = drafts[applicationId];
    setSavingApplicationIds((current) => ({
      ...current,
      [applicationId]: true,
    }));
    try {
      await onUpdateApplication(applicationId, {
        status: draft?.status || "applied",
        reviewerNotes: draft?.reviewer_notes || "",
      });
    } finally {
      setSavingApplicationIds((current) => ({
        ...current,
        [applicationId]: false,
      }));
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PipelineStat icon={Briefcase} label="Open roles" value={pipelineSummary.openOpportunities} />
        <PipelineStat icon={Users} label="Applicants" value={pipelineSummary.totalApplicants} />
        <PipelineStat icon={Sparkles} label="Shortlisted" value={pipelineSummary.shortlisted} />
        <PipelineStat icon={CheckCircle2} label="Hired" value={pipelineSummary.hired} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
            <div className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Opportunity publishing
                </h2>
                <p className="text-sm text-muted-foreground">
                  Create, refine, and reopen opportunity listings from one place.
                </p>
              </div>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-teal-600 hover:bg-teal-700" onClick={openCreateDialog}>
                    <Plus className="h-4 w-4" />
                    New opportunity
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingOpportunityId ? "Update opportunity" : "Create opportunity"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Title">
                      <Input
                        value={opportunityForm.title}
                        onChange={(event) =>
                          setOpportunityForm((current) => ({ ...current, title: event.target.value }))
                        }
                        placeholder="Frontend internship"
                      />
                    </Field>
                    <Field label="Category">
                      <Input
                        value={opportunityForm.category}
                        onChange={(event) =>
                          setOpportunityForm((current) => ({ ...current, category: event.target.value }))
                        }
                        placeholder="Engineering"
                      />
                    </Field>
                    <Field label="Type">
                      <select
                        value={opportunityForm.type}
                        onChange={(event) =>
                          setOpportunityForm((current) => ({ ...current, type: event.target.value }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      >
                        {opportunityTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Status">
                      <select
                        value={opportunityForm.status}
                        onChange={(event) =>
                          setOpportunityForm((current) => ({ ...current, status: event.target.value }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      >
                        {opportunityStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Location">
                      <Input
                        value={opportunityForm.location}
                        onChange={(event) =>
                          setOpportunityForm((current) => ({ ...current, location: event.target.value }))
                        }
                        placeholder="Addis Ababa"
                        disabled={opportunityForm.is_remote}
                      />
                    </Field>
                    <Field label="Deadline">
                      <Input
                        type="date"
                        value={opportunityForm.deadline}
                        onChange={(event) =>
                          setOpportunityForm((current) => ({ ...current, deadline: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Experience level">
                      <select
                        value={opportunityForm.experience_level}
                        onChange={(event) =>
                          setOpportunityForm((current) => ({
                            ...current,
                            experience_level: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      >
                        {experienceLevelOptions.map((option) => (
                          <option key={option.value || "blank"} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Compensation">
                      <Input
                        value={opportunityForm.salary_range}
                        onChange={(event) =>
                          setOpportunityForm((current) => ({
                            ...current,
                            salary_range: event.target.value,
                          }))
                        }
                        placeholder="ETB 25,000 - 40,000 or stipend"
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                        <input
                          type="checkbox"
                          checked={opportunityForm.is_remote}
                          onChange={(event) =>
                            setOpportunityForm((current) => ({
                              ...current,
                              is_remote: event.target.checked,
                              location: event.target.checked ? "" : current.location,
                            }))
                          }
                          className="h-4 w-4 rounded border-border"
                        />
                        Remote opportunity
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <Field label="Description">
                        <Textarea
                          rows={5}
                          value={opportunityForm.description}
                          onChange={(event) =>
                            setOpportunityForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          placeholder="Describe the role, expected contribution, and why it matters."
                        />
                      </Field>
                    </div>
                    <Field label="Required skills">
                      <Input
                        value={opportunityForm.required_skills}
                        onChange={(event) =>
                          setOpportunityForm((current) => ({
                            ...current,
                            required_skills: event.target.value,
                          }))
                        }
                        placeholder="React, communication, design systems"
                      />
                    </Field>
                    <Field label="Field signals">
                      <Input
                        value={opportunityForm.field_signals}
                        onChange={(event) =>
                          setOpportunityForm((current) => ({
                            ...current,
                            field_signals: event.target.value,
                          }))
                        }
                        placeholder="software, design, community"
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={savingOpportunity}
                      onClick={handleOpportunitySubmit}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {savingOpportunity
                        ? "Saving..."
                        : editingOpportunityId
                          ? "Save changes"
                          : "Create opportunity"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {opportunities.length === 0 ? (
              <div className="pt-6">
                <EmptyState
                  icon={Briefcase}
                  title="No opportunities yet"
                  description="Publish your first role to start attracting applicants."
                  actionLabel="Create opportunity"
                  onAction={openCreateDialog}
                />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {opportunities.map((opportunity) => (
                  <div
                    key={opportunity.id}
                    className="rounded-2xl border border-border/50 bg-secondary/15 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-foreground">{opportunity.title}</h3>
                          <StatusBadge status={opportunity.status} />
                          <StatusBadge
                            status="active"
                            label={`${applicantCounts.get(opportunity.id) || 0} applicants`}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{opportunityTypeLabels[opportunity.type] || opportunity.type}</span>
                          {opportunity.category ? <span>{opportunity.category}</span> : null}
                          {opportunity.deadline ? <span>Deadline {opportunity.deadline}</span> : null}
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                          {opportunity.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" className="gap-2" onClick={() => openEditDialog(opportunity)}>
                          <Eye className="h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
          <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Applicant pipeline
              </h2>
              <p className="text-sm text-muted-foreground">
                Review applications and move candidates through the pipeline.
              </p>
            </div>
            <ClipboardList className="h-5 w-5 text-teal-700" />
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="flex min-w-[180px] flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Opportunity
              <select
                value={selectedOpportunityId}
                onChange={(event) => setSelectedOpportunityId(event.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground"
              >
                <option value="all">All opportunities</option>
                {opportunities.map((opportunity) => (
                  <option key={opportunity.id} value={String(opportunity.id)}>
                    {opportunity.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[160px] flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pipeline state
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground"
              >
                <option value="all">All states</option>
                {applicationStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filteredApplications.length === 0 ? (
            <div className="pt-6">
              <EmptyState
                icon={Users}
                title="No applicants yet"
                description="Applications will appear here once regular users start applying."
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredApplications.map((application) => {
                const draft = drafts[application.id] || {
                  status: application.status,
                  reviewer_notes: application.reviewer_notes || "",
                };
                return (
                  <div
                    key={application.id}
                    className="rounded-2xl border border-border/50 bg-secondary/15 p-4"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-foreground">
                              {application.applicant?.full_name || application.applicant?.email}
                            </h3>
                            <StatusBadge status={application.status} />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {application.applicant?.email}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" />
                              {application.opportunity?.title}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                          Candidate review
                        </div>
                      </div>

                      {application.cover_letter ? (
                        <div className="rounded-2xl bg-white/80 p-4">
                          <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                            Cover letter
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                            {application.cover_letter}
                          </p>
                        </div>
                      ) : null}

                      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                        <Field label="Pipeline state">
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              handleDraftChange(application.id, "status", event.target.value)
                            }
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                          >
                            {applicationStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Reviewer notes">
                          <Textarea
                            rows={3}
                            value={draft.reviewer_notes}
                            onChange={(event) =>
                              handleDraftChange(application.id, "reviewer_notes", event.target.value)
                            }
                            placeholder="Add notes for your team or future follow-up."
                          />
                        </Field>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          disabled={Boolean(savingApplicationIds[application.id])}
                          onClick={() => handleApplicationSave(application.id)}
                          className="gap-2 bg-teal-600 hover:bg-teal-700"
                        >
                          <Save className="h-4 w-4" />
                          {savingApplicationIds[application.id] ? "Saving..." : "Save decision"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
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

function PipelineStat({ icon: Icon, label, value }) {
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
