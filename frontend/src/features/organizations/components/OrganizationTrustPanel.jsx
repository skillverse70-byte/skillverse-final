import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Award, BookOpen, Calendar, ShieldCheck, Users } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  fetchOrganizationTrustOverview,
  issueOrganizationCertificate,
  issueOrganizationServiceCredit,
  revokeOrganizationCertificate,
  revokeOrganizationServiceCredit,
} from "@/services/certificates/certificates.service";
import { createCommunity } from "@/services/communities/communities.service";

const defaultCommunityForm = {
  title: "",
  description: "",
  category: "",
  tags: "",
  visibility: "public",
};

const defaultServiceCreditForm = {
  user_id: "",
  evidence_type: "event",
  event_id: "",
  course_id: "",
  community_id: "",
  title: "",
  description: "",
  credit_hours: "1.00",
  evidence_note: "",
};

const defaultCertificateForm = {
  source_type: "course_completion",
  user_id: "",
  course_id: "",
  event_id: "",
  service_credit_id: "",
  title: "",
  summary: "",
};

function parseTags(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString();
}

function toLearnerKey(user) {
  return user?.id ? String(user.id) : "";
}

function uniqueLearners(entries) {
  const seen = new Set();
  return entries
    .map((entry) => entry.user)
    .filter((user) => {
      const key = toLearnerKey(user);
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function buildEvidencePayload(form) {
  const payload = {
    user_id: Number(form.user_id),
    title: form.title,
    description: form.description,
    credit_hours: form.credit_hours,
    evidence_note: form.evidence_note,
  };
  if (form.evidence_type === "event") {
    payload.event_id = Number(form.event_id);
  } else if (form.evidence_type === "course") {
    payload.course_id = Number(form.course_id);
  } else if (form.evidence_type === "community") {
    payload.community_id = Number(form.community_id);
  }
  return payload;
}

function buildCertificatePayload(form) {
  const payload = {
    source_type: form.source_type,
    user_id: Number(form.user_id),
    title: form.title,
    summary: form.summary,
  };
  if (form.source_type === "course_completion") {
    payload.course_id = Number(form.course_id);
  } else if (form.source_type === "event_participation") {
    payload.event_id = Number(form.event_id);
  } else if (form.source_type === "service_credit") {
    payload.service_credit_id = Number(form.service_credit_id);
  }
  return payload;
}

export default function OrganizationTrustPanel({ organization }) {
  const { toast } = useToast();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [communityForm, setCommunityForm] = useState(defaultCommunityForm);
  const [serviceCreditForm, setServiceCreditForm] = useState(defaultServiceCreditForm);
  const [certificateForm, setCertificateForm] = useState(defaultCertificateForm);
  const [revokeReasons, setRevokeReasons] = useState({});
  const [submittingKey, setSubmittingKey] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchOrganizationTrustOverview();
      setOverview(payload);
      return payload;
    } catch (loadError) {
      setError(loadError.message || "Unable to load community and trust records.");
      throw loadError;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const communities = overview?.communities || [];
  const serviceCredits = overview?.service_credits || [];
  const certificates = overview?.certificates || [];
  const eligibleCourseCompletions = overview?.eligible_course_completions || [];
  const eligibleEventAttendances = overview?.eligible_event_attendances || [];
  const eligibleServiceCreditCertificates = overview?.eligible_service_credit_certificates || [];
  const verified = organization?.verification_status === "verified";

  const eligiblePeople = useMemo(
    () =>
      uniqueLearners([
        ...eligibleCourseCompletions,
        ...eligibleEventAttendances,
        ...eligibleServiceCreditCertificates,
      ]),
    [
      eligibleCourseCompletions,
      eligibleEventAttendances,
      eligibleServiceCreditCertificates,
    ],
  );

  const serviceCreditCourseOptions = useMemo(
    () =>
      eligibleCourseCompletions.filter(
        (entry) => toLearnerKey(entry.user) === serviceCreditForm.user_id,
      ),
    [eligibleCourseCompletions, serviceCreditForm.user_id],
  );

  const serviceCreditEventOptions = useMemo(
    () =>
      eligibleEventAttendances.filter(
        (entry) => toLearnerKey(entry.user) === serviceCreditForm.user_id,
      ),
    [eligibleEventAttendances, serviceCreditForm.user_id],
  );

  const certificateCourseOptions = useMemo(
    () =>
      eligibleCourseCompletions.filter(
        (entry) =>
          toLearnerKey(entry.user) === certificateForm.user_id &&
          !entry.certificate_already_issued,
      ),
    [certificateForm.user_id, eligibleCourseCompletions],
  );

  const certificateEventOptions = useMemo(
    () =>
      eligibleEventAttendances.filter(
        (entry) =>
          toLearnerKey(entry.user) === certificateForm.user_id &&
          !entry.certificate_already_issued,
      ),
    [certificateForm.user_id, eligibleEventAttendances],
  );

  const certificateServiceCreditOptions = useMemo(
    () =>
      eligibleServiceCreditCertificates.filter(
        (entry) =>
          toLearnerKey(entry.user) === certificateForm.user_id &&
          !entry.certificate_already_issued,
      ),
    [certificateForm.user_id, eligibleServiceCreditCertificates],
  );

  const trustReadyCount = useMemo(
    () =>
      eligibleCourseCompletions.filter((entry) => !entry.certificate_already_issued).length +
      eligibleEventAttendances.filter((entry) => !entry.certificate_already_issued).length +
      eligibleServiceCreditCertificates.filter((entry) => !entry.certificate_already_issued).length,
    [
      eligibleCourseCompletions,
      eligibleEventAttendances,
      eligibleServiceCreditCertificates,
    ],
  );

  useEffect(() => {
    setServiceCreditForm((current) => ({
      ...current,
      event_id: current.evidence_type === "event" ? current.event_id : "",
      course_id: current.evidence_type === "course" ? current.course_id : "",
      community_id: current.evidence_type === "community" ? current.community_id : "",
    }));
  }, [serviceCreditForm.evidence_type]);

  useEffect(() => {
    setCertificateForm((current) => ({
      ...current,
      course_id: current.source_type === "course_completion" ? current.course_id : "",
      event_id: current.source_type === "event_participation" ? current.event_id : "",
      service_credit_id: current.source_type === "service_credit" ? current.service_credit_id : "",
    }));
  }, [certificateForm.source_type]);

  const handleCreateCommunity = async () => {
    setSubmittingKey("community");
    try {
      await createCommunity({
        title: communityForm.title,
        description: communityForm.description,
        category: communityForm.category,
        tags: parseTags(communityForm.tags),
        visibility: communityForm.visibility,
      });
      setCommunityForm(defaultCommunityForm);
      await load();
      toast({
        title: "Community created",
        description: "The new group is now available on the communities page.",
      });
    } catch (submitError) {
      toast({
        title: "Unable to create community",
        description: submitError.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmittingKey("");
    }
  };

  const handleIssueServiceCredit = async () => {
    const missingEvidence =
      (serviceCreditForm.evidence_type === "event" && !serviceCreditForm.event_id) ||
      (serviceCreditForm.evidence_type === "course" && !serviceCreditForm.course_id) ||
      (serviceCreditForm.evidence_type === "community" && !serviceCreditForm.community_id);
    if (!serviceCreditForm.user_id || missingEvidence) {
      toast({
        title: "Complete the service-credit form",
        description: "Select one learner and one evidence source before issuing the record.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingKey("service-credit");
    try {
      await issueOrganizationServiceCredit(buildEvidencePayload(serviceCreditForm));
      setServiceCreditForm(defaultServiceCreditForm);
      await load();
      toast({
        title: "Service credit issued",
        description: "The learner now has a verified service-credit record.",
      });
    } catch (submitError) {
      toast({
        title: "Unable to issue service credit",
        description: submitError.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmittingKey("");
    }
  };

  const handleIssueCertificate = async () => {
    const missingSource =
      (certificateForm.source_type === "course_completion" && !certificateForm.course_id) ||
      (certificateForm.source_type === "event_participation" && !certificateForm.event_id) ||
      (certificateForm.source_type === "service_credit" && !certificateForm.service_credit_id);
    if (!certificateForm.user_id || missingSource) {
      toast({
        title: "Complete the certificate form",
        description: "Select one learner and one eligible source before issuing the certificate.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingKey("certificate");
    try {
      await issueOrganizationCertificate(buildCertificatePayload(certificateForm));
      setCertificateForm(defaultCertificateForm);
      await load();
      toast({
        title: "Certificate issued",
        description: "The learner can now verify it through the public certificate link.",
      });
    } catch (submitError) {
      toast({
        title: "Unable to issue certificate",
        description: submitError.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmittingKey("");
    }
  };

  const handleRevokeServiceCredit = async (record) => {
    const key = `service-credit-${record.id}`;
    setSubmittingKey(key);
    try {
      await revokeOrganizationServiceCredit(record.id, revokeReasons[key] || "");
      await load();
      toast({
        title: "Service credit revoked",
        description: "The learner has been notified and the record now shows revoked.",
      });
    } catch (revokeError) {
      toast({
        title: "Unable to revoke service credit",
        description: revokeError.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmittingKey("");
    }
  };

  const handleRevokeCertificate = async (certificate) => {
    const key = `certificate-${certificate.id}`;
    setSubmittingKey(key);
    try {
      await revokeOrganizationCertificate(certificate.id, revokeReasons[key] || "");
      await load();
      toast({
        title: "Certificate revoked",
        description: "The public verification record now shows revoked status.",
      });
    } catch (revokeError) {
      toast({
        title: "Unable to revoke certificate",
        description: revokeError.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmittingKey("");
    }
  };

  if (loading && !overview) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={Users} label="Communities" value={communities.length} />
        <MetricCard icon={Award} label="Service credits" value={serviceCredits.length} />
        <MetricCard icon={BookOpen} label="Certificates" value={certificates.length} />
        <MetricCard
          icon={ShieldCheck}
          label="Trust ready"
          value={trustReadyCount}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Community groups
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create field or initiative-based spaces that extend collaboration beyond one-to-one swaps.
              </p>
            </div>
            <StatusBadge
              status={verified ? "verified" : "unverified"}
              label={verified ? "Verified org" : "Verification required"}
            />
          </div>
          {!verified ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Verified organizations can create communities, issue service-credit records, and issue certificates.
            </div>
          ) : null}
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Input
              placeholder="Community title"
              value={communityForm.title}
              onChange={(event) =>
                setCommunityForm((current) => ({ ...current, title: event.target.value }))
              }
            />
            <Input
              placeholder="Category"
              value={communityForm.category}
              onChange={(event) =>
                setCommunityForm((current) => ({ ...current, category: event.target.value }))
              }
            />
            <div className="lg:col-span-2">
              <Textarea
                rows={3}
                placeholder="What is this group for?"
                value={communityForm.description}
                onChange={(event) =>
                  setCommunityForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            <Input
              placeholder="Tags (comma separated)"
              value={communityForm.tags}
              onChange={(event) =>
                setCommunityForm((current) => ({ ...current, tags: event.target.value }))
              }
            />
            <select
              value={communityForm.visibility}
              onChange={(event) =>
                setCommunityForm((current) => ({ ...current, visibility: event.target.value }))
              }
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="public">Public</option>
              <option value="members_only">Members only</option>
            </select>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              disabled={!verified || submittingKey === "community"}
              onClick={handleCreateCommunity}
            >
              Create community
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {communities.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No communities yet"
                description="Create your first community space once your organization is verified."
              />
            ) : (
              communities.map((community) => (
                <div key={community.id} className="rounded-2xl border border-border/50 bg-secondary/10 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-foreground">{community.title}</h3>
                    <StatusBadge status={community.visibility} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{community.description}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{community.membership_count} members</span>
                    <span>{community.post_count} posts</span>
                    <span>{community.category || "General"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Issue service credit
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              One verified record must map to one learner and one evidence source.
            </p>
            <div className="mt-4 space-y-3">
              <select
                value={serviceCreditForm.user_id}
                onChange={(event) =>
                  setServiceCreditForm((current) => ({
                    ...current,
                    user_id: event.target.value,
                    event_id: "",
                    course_id: "",
                    community_id: "",
                  }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select learner</option>
                {eligiblePeople.map((user) => (
                  <option key={user.id} value={String(user.id)}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>

              <select
                value={serviceCreditForm.evidence_type}
                onChange={(event) =>
                  setServiceCreditForm((current) => ({
                    ...current,
                    evidence_type: event.target.value,
                    event_id: "",
                    course_id: "",
                    community_id: "",
                  }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="event">Event evidence</option>
                <option value="course">Course evidence</option>
                <option value="community">Community evidence</option>
              </select>

              {serviceCreditForm.evidence_type === "event" ? (
                <select
                  value={serviceCreditForm.event_id}
                  onChange={(event) =>
                    setServiceCreditForm((current) => ({ ...current, event_id: event.target.value }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select attended event</option>
                  {serviceCreditEventOptions.map((entry) => (
                    <option key={`${entry.user?.id}-${entry.event?.id}`} value={String(entry.event?.id || "")}>
                      {entry.event?.title}
                    </option>
                  ))}
                </select>
              ) : null}

              {serviceCreditForm.evidence_type === "course" ? (
                <select
                  value={serviceCreditForm.course_id}
                  onChange={(event) =>
                    setServiceCreditForm((current) => ({ ...current, course_id: event.target.value }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select completed course</option>
                  {serviceCreditCourseOptions.map((entry) => (
                    <option key={`${entry.user?.id}-${entry.course?.id}`} value={String(entry.course?.id || "")}>
                      {entry.course?.title}
                    </option>
                  ))}
                </select>
              ) : null}

              {serviceCreditForm.evidence_type === "community" ? (
                <>
                  <select
                    value={serviceCreditForm.community_id}
                    onChange={(event) =>
                      setServiceCreditForm((current) => ({ ...current, community_id: event.target.value }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">Select community</option>
                    {communities.map((community) => (
                      <option key={community.id} value={String(community.id)}>
                        {community.title}
                      </option>
                    ))}
                  </select>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    Community evidence requires that the learner is already a member of the selected community.
                  </div>
                </>
              ) : null}

              <Input
                placeholder="Record title"
                value={serviceCreditForm.title}
                onChange={(event) =>
                  setServiceCreditForm((current) => ({ ...current, title: event.target.value }))
                }
              />
              <Input
                placeholder="Credit hours"
                value={serviceCreditForm.credit_hours}
                onChange={(event) =>
                  setServiceCreditForm((current) => ({ ...current, credit_hours: event.target.value }))
                }
              />
              <Textarea
                rows={2}
                placeholder="What was verified?"
                value={serviceCreditForm.description}
                onChange={(event) =>
                  setServiceCreditForm((current) => ({ ...current, description: event.target.value }))
                }
              />
              <Textarea
                rows={2}
                placeholder="Evidence note"
                value={serviceCreditForm.evidence_note}
                onChange={(event) =>
                  setServiceCreditForm((current) => ({ ...current, evidence_note: event.target.value }))
                }
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                disabled={!verified || submittingKey === "service-credit"}
                onClick={handleIssueServiceCredit}
              >
                Issue service credit
              </Button>
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Issue certificate
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Only eligible records that do not already have an active certificate appear below.
            </p>
            <div className="mt-4 space-y-3">
              <select
                value={certificateForm.source_type}
                onChange={(event) =>
                  setCertificateForm((current) => ({
                    ...current,
                    source_type: event.target.value,
                    course_id: "",
                    event_id: "",
                    service_credit_id: "",
                  }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="course_completion">Course completion</option>
                <option value="event_participation">Event participation</option>
                <option value="service_credit">Service credit</option>
              </select>
              <select
                value={certificateForm.user_id}
                onChange={(event) =>
                  setCertificateForm((current) => ({
                    ...current,
                    user_id: event.target.value,
                    course_id: "",
                    event_id: "",
                    service_credit_id: "",
                  }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select learner</option>
                {eligiblePeople.map((user) => (
                  <option key={user.id} value={String(user.id)}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>

              {certificateForm.source_type === "course_completion" ? (
                <select
                  value={certificateForm.course_id}
                  onChange={(event) =>
                    setCertificateForm((current) => ({ ...current, course_id: event.target.value }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select eligible course</option>
                  {certificateCourseOptions.map((entry) => (
                    <option key={`${entry.user?.id}-${entry.course?.id}`} value={String(entry.course?.id || "")}>
                      {entry.course?.title}
                    </option>
                  ))}
                </select>
              ) : null}

              {certificateForm.source_type === "event_participation" ? (
                <select
                  value={certificateForm.event_id}
                  onChange={(event) =>
                    setCertificateForm((current) => ({ ...current, event_id: event.target.value }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select eligible event</option>
                  {certificateEventOptions.map((entry) => (
                    <option key={`${entry.user?.id}-${entry.event?.id}`} value={String(entry.event?.id || "")}>
                      {entry.event?.title}
                    </option>
                  ))}
                </select>
              ) : null}

              {certificateForm.source_type === "service_credit" ? (
                <select
                  value={certificateForm.service_credit_id}
                  onChange={(event) =>
                    setCertificateForm((current) => ({ ...current, service_credit_id: event.target.value }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select eligible service credit</option>
                  {certificateServiceCreditOptions.map((entry) => (
                    <option
                      key={`${entry.user?.id}-${entry.service_credit?.id}`}
                      value={String(entry.service_credit?.id || "")}
                    >
                      {entry.service_credit?.title}
                    </option>
                  ))}
                </select>
              ) : null}

              {certificateForm.user_id &&
              certificateForm.source_type === "course_completion" &&
              certificateCourseOptions.length === 0 ? (
                <EmptyHint text="No eligible course completions remain for this learner." />
              ) : null}
              {certificateForm.user_id &&
              certificateForm.source_type === "event_participation" &&
              certificateEventOptions.length === 0 ? (
                <EmptyHint text="No eligible event participations remain for this learner." />
              ) : null}
              {certificateForm.user_id &&
              certificateForm.source_type === "service_credit" &&
              certificateServiceCreditOptions.length === 0 ? (
                <EmptyHint text="No eligible service-credit records remain for this learner." />
              ) : null}

              <Input
                placeholder="Optional custom title"
                value={certificateForm.title}
                onChange={(event) =>
                  setCertificateForm((current) => ({ ...current, title: event.target.value }))
                }
              />
              <Textarea
                rows={2}
                placeholder="Optional custom summary"
                value={certificateForm.summary}
                onChange={(event) =>
                  setCertificateForm((current) => ({ ...current, summary: event.target.value }))
                }
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                disabled={!verified || submittingKey === "certificate"}
                onClick={handleIssueCertificate}
              >
                Issue certificate
              </Button>
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
          <h2 className="font-heading text-lg font-semibold text-foreground">Issued service credits</h2>
          <div className="mt-4 space-y-3">
            {serviceCredits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No service-credit records have been issued yet.
              </p>
            ) : (
              serviceCredits.slice(0, 8).map((record) => {
                const key = `service-credit-${record.id}`;
                const canRevoke = record.status === "issued";
                return (
                  <div key={record.id} className="rounded-2xl bg-secondary/15 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-foreground">{record.title}</div>
                      <StatusBadge status={record.status} />
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {record.user?.full_name || record.user?.email} - {record.credit_hours} hours - {formatDate(record.issued_at)}
                    </div>
                    {canRevoke ? (
                      <div className="mt-4 space-y-3">
                        <Textarea
                          rows={2}
                          placeholder="Optional revoke reason"
                          value={revokeReasons[key] || ""}
                          onChange={(event) =>
                            setRevokeReasons((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                        />
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            disabled={submittingKey === key}
                            onClick={() => handleRevokeServiceCredit(record)}
                          >
                            Revoke record
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
          <h2 className="font-heading text-lg font-semibold text-foreground">Issued certificates</h2>
          <div className="mt-4 space-y-3">
            {certificates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No certificates have been issued yet.
              </p>
            ) : (
              certificates.slice(0, 8).map((certificate) => {
                const key = `certificate-${certificate.id}`;
                const canRevoke = certificate.status === "active";
                return (
                  <div key={certificate.id} className="rounded-2xl bg-secondary/15 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-foreground">{certificate.title}</div>
                      <StatusBadge status={certificate.status} />
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {certificate.user?.full_name || certificate.user?.email} - {certificate.certificate_id}
                    </div>
                    {canRevoke ? (
                      <div className="mt-4 space-y-3">
                        <Textarea
                          rows={2}
                          placeholder="Optional revoke reason"
                          value={revokeReasons[key] || ""}
                          onChange={(event) =>
                            setRevokeReasons((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                        />
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            disabled={submittingKey === key}
                            onClick={() => handleRevokeCertificate(certificate)}
                          >
                            Revoke certificate
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-2 font-heading text-3xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function EmptyHint({ text }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{text}</span>
      </div>
    </div>
  );
}
