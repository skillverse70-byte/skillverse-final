import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Award, Search, ShieldCheck } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCertificatePortfolio } from "@/services/certificates/certificates.service";

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString();
}

export default function CertificatesPage() {
  const navigate = useNavigate();
  const { isAuthenticated, actorRole } = useAuth();
  const [lookupValue, setLookupValue] = useState("");
  const [portfolio, setPortfolio] = useState({ certificates: [], service_credits: [] });
  const [loading, setLoading] = useState(isAuthenticated);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setLoading(false);
      setPortfolio({ certificates: [], service_credits: [] });
      return () => {
        active = false;
      };
    }
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await fetchCertificatePortfolio();
        if (active) {
          setPortfolio(payload);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Unable to load your certificate workspace.");
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
  }, [isAuthenticated]);

  const openLookup = () => {
    const code = lookupValue.trim();
    if (!code) {
      return;
    }
    navigate(`/certificates/${encodeURIComponent(code)}`);
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[2rem] border border-border/60 bg-white p-8 shadow-sm shadow-black/5">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Trust and verification
          </div>
          <h1 className="mt-4 font-heading text-4xl font-bold text-foreground">
            Certificates and verified records
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Verify public certificates, review your own earned records, and track trust-bearing participation issued by verified organizations.
          </p>
          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <Input
              value={lookupValue}
              onChange={(event) => setLookupValue(event.target.value)}
              placeholder="Enter certificate ID, e.g. SV-CERT-AB12CD34"
            />
            <Button className="gap-2 bg-teal-600 hover:bg-teal-700" onClick={openLookup}>
              <Search className="h-4 w-4" />
              Verify certificate
            </Button>
            {actorRole === "organization" ? (
              <Link to="/org?tab=trust">
                <Button variant="outline">Manage in org workspace</Button>
              </Link>
            ) : null}
            {actorRole === "admin" ? (
              <Link to="/admin?tab=trust">
                <Button variant="outline">Open admin trust view</Button>
              </Link>
            ) : null}
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!isAuthenticated ? (
          <EmptyState
            icon={Award}
            title="Sign in to see your records"
            description="Public certificate lookup is available above. Your personal certificates and service-credit records appear here after sign-in."
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
              <h2 className="font-heading text-xl font-semibold text-foreground">My certificates</h2>
              <div className="mt-4 space-y-3">
                {portfolio.certificates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No certificates yet. Verified organizations will issue them after completed participation.
                  </p>
                ) : (
                  portfolio.certificates.map((certificate) => (
                    <Link
                      key={certificate.id}
                      to={`/certificates/${certificate.certificate_id}`}
                      className="block rounded-2xl border border-border/50 bg-secondary/10 p-4 transition hover:border-teal-200 hover:bg-teal-50/60"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-foreground">{certificate.title}</div>
                        <StatusBadge status={certificate.status} />
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {certificate.organization?.name} · {certificate.certificate_id}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Issued {formatDate(certificate.issued_at)}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
              <h2 className="font-heading text-xl font-semibold text-foreground">My service-credit records</h2>
              <div className="mt-4 space-y-3">
                {portfolio.service_credits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No service-credit records yet.
                  </p>
                ) : (
                  portfolio.service_credits.map((record) => (
                    <div key={record.id} className="rounded-2xl border border-border/50 bg-secondary/10 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-foreground">{record.title}</div>
                        <StatusBadge status={record.status} />
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {record.organization?.name} · {record.credit_hours} hours
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Issued {formatDate(record.issued_at)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
