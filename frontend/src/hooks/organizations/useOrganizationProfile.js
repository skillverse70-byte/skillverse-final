import { useEffect, useState } from "react";
import {
  fetchOrganizationProfileData,
  saveOrganizationProfile,
} from "@/services/organizations/organization.service";
import { organizationTypes } from "@/lib/domain-enums";

const emptyOrganizationForm = {
  name: "",
  description: "",
  type: organizationTypes.company,
  contact_email: "",
  country: "",
  location: "",
  website_url: "",
  contact_phone: "",
  offerings_summary: "",
  business_license: null,
};

export function useOrganizationProfile() {
  const [organization, setOrganization] = useState(null);
  const [form, setForm] = useState(emptyOrganizationForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchOrganizationProfileData();
        if (!active) {
          return;
        }
        setOrganization(data.organization);
        if (data.organization) {
          setForm({
            name: data.organization.name || "",
            description: data.organization.description || "",
            type: data.organization.type || organizationTypes.company,
            contact_email: data.organization.contact_email || "",
            country: data.organization.country || "",
            location: data.organization.location || "",
            website_url: data.organization.website_url || "",
            contact_phone: data.organization.contact_phone || "",
            offerings_summary: data.organization.offerings_summary || "",
            business_license: null,
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
      const nextOrganization = await saveOrganizationProfile({ form });
      setOrganization(nextOrganization);
      setForm((current) => ({
        ...current,
        business_license: null,
      }));
      return nextOrganization;
    } finally {
      setSaving(false);
    }
  };

  return {
    organization,
    form,
    setField,
    loading,
    saving,
    persistOrganization,
  };
}
