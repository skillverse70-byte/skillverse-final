import { useEffect, useState } from "react";
import {
  fetchOrganizationProfileData,
  saveOrganizationProfile,
  uploadOrganizationLogo,
} from "@/services/organizations/organization.service";

const emptyOrganizationForm = {
  name: "",
  description: "",
  logo_url: "",
  website: "",
  category: "",
  contact_email: "",
};

export function useOrganizationProfile() {
  const [me, setMe] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [form, setForm] = useState(emptyOrganizationForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchOrganizationProfileData();
        if (!active) {
          return;
        }
        setMe(data.user);
        setOrganization(data.organization);
        if (data.organization) {
          setForm({
            name: data.organization.name || "",
            description: data.organization.description || "",
            logo_url: data.organization.logo_url || "",
            website: data.organization.website || "",
            category: data.organization.category || "",
            contact_email: data.organization.contact_email || "",
          });
        }
      } catch (error) {
        console.error(error);
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
  }, []);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const persistOrganization = async () => {
    setSaving(true);
    try {
      const nextOrganization = await saveOrganizationProfile({
        organizationId: organization?.id,
        form,
        userId: me.id,
      });
      setOrganization(nextOrganization);
      return nextOrganization;
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file) => {
    setUploading(true);
    try {
      const result = await uploadOrganizationLogo(file);
      setField("logo_url", result.file_url);
      return result;
    } finally {
      setUploading(false);
    }
  };

  return {
    me,
    organization,
    form,
    setField,
    loading,
    saving,
    uploading,
    persistOrganization,
    uploadLogo,
  };
}
