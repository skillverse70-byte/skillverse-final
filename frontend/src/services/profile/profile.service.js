import { authService } from "@/services/auth/auth.service";
import { appClient } from "@/services/appClient";

export async function fetchProfileData() {
  const user = await authService.me();
  const profiles = await appClient.entities.UserProfile.filter({
    user_id: user.id,
  });

  return {
    user,
    profile: profiles[0] || null,
  };
}

export async function saveProfile({ profileId, form, userId }) {
  if (profileId) {
    return appClient.entities.UserProfile.update(profileId, form);
  }

  return appClient.entities.UserProfile.create({
    ...form,
    user_id: userId,
  });
}
