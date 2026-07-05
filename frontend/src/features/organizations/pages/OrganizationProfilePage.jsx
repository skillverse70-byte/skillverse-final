import React from "react";
import { Building, Upload } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import PageLoader from "@/components/shared/PageLoader";
import PageHeader from "@/components/shared/PageHeader";
import OrganizationProfileForm from "@/features/organizations/components/OrganizationProfileForm";
import { useOrganizationProfile } from "@/hooks/organizations/useOrganizationProfile";

export default function OrganizationProfilePage() {
  const {
    organization,
    form,
    setField,
    loading,
    saving,
    uploading,
    persistOrganization,
    uploadLogo,
  } = useOrganizationProfile();
  const { toast } = useToast();

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    try {
      await uploadLogo(file);
    } catch (error) {
      console.error(error);
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

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
        description="Update your organization's information and logo."
      />

      <div className="bg-white rounded-2xl border border-border/50 p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/50">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-teal-50 flex items-center justify-center flex-shrink-0">
            {form.logo_url ? (
              <img
                src={form.logo_url}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <Building className="w-8 h-8 text-teal-600" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-heading font-bold text-xl">
              {form.name || "Your Organization"}
            </h2>
            {organization ? (
              <div className="mt-1">
                <StatusBadge organization={organization} />
              </div>
            ) : null}
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <span className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium">
              <Upload className="w-4 h-4" />{" "}
              {uploading ? "Uploading..." : "Upload Logo"}
            </span>
          </label>
        </div>

        <OrganizationProfileForm
          form={form}
          setField={setField}
          saving={saving}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
