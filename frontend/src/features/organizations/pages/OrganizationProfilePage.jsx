import React from "react";
import {
  Building,
  ExternalLink,
  FileText,
  Globe,
  Landmark,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/shared/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import PageLoader from "@/components/shared/PageLoader";
import WorkspaceShell from "@/components/shared/WorkspaceShell";
import { TabsContent } from "@/components/ui/tabs";
import OrganizationProfileForm from "@/features/organizations/components/OrganizationProfileForm";
import FinancialAccountSetupCard from "@/features/organizations/components/FinancialAccountSetupCard";
import VerificationStatusCard from "@/features/organizations/components/VerificationStatusCard";
import { Button } from "@/components/ui/button";
import { saveFinancialAccountSetup } from "@/services/organizations/organization.service";
import { useOrganizationVerification } from "@/hooks/organizations/useOrganizationVerification";
import { useOrganizationProfile } from "@/hooks/organizations/useOrganizationProfile";

export default function OrganizationProfilePage() {
  const {
    organization,
    financialAccount,
    setFinancialAccount,
    form,
    setField,
    loading,
    saving,
    persistOrganization,
  } = useOrganizationProfile();
  const [savingFinancialAccount, setSavingFinancialAccount] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");
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

  const handleFinancialSave = async (financialForm) => {
    setSavingFinancialAccount(true);
    try {
      const nextFinancialAccount = await saveFinancialAccountSetup(financialForm);
      setFinancialAccount(nextFinancialAccount);
      toast({
        title: "Financial setup saved",
        description: "Monetization readiness has been updated.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to save financial setup",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSavingFinancialAccount(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  const tabs = [
    {
      value: "overview",
      label: "Overview",
      icon: Building,
      description: "Public-facing trust summary, contact visibility, and profile status.",
    },
    {
      value: "profile",
      label: "Profile Details",
      icon: Globe,
      description: "Editable public organization information and offerings summary.",
    },
    {
      value: "verification",
      label: "Verification",
      icon: ShieldCheck,
      description: "Trust review status, supporting evidence, and submission flow.",
    },
    {
      value: "finance",
      label: "Finance Setup",
      icon: Landmark,
      description: "Payout readiness for paid enrollments and monetized courses.",
    },
  ];

  return (
    <WorkspaceShell
      eyebrow="Organization profile"
      title={organization?.name || "Organization Profile"}
      description="Keep trust-sensitive organization details organized so learners and applicants can evaluate your public identity without everything living in one long page."
      value={activeTab}
      onValueChange={setActiveTab}
      tabs={tabs}
      actions={
        organization ? (
          <Link to={`/organizations/${organization.id}`}>
            <Button variant="outline" className="gap-2">
              View public profile
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        ) : null
      }
    >
      <TabsContent value="overview" className="mt-0 space-y-6">
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
          </div>

          <div className="mt-6 grid gap-3 border-t border-border/50 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard
              icon={Mail}
              title="Contact email"
              body={organization?.contact_email || "Add a primary public contact email."}
            />
            <InfoCard
              icon={MapPin}
              title="Location"
              body={
                [organization?.location, organization?.country].filter(Boolean).join(", ") ||
                "Add a country or location."
              }
            />
            <InfoCard
              icon={Phone}
              title="Contact phone"
              body={organization?.contact_phone || "Optional public contact phone."}
            />
            <InfoCard
              icon={FileText}
              title="Verification evidence"
              body={
                organization?.has_business_license
                  ? "A document is already on file."
                  : "No supporting document uploaded yet."
              }
            />
          </div>
        </div>

        <div className="rounded-3xl border border-border/50 bg-white p-6 sm:p-8">
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
            <Globe className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              This profile is public-facing for organizations. Regular-user profiles remain private, but organization trust state must be visible anywhere users evaluate your offerings.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <SummaryMetric
              label="Trust status"
              value={organization?.verification_status || "unverified"}
            />
            <SummaryMetric
              label="Finance status"
              value={financialAccount?.status || "not_started"}
            />
            <SummaryMetric
              label="Verification request"
              value={overview?.pending_request ? "pending" : "not_started"}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="profile" className="mt-0">
        <div className="rounded-3xl border border-border/50 bg-white p-6 sm:p-8">
          <OrganizationProfileForm
            form={form}
            setField={setField}
            saving={saving}
            onSave={handleSave}
            organization={organization}
          />
        </div>
      </TabsContent>

      <TabsContent value="verification" className="mt-0">
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
      </TabsContent>

      <TabsContent value="finance" className="mt-0">
        <FinancialAccountSetupCard
          organization={organization}
          financialAccount={financialAccount}
          saving={savingFinancialAccount}
          onSave={handleFinancialSave}
        />
      </TabsContent>
    </WorkspaceShell>
  );
}

function InfoCard({ icon: Icon, title, body }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-teal-700" />
        {title}
      </div>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function SummaryMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 font-heading text-xl font-semibold capitalize text-foreground">
        {String(value).replaceAll("_", " ")}
      </div>
    </div>
  );
}
