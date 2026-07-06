import { roles } from "@/lib/domain-enums";

const legacyRoleAliases = {
  user: roles.regularUser,
  regular_user: roles.regularUser,
  organization: roles.organization,
  org: roles.organization,
  admin: roles.admin,
};

export function normalizeActorRole(userOrRole) {
  if (!userOrRole) {
    return roles.guest;
  }

  if (typeof userOrRole === "string") {
    return legacyRoleAliases[userOrRole.toLowerCase()] || userOrRole.toLowerCase();
  }

  if (userOrRole.role) {
    return normalizeActorRole(userOrRole.role);
  }

  return userOrRole.isAuthenticated ? roles.regularUser : roles.guest;
}

export function hasAnyActorRole(user, allowedRoles = []) {
  if (!allowedRoles.length) {
    return true;
  }

  const normalizedRole = normalizeActorRole(user);
  const normalizedAllowedRoles = allowedRoles.map((role) => normalizeActorRole(role));
  return normalizedAllowedRoles.includes(normalizedRole);
}

export function isAuthenticatedActor(user) {
  return normalizeActorRole(user) !== roles.guest;
}

export function getActorHomePath(userOrRole) {
  const role = normalizeActorRole(userOrRole);

  if (role === roles.admin) {
    return "/admin";
  }

  if (role === roles.organization) {
    return "/org";
  }

  if (role === roles.regularUser) {
    return "/dashboard";
  }

  return "/discover";
}

export function getActorProfilePath(userOrRole) {
  const role = normalizeActorRole(userOrRole);

  if (role === roles.organization) {
    return "/organization-profile";
  }

  if (role === roles.regularUser) {
    return "/profile";
  }

  if (role === roles.admin) {
    return "/admin";
  }

  return "/login";
}
