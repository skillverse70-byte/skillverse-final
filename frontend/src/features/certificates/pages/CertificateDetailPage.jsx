import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, Award, BookOpen, Calendar, ShieldCheck } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { fetchCertificateDetail } from "@/services/certificates/certificates.service";

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString();
}

export default function CertificateDetailPage() {
  const { id } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await fetchCertificateDetail(id);
        if (active) {
          setCertificate(payload);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Certificate not found.");
        }
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
  }, [id]);

  if (loading) {
    return <PageLoader />;
  }

  if (!certificate) {
    return (
      <div className="px-4 py-12 sm:px-6">
        <EmptyState
          icon={Award}
          title="Certificate not found"
          description={error || "The certificate ID could not be verified."}
        />
      </div>
    );
  }

  const isRevoked = certificate.status === "revoked";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <section
          className={`rounded-[2rem] border bg-white p-8 shadow-sm shadow-black/5 ${
            isRevoked ? "border-red-200/80" : "border-emerald-200/70"
          }`}
        >
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              isRevoked
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isRevoked ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            {isRevoked ? "Revoked record" : "Public verification"}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl font-bold text-foreground">{certificate.title}</h1>
            <StatusBadge status={certificate.status} />
          </div>
          {isRevoked ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              This certificate has been revoked and should no longer be treated as an active verification record.
            </div>
          ) : null}
          <p className="mt-3 text-sm text-muted-foreground">{certificate.summary}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InfoCard label="Certificate ID" value={certificate.certificate_id} />
            <InfoCard label="Issued by" value={certificate.organization?.name || "Organization"} />
            <InfoCard label="Recipient" value={certificate.user?.full_name || certificate.user?.email || "Learner"} />
            <InfoCard label="Issued on" value={formatDate(certificate.issued_at)} />
            <InfoCard label="Source type" value={certificate.source_type.replaceAll("_", " ")} />
            <InfoCard label="Signature" value={certificate.signature_label} />
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {certificate.course_program ? (
            <Link
              to={`/courses/${certificate.course_program.id}`}
              className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-teal-700" />
                <h2 className="font-heading text-lg font-semibold text-foreground">Related course</h2>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{certificate.course_program.title}</p>
            </Link>
          ) : null}
          {certificate.event ? (
            <Link
              to={`/events/${certificate.event.id}`}
              className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-700" />
                <h2 className="font-heading text-lg font-semibold text-foreground">Related event</h2>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{certificate.event.title}</p>
            </Link>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 font-medium text-foreground">{value}</div>
    </div>
  );
}
