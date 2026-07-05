import { authService } from "@/services/auth/auth.service";
import { appClient } from "@/services/appClient";

export async function fetchSkillPortfolioData() {
  const user = await authService.me();
  const skills = await appClient.entities.UserSkill.filter({
    user_id: user.id,
  });

  return { user, skills };
}

export function createUserSkill(payload) {
  return appClient.entities.UserSkill.create(payload);
}

export function updateUserSkill(id, updates) {
  return appClient.entities.UserSkill.update(id, updates);
}

export function deleteUserSkill(id) {
  return appClient.entities.UserSkill.delete(id);
}
