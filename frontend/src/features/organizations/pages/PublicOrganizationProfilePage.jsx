import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  FileText,
  Globe,
  MapPin,
  Phone,
} from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { fetchPublicOrganizationProfile } from "@/services/organizations/organization.service";

export default function PublicOrganizationProfilePage() {
  const { id } = useParams();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchPublicOrganizationProfile(id);
        if (active) {
          setOrganization(data);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Unable to load organization profile.");
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

  if (error || !organization) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <EmptyState
          icon={Building2}
          title="Organization not found"
          description={error || "This organization profile is unavailable."}
        />
      </div>
    );
  }

  const locationLabel =
    [organization.location, organization.country].filter(Boolean).join(", ") ||
    "Location not provided";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        to="/discover"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to discover
      </Link>

      <div className="overflow-hidden rounded-[28px] border border-border/50 bg-white">
        <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-white px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Building2 className="h-8 w-8 text-teal-600" />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusBadge organization={organization} />
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                    {organization.type.replaceAll("_", " ")}
                  </span>
                </div>
                <h1 className="font-heading text-3xl font-bold text-foreground">
                  {organization.name}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {organization.description}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 md:max-w-xs">
              Trust-sensitive surfaces must show organization verification state clearly.
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-2xl bg-slate-50 p-5">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                What this organization provides
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {organization.offerings_summary ||
                  "No offerings summary has been added yet."}
              </p>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-border/60 p-5">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Public details
              </h2>
              <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-teal-700" />
                  <span>{locationLabel}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 text-teal-700" />
                  <span>{organization.contact_phone || "Phone not provided"}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-4 w-4 text-teal-700" />
                  {organization.website_url ? (
                    <a
                      href={organization.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-teal-700 hover:underline"
                    >
                      {organization.website_url}
                    </a>
                  ) : (
                    <span>Website not provided</span>
                  )}
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 text-teal-700" />
                  <span>
                    {organization.has_business_license
                      ? "Supporting verification document on file"
                      : "No supporting verification document displayed"}
                  </span>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
