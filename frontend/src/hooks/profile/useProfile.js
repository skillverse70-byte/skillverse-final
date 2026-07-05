import { useEffect, useMemo, useState } from "react";
import {
  addFieldInterest,
  fetchFieldInterestCatalog,
  fetchProfileData,
  removeFieldInterest,
  saveProfile,
} from "@/services/profile/profile.service";

const emptyProfileForm = {
  full_name: "",
  bio: "",
  interests_summary: "",
  experience_level: "",
};

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyProfileForm);
  const [fieldCatalog, setFieldCatalog] = useState([]);
  const [newFieldInterest, setNewFieldInterest] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingField, setSavingField] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [profileData, fieldCatalogData] = await Promise.all([
          fetchProfileData(),
          fetchFieldInterestCatalog(),
        ]);
        if (!active) {
          return;
        }
        setProfile(profileData);
        setFieldCatalog(fieldCatalogData);
        setForm({
          full_name: profileData.user?.full_name || "",
          bio: profileData.bio || "",
          interests_summary: profileData.interests_summary || "",
          experience_level: profileData.experience_level || "",
        });
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Failed to load your profile.");
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
  }, []);

  const availableFieldCatalog = useMemo(() => {
    const activeIds = new Set(
      (profile?.field_interests || []).map((entry) => entry.field_interest.id),
    );
    return fieldCatalog.filter((entry) => !activeIds.has(entry.id));
  }, [fieldCatalog, profile]);

  const persistProfile = async () => {
    setError("");
    setSavingProfile(true);
    try {
      const nextProfile = await saveProfile(form);
      setProfile(nextProfile);
      setForm({
        full_name: nextProfile.user?.full_name || "",
        bio: nextProfile.bio || "",
        interests_summary: nextProfile.interests_summary || "",
        experience_level: nextProfile.experience_level || "",
      });
      setEditing(false);
      return nextProfile;
    } catch (requestError) {
      setError(requestError.message || "Failed to save profile.");
      throw requestError;
    } finally {
      setSavingProfile(false);
    }
  };

  const createFieldInterest = async () => {
    const trimmed = newFieldInterest.trim();
    if (!trimmed) {
      return null;
    }

    setError("");
    setSavingField(true);
    try {
      const matchingCatalogEntry = availableFieldCatalog.find(
        (entry) => entry.name.toLowerCase() === trimmed.toLowerCase(),
      );
      const created = await addFieldInterest(
        matchingCatalogEntry
          ? { field_interest_id: matchingCatalogEntry.id }
          : { name: trimmed },
      );
      setProfile((current) => ({
        ...current,
        field_interests: [...(current?.field_interests || []), created],
      }));
      setNewFieldInterest("");
      return created;
    } catch (requestError) {
      setError(requestError.message || "Failed to add field interest.");
      throw requestError;
    } finally {
      setSavingField(false);
    }
  };

  const deleteFieldInterest = async (id) => {
    setError("");
    setSavingField(true);
    try {
      await removeFieldInterest(id);
      setProfile((current) => ({
        ...current,
        field_interests: (current?.field_interests || []).filter(
          (entry) => entry.id !== id,
        ),
      }));
    } catch (requestError) {
      setError(requestError.message || "Failed to remove field interest.");
      throw requestError;
    } finally {
      setSavingField(false);
    }
  };

  return {
    profile,
    editing,
    setEditing,
    form,
    setForm,
    fieldCatalog,
    availableFieldCatalog,
    newFieldInterest,
    setNewFieldInterest,
    loading,
    error,
    savingProfile,
    savingField,
    persistProfile,
    createFieldInterest,
    deleteFieldInterest,
  };
}
