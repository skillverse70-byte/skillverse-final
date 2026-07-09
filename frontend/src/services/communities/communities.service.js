import { apiRequest } from "@/lib/http-client";
import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";
import { normalizeCourse } from "@/services/courses/courses.service";
import { normalizeEvent } from "@/services/events/events.service";

function normalizeActor(actor) {
  if (!actor) {
    return null;
  }
  return {
    id: actor.id ?? null,
    full_name: actor.full_name || "",
    email: actor.email || "",
    role: actor.role || "",
  };
}

function normalizeOrganization(organization) {
  if (!organization) {
    return null;
  }
  return {
    id: organization.id ?? null,
    name: organization.name || "",
    verification_status: organization.verification_status || "unverified",
  };
}

export function normalizeCommunityPost(post = {}) {
  return {
    id: post.id ?? null,
    author: normalizeActor(post.author),
    body: post.body || "",
    created_at: post.created_at || null,
    updated_at: post.updated_at || null,
  };
}

function normalizeCommunityMember(member = {}) {
  return {
    id: member.id ?? null,
    role: member.role || "member",
    joined_at: member.joined_at || null,
    user: normalizeActor(member.user),
  };
}

export function normalizeCommunity(community = {}) {
  return {
    id: community.id ?? null,
    title: community.title || "",
    slug: community.slug || "",
    description: community.description || "",
    category: community.category || "",
    tags: Array.isArray(community.tags) ? community.tags : [],
    visibility: community.visibility || "public",
    organization: normalizeOrganization(community.organization),
    related_course: community.related_course ? normalizeCourse(community.related_course) : null,
    related_event: community.related_event ? normalizeEvent(community.related_event) : null,
    membership_count: Number(community.membership_count || 0),
    post_count: Number(community.post_count || 0),
    is_member: Boolean(community.is_member),
    member_role: community.member_role || "",
    is_active: community.is_active ?? true,
    created_at: community.created_at || null,
    updated_at: community.updated_at || null,
    recent_posts: Array.isArray(community.recent_posts)
      ? community.recent_posts.map(normalizeCommunityPost)
      : [],
    members: Array.isArray(community.members)
      ? community.members.map(normalizeCommunityMember)
      : [],
  };
}

export async function fetchCommunities(scope = "public") {
  const query = scope && scope !== "public" ? `?scope=${encodeURIComponent(scope)}` : "";
  const request = scope === "public" ? apiRequest : authenticatedApiRequest;
  const payload = await request(`/communities/${query}`, { method: "GET" });
  return Array.isArray(payload) ? payload.map(normalizeCommunity) : [];
}

export async function fetchCommunityDetail(communityId, { authenticated = false } = {}) {
  const request = authenticated ? authenticatedApiRequest : apiRequest;
  const payload = await request(`/communities/${communityId}/`, { method: "GET" });
  return normalizeCommunity(payload);
}

export async function createCommunity(payload) {
  const community = await authenticatedApiRequest("/communities/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return normalizeCommunity(community);
}

export async function updateCommunityMembership(communityId, action) {
  const community = await authenticatedApiRequest(`/communities/${communityId}/membership/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action }),
  });
  return normalizeCommunity(community);
}

export async function fetchCommunityPosts(communityId, { authenticated = false } = {}) {
  const request = authenticated ? authenticatedApiRequest : apiRequest;
  const payload = await request(`/communities/${communityId}/posts/`, { method: "GET" });
  return Array.isArray(payload) ? payload.map(normalizeCommunityPost) : [];
}

export async function createCommunityPost(communityId, body) {
  const payload = await authenticatedApiRequest(`/communities/${communityId}/posts/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });
  return normalizeCommunityPost(payload);
}
