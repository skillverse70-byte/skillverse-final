import { useEffect, useState } from "react";
import { fetchProfileData, saveProfile } from "@/services/profile/profile.service";

const emptyProfileForm = {
  display_name: "",
  bio: "",
  location: "",
};

export function useProfile() {
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyProfileForm);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchProfileData();
        if (!active) {
          return;
        }
        setMe(data.user);
        setProfile(data.profile);
        if (data.profile) {
          setForm({
            display_name: data.profile.display_name || "",
            bio: data.profile.bio || "",
            location: data.profile.location || "",
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

  const persistProfile = async () => {
    const nextProfile = await saveProfile({
      profileId: profile?.id,
      form,
      userId: me.id,
    });
    setProfile(nextProfile);
    setEditing(false);
    return nextProfile;
  };

  return {
    me,
    profile,
    editing,
    setEditing,
    form,
    setForm,
    loading,
    persistProfile,
  };
}
