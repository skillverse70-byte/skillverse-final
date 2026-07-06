import React from "react";
import { Building, ExternalLink, FileText, Globe, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/shared/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import PageLoader from "@/components/shared/PageLoader";
import PageHeader from "@/components/shared/PageHeader";
import OrganizationProfileForm from "@/features/organizations/components/OrganizationProfileForm";
import VerificationStatusCard from "@/features/organizations/components/VerificationStatusCard";
import { useOrganizationVerification } from "@/hooks/organizations/useOrganizationVerification";
import { useOrganizationProfile } from "@/hooks/organizations/useOrganizationProfile";

export default function OrganizationProfilePage() {
  const {
    organization,
    form,
    setField,
    loading,
    saving,
    persistOrganization,
  } = useOrganizationProfile();
  const {
    overview,
    loading: verificationLoading,
    submitting,
    error: verificationError,
    submitRequest,
  } = useOrganizationVerification();
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await persistOrganization();
      toast({ title: "Organization saved!" });
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Organization Profile"
        description="Review and extend the organization details already collected at signup so learners and applicants can evaluate your public trust-sensitive profile."
      />

      <div className="space-y-6">
        <div className="rounded-3xl border border-border/50 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-teal-50">
                <Building className="h-8 w-8 text-teal-600" />
              </div>
              <div className="space-y-3">
                <div>
                  <h2 className="font-heading text-xl font-bold">
                    {organization?.name || "Your Organization"}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {organization ? <StatusBadge organization={organization} /> : null}
                    {organization?.type ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                        {organization.type.replaceAll("_", " ")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Unverified organizations can still publish permitted free offerings. Verified status becomes especially important anywhere users evaluate trust-sensitive offerings like courses, opportunities, and paid enrollment readiness.
                </p>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Paid course authoring is locked until verification is approved. Once verified, paid courses may be prepared, but learner enrollment stays unavailable until financial setup is introduced.
                </p>
              </div>
            </div>
            {organization ? (
              <Link
                to={`/organizations/${organization.id}`}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-slate-50"
              >
                View public profile
                <ExternalLink className="h-4 w-4" />
              </Link>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 border-t border-border/50 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Mail className="h-4 w-4 text-teal-700" />
                Contact email
              </div>
              <p className="text-sm text-muted-foreground">
                {organization?.contact_email || "Add a primary public contact email."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <MapPin className="h-4 w-4 text-teal-700" />
                Location
              </div>
              <p className="text-sm text-muted-foreground">
                {[organization?.location, organization?.country].filter(Boolean).join(", ") || "Add a country or location."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Phone className="h-4 w-4 text-teal-700" />
                Contact phone
              </div>
              <p className="text-sm text-muted-foreground">
                {organization?.contact_phone || "Optional public contact phone."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="h-4 w-4 text-teal-700" />
                Verification evidence
              </div>
              <p className="text-sm text-muted-foreground">
                {organization?.has_business_license ? "A document is already on file." : "No supporting document uploaded yet."}
              </p>
            </div>
          </div>
        </div>

        {!verificationLoading ? (
          <VerificationStatusCard
            organization={organization}
            overview={overview}
            submitting={submitting}
            onSubmitRequest={async (requestNotes) => {
              try {
                await submitRequest(requestNotes);
                toast({
                  title: "Verification request submitted",
                  description: "Your organization is now in the trust review queue.",
                });
              } catch (error) {
                console.error(error);
                toast({
                  title: "Unable to submit verification request",
                  description: verificationError || error.message,
                  variant: "destructive",
                });
              }
            }}
          />
        ) : null}

        <div className="rounded-3xl border border-border/50 bg-white p-6 sm:p-8">
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
            <Globe className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              This profile is public-facing for organizations. Regular-user profiles remain private, but organization trust state must be visible anywhere users evaluate your offerings.
            </p>
          </div>

          <OrganizationProfileForm
            form={form}
            setField={setField}
            saving={saving}
            onSave={handleSave}
            organization={organization}
          />
        </div>
      </div>
    </div>
  );
}
