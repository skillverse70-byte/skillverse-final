import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Award, Search, ShieldCheck } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import ModuleDetailShell from "@/components/shared/ModuleDetailShell";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useDetailPageTab } from "@/hooks/dashboard/useDetailPageTab";
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
  const { isAuthenticated, actorRole, navigateToLogin } = useAuth();
  const [lookupValue, setLookupValue] = useState("");
  const [portfolio, setPortfolio] = useState({ certificates: [], service_credits: [] });
  const [loading, setLoading] = useState(isAuthenticated);
  const [error, setError] = useState("");
  const certificateTabs = useMemo(
    () => [
      {
        value: "lookup",
        label: "Verify a record",
        description: "Public certificate lookup for trust checks and direct verification.",
        icon: Search,
      },
      {
        value: "certificates",
        label: "My certificates",
        description: "Issued certificates that belong to your account.",
        icon: Award,
        badge: isAuthenticated ? portfolio.certificates.length : null,
      },
      {
        value: "service",
        label: "Service credits",
        description: "Participation and service-credit records issued through the platform.",
        icon: ShieldCheck,
        badge: isAuthenticated ? portfolio.service_credits.length : null,
      },
    ],
    [isAuthenticated, portfolio.certificates.length, portfolio.service_credits.length],
  );
  const { activeTab, setActiveTab } = useDetailPageTab(
    certificateTabs.map((tab) => tab.value),
    "lookup",
  );

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
    <ModuleDetailShell
      eyebrow="Trust and verification"
      title="Certificates and verified records"
      description="Verify public records first, then open your personal certificate and service-credit history only when you need it."
      value={activeTab}
      onValueChange={setActiveTab}
      tabs={certificateTabs}
      actions={
        <>
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
        </>
      }
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <TabsContent value="lookup" className="mt-0 space-y-6">
        <section className="rounded-[2rem] border border-border/60 bg-white p-8 shadow-sm shadow-black/5">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Public certificate verification
          </div>
          <h2 className="mt-4 font-heading text-2xl font-bold text-foreground">
            Check a certificate or record ID
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Enter a certificate ID to open the public verification view. Personal records stay in their own tabs so this lookup flow remains clean and public-facing.
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
          </div>
        </section>

        {isAuthenticated ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-heading text-xl font-semibold text-foreground">
                    My certificates
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Review issued certificates without mixing them into the public lookup workflow.
                  </p>
                </div>
                <div className="rounded-2xl bg-secondary px-3 py-2 text-center">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Records
                  </div>
                  <div className="font-heading text-2xl font-bold text-foreground">
                    {portfolio.certificates.length}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="mt-5"
                onClick={() => setActiveTab("certificates")}
              >
                Open certificate history
              </Button>
            </section>

            <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-heading text-xl font-semibold text-foreground">
                    Service-credit records
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Track participation and community-service records in their own workspace tab.
                  </p>
                </div>
                <div className="rounded-2xl bg-secondary px-3 py-2 text-center">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Records
                  </div>
                  <div className="font-heading text-2xl font-bold text-foreground">
                    {portfolio.service_credits.length}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="mt-5"
                onClick={() => setActiveTab("service")}
              >
                Open service credits
              </Button>
            </section>
          </div>
        ) : (
          <EmptyState
            icon={Award}
            title="Sign in to see your records"
            description="Public certificate lookup is available above. Your personal certificates and service-credit records appear in the other tabs after sign-in."
            actionLabel="Log in"
            onAction={navigateToLogin}
          />
        )}
      </TabsContent>

      <TabsContent value="certificates" className="mt-0">
        {!isAuthenticated ? (
          <EmptyState
            icon={Award}
            title="Sign in to see your certificates"
            description="This tab is reserved for the certificates issued to your account."
            actionLabel="Log in"
            onAction={navigateToLogin}
          />
        ) : (
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
                      {certificate.organization?.name} - {certificate.certificate_id}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Issued {formatDate(certificate.issued_at)}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        )}
      </TabsContent>

      <TabsContent value="service" className="mt-0">
        {!isAuthenticated ? (
          <EmptyState
            icon={ShieldCheck}
            title="Sign in to see your service credits"
            description="This tab is reserved for participation and service-credit records linked to your account."
            actionLabel="Log in"
            onAction={navigateToLogin}
          />
        ) : (
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
                      {record.organization?.name} - {record.credit_hours} hours
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Issued {formatDate(record.issued_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </TabsContent>
    </ModuleDetailShell>
  );
}
