import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Award, BookOpen, ExternalLink, ShieldCheck, Users } from "lucide-react";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  fetchAdminTrustOverview,
  revokeAdminCertificate,
  revokeAdminServiceCredit,
} from "@/services/certificates/certificates.service";

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString();
}

function filterByStatus(items, filterValue) {
  if (filterValue === "all") {
    return items;
  }
  return items.filter((item) => item.status === filterValue);
}

function filterBySearch(items, searchValue) {
  const query = String(searchValue || "").trim().toLowerCase();
  if (!query) {
    return items;
  }
  return items.filter((item) =>
    [
      item.title,
      item.subtitle,
      item.meta,
      item.searchEmail,
      item.searchOrganization,
      item.searchCertificateId,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)),
  );
}

export default function AdminTrustPanel() {
  const { toast } = useToast();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingKey, setSubmittingKey] = useState("");
  const [revokeReasons, setRevokeReasons] = useState({});
  const [serviceCreditFilter, setServiceCreditFilter] = useState("all");
  const [certificateFilter, setCertificateFilter] = useState("all");
  const [serviceCreditSearch, setServiceCreditSearch] = useState("");
  const [certificateSearch, setCertificateSearch] = useState("");
  const [pendingRevoke, setPendingRevoke] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchAdminTrustOverview();
      setOverview(payload);
      return payload;
    } catch (loadError) {
      setError(loadError.message || "Unable to load trust oversight.");
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

  const filteredServiceCredits = useMemo(
    () =>
      filterBySearch(
        filterByStatus(serviceCredits, serviceCreditFilter),
        serviceCreditSearch,
      ),
    [serviceCredits, serviceCreditFilter, serviceCreditSearch],
  );
  const filteredCertificates = useMemo(
    () =>
      filterBySearch(
        filterByStatus(certificates, certificateFilter),
        certificateSearch,
      ),
    [certificates, certificateFilter, certificateSearch],
  );

  const openRevokeDialog = (kind, item) => {
    setPendingRevoke({ kind, item });
  };

  const closeRevokeDialog = () => {
    setPendingRevoke(null);
  };

  const confirmRevoke = async () => {
    if (!pendingRevoke) {
      return;
    }

    const { kind, item } = pendingRevoke;
    const key = `${kind}-${item.id}`;
    setSubmittingKey(key);
    try {
      if (kind === "service-credit") {
        await revokeAdminServiceCredit(item.id, revokeReasons[key] || "");
        toast({
          title: "Service credit revoked",
          description: "The trust record now shows revoked across the platform.",
        });
      } else {
        await revokeAdminCertificate(item.id, revokeReasons[key] || "");
        toast({
          title: "Certificate revoked",
          description: "The public verification record now shows revoked status.",
        });
      }
      await load();
      closeRevokeDialog();
    } catch (revokeError) {
      toast({
        title: kind === "service-credit" ? "Unable to revoke service credit" : "Unable to revoke certificate",
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

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Users} label="Communities" value={communities.length} />
        <MetricCard icon={BookOpen} label="Service credits" value={serviceCredits.length} />
        <MetricCard icon={Award} label="Certificates" value={certificates.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TrustList
          title="Community oversight"
          items={communities.map((community) => ({
            id: community.id,
            title: community.title,
            subtitle: community.organization?.name || "Organization",
            status: community.visibility,
            meta: `${community.membership_count} members - ${community.post_count} posts`,
          }))}
          emptyText="No communities are live yet."
        />

        <TrustActionList
          title="Service-credit oversight"
          items={filteredServiceCredits.map((record) => ({
            id: record.id,
            title: record.title,
            subtitle: record.organization?.name || "Organization",
            status: record.status,
            meta: `${record.user?.full_name || record.user?.email} - ${record.credit_hours} hours - ${formatDate(record.issued_at)}`,
            searchEmail: record.user?.email || "",
            searchOrganization: record.organization?.name || "",
          }))}
          emptyText="No service-credit records match this filter."
          kind="service-credit"
          filterValue={serviceCreditFilter}
          onFilterChange={setServiceCreditFilter}
          filterOptions={[
            { value: "all", label: "All" },
            { value: "issued", label: "Issued" },
            { value: "revoked", label: "Revoked" },
          ]}
          searchValue={serviceCreditSearch}
          onSearchChange={setServiceCreditSearch}
          searchPlaceholder="Search by learner email or organization"
          submittingKey={submittingKey}
          revokeReasons={revokeReasons}
          setRevokeReasons={setRevokeReasons}
          onOpenRevokeDialog={openRevokeDialog}
        />

        <TrustActionList
          title="Certificate oversight"
          items={filteredCertificates.map((certificate) => ({
            id: certificate.id,
            title: certificate.title,
            subtitle: certificate.organization?.name || "Organization",
            status: certificate.status,
            meta: `${certificate.certificate_id} - ${certificate.user?.full_name || certificate.user?.email}`,
            publicUrl: `/certificates/${certificate.certificate_id}`,
            publicLabel: certificate.certificate_id,
            searchEmail: certificate.user?.email || "",
            searchOrganization: certificate.organization?.name || "",
            searchCertificateId: certificate.certificate_id || "",
          }))}
          emptyText="No certificates match this filter."
          kind="certificate"
          filterValue={certificateFilter}
          onFilterChange={setCertificateFilter}
          filterOptions={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "revoked", label: "Revoked" },
          ]}
          searchValue={certificateSearch}
          onSearchChange={setCertificateSearch}
          searchPlaceholder="Search by learner email, certificate ID, or organization"
          submittingKey={submittingKey}
          revokeReasons={revokeReasons}
          setRevokeReasons={setRevokeReasons}
          onOpenRevokeDialog={openRevokeDialog}
        />
      </div>

      <AlertDialog open={Boolean(pendingRevoke)} onOpenChange={(open) => !open && closeRevokeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Revoke {pendingRevoke?.kind === "service-credit" ? "service-credit record" : "certificate"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action updates the trust state immediately and should only be used when the record must no longer be considered active.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingRevoke ? (
            <div className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-teal-700" />
                {pendingRevoke.item.title}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{pendingRevoke.item.subtitle}</div>
              <div className="mt-2 text-xs text-muted-foreground">{pendingRevoke.item.meta}</div>
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(submittingKey)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={Boolean(submittingKey)}
              onClick={(event) => {
                event.preventDefault();
                void confirmRevoke();
              }}
            >
              Confirm revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function TrustList({ title, items, emptyText }) {
  return (
    <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
      <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          items.slice(0, 10).map((item) => (
            <div key={item.id} className="rounded-2xl bg-secondary/15 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-foreground">{item.title}</div>
                <StatusBadge status={item.status} />
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{item.subtitle}</div>
              <div className="mt-2 text-xs text-muted-foreground">{item.meta}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function TrustActionList({
  title,
  items,
  emptyText,
  kind,
  filterValue,
  onFilterChange,
  filterOptions,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  submittingKey,
  revokeReasons,
  setRevokeReasons,
  onOpenRevokeDialog,
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[320px]">
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={filterValue === option.value ? "default" : "outline"}
                className={filterValue === option.value ? "bg-teal-600 hover:bg-teal-700" : ""}
                onClick={() => onFilterChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          items.slice(0, 10).map((item) => {
            const key = `${kind}-${item.id}`;
            const canRevoke = item.status === "active" || item.status === "issued";
            return (
              <div key={item.id} className="rounded-2xl bg-secondary/15 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-foreground">{item.title}</div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{item.subtitle}</div>
                <div className="mt-2 text-xs text-muted-foreground">{item.meta}</div>

                {item.publicUrl ? (
                  <div className="mt-3">
                    <Link
                      to={item.publicUrl}
                      className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 transition hover:text-teal-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open public verification
                    </Link>
                  </div>
                ) : null}

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
                        onClick={() => onOpenRevokeDialog(kind, item)}
                      >
                        Revoke
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
  );
}
