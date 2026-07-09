import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Users } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  createCommunityPost,
  fetchCommunityDetail,
  fetchCommunities,
  updateCommunityMembership,
} from "@/services/communities/communities.service";

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString();
}

export default function CommunitiesPage() {
  const { actorRole, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [scope, setScope] = useState("public");
  const [communities, setCommunities] = useState([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [postBody, setPostBody] = useState("");
  const [acting, setActing] = useState("");

  const availableScopes = useMemo(() => {
    const items = [{ value: "public", label: "Public communities" }];
    if (isAuthenticated && actorRole === "regular_user") {
      items.push({ value: "mine", label: "My communities" });
    }
    if (isAuthenticated && actorRole === "organization") {
      items.push({ value: "managed", label: "Managed communities" });
    }
    if (isAuthenticated && actorRole === "admin") {
      items.push({ value: "admin", label: "All communities" });
    }
    return items;
  }, [actorRole, isAuthenticated]);

  useEffect(() => {
    if (!availableScopes.some((item) => item.value === scope)) {
      setScope(availableScopes[0]?.value || "public");
    }
  }, [availableScopes, scope]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await fetchCommunities(scope);
        if (!active) {
          return;
        }
        setCommunities(payload);
        setSelectedCommunityId((current) => current || payload[0]?.id || null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError.message || "Unable to load communities.");
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
  }, [scope]);

  useEffect(() => {
    let active = true;
    if (!selectedCommunityId) {
      setSelectedCommunity(null);
      return () => {
        active = false;
      };
    }
    const loadDetail = async () => {
      setDetailLoading(true);
      try {
        const payload = await fetchCommunityDetail(selectedCommunityId, {
          authenticated: isAuthenticated,
        });
        if (active) {
          setSelectedCommunity(payload);
        }
      } catch (loadError) {
        if (active) {
          setSelectedCommunity(null);
          setError(loadError.message || "Unable to load community detail.");
        }
      } finally {
        if (active) {
          setDetailLoading(false);
        }
      }
    };
    loadDetail();
    return () => {
      active = false;
    };
  }, [isAuthenticated, selectedCommunityId]);

  const handleMembership = async (action) => {
    if (!selectedCommunityId) {
      return;
    }
    setActing(action);
    try {
      const updated = await updateCommunityMembership(selectedCommunityId, action);
      setSelectedCommunity((current) => ({ ...(current || {}), ...updated }));
      setCommunities((current) =>
        current.map((community) =>
          community.id === updated.id ? { ...community, ...updated } : community,
        ),
      );
      toast({
        title: action === "join" ? "Joined community" : "Left community",
      });
    } catch (actionError) {
      toast({
        title: "Unable to update membership",
        description: actionError.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setActing("");
    }
  };

  const handlePost = async () => {
    if (!selectedCommunityId || !postBody.trim()) {
      return;
    }
    setActing("post");
    try {
      const post = await createCommunityPost(selectedCommunityId, postBody);
      setSelectedCommunity((current) =>
        current
          ? {
              ...current,
              recent_posts: [post, ...(current.recent_posts || [])],
              post_count: Number(current.post_count || 0) + 1,
            }
          : current,
      );
      setPostBody("");
      toast({ title: "Post shared" });
    } catch (postError) {
      toast({
        title: "Unable to share post",
        description: postError.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setActing("");
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  const canSelfJoinSelectedCommunity = Boolean(
    selectedCommunity &&
      actorRole === "regular_user" &&
      !selectedCommunity.is_member &&
      selectedCommunity.visibility === "public",
  );
  const canLeaveSelectedCommunity = Boolean(
    selectedCommunity &&
      actorRole === "regular_user" &&
      selectedCommunity.is_member,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-emerald-200/70 bg-white/90 p-8 shadow-sm shadow-black/5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                <Users className="h-3.5 w-3.5" />
                Community spaces
              </div>
              <h1 className="mt-4 font-heading text-4xl font-bold text-foreground">
                Learn in groups, not only one-to-one
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
                Community groups connect learners, events, and field-based collaboration in one shared space.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableScopes.map((item) => (
                <Button
                  key={item.value}
                  variant={scope === item.value ? "default" : "outline"}
                  className={scope === item.value ? "bg-teal-600 hover:bg-teal-700" : ""}
                  onClick={() => setScope(item.value)}
                >
                  {item.label}
                </Button>
              ))}
              {actorRole === "organization" ? (
                <Link to="/org?tab=communities">
                  <Button variant="outline">Manage in org workspace</Button>
                </Link>
              ) : null}
            </div>
          </div>
          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </section>

        {communities.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No communities match this view"
            description="Try another scope or wait for verified organizations to publish new groups."
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className="space-y-4">
              {communities.map((community) => (
                <button
                  key={community.id}
                  type="button"
                  onClick={() => setSelectedCommunityId(community.id)}
                  className={`w-full rounded-3xl border p-5 text-left shadow-sm transition ${
                    selectedCommunityId === community.id
                      ? "border-teal-300 bg-teal-50/70"
                      : "border-border/60 bg-white hover:border-teal-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-xl font-semibold text-foreground">
                      {community.title}
                    </h2>
                    <StatusBadge status={community.visibility} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{community.description}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{community.organization?.name}</span>
                    <span>{community.membership_count} members</span>
                    <span>{community.post_count} posts</span>
                  </div>
                </button>
              ))}
            </section>

            <section className="rounded-[2rem] border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
              {detailLoading && !selectedCommunity ? (
                <PageLoader />
              ) : selectedCommunity ? (
                <>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-heading text-2xl font-semibold text-foreground">
                          {selectedCommunity.title}
                        </h2>
                        <StatusBadge status={selectedCommunity.visibility} />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedCommunity.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{selectedCommunity.organization?.name}</span>
                        <span>{selectedCommunity.membership_count} members</span>
                        <span>{selectedCommunity.post_count} posts</span>
                      </div>
                    </div>
                    {actorRole === "regular_user" ? (
                      canLeaveSelectedCommunity ? (
                        <Button
                          variant="outline"
                          disabled={Boolean(acting)}
                          onClick={() => handleMembership("leave")}
                        >
                          Leave group
                        </Button>
                      ) : canSelfJoinSelectedCommunity ? (
                        <Button
                          className="bg-teal-600 hover:bg-teal-700"
                          disabled={Boolean(acting)}
                          onClick={() => handleMembership("join")}
                        >
                          Join group
                        </Button>
                      ) : (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          This is a members-only community. Join access is managed by the organization.
                        </div>
                      )
                    ) : null}
                  </div>

                  {selectedCommunity.related_course || selectedCommunity.related_event ? (
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {selectedCommunity.related_course ? (
                        <Link
                          to={`/courses/${selectedCommunity.related_course.id}`}
                          className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-3 text-sm"
                        >
                          <div className="font-medium text-foreground">Related course</div>
                          <div className="mt-1 text-muted-foreground">
                            {selectedCommunity.related_course.title}
                          </div>
                        </Link>
                      ) : null}
                      {selectedCommunity.related_event ? (
                        <Link
                          to={`/events/${selectedCommunity.related_event.id}`}
                          className="rounded-2xl border border-border/60 bg-secondary/10 px-4 py-3 text-sm"
                        >
                          <div className="font-medium text-foreground">Related event</div>
                          <div className="mt-1 text-muted-foreground">
                            {selectedCommunity.related_event.title}
                          </div>
                        </Link>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-teal-700" />
                        <h3 className="font-medium text-foreground">Discussion</h3>
                      </div>
                      {isAuthenticated && (selectedCommunity.is_member || actorRole !== "regular_user") ? (
                        <div className="mt-4 space-y-3">
                          <Textarea
                            rows={3}
                            value={postBody}
                            onChange={(event) => setPostBody(event.target.value)}
                            placeholder="Share an update, question, or resource."
                          />
                          <div className="flex justify-end">
                            <Button
                              disabled={acting === "post" || !postBody.trim()}
                              onClick={handlePost}
                            >
                              Post update
                            </Button>
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-5 space-y-3">
                        {(selectedCommunity.recent_posts || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No community posts yet.
                          </p>
                        ) : (
                          selectedCommunity.recent_posts.map((post) => (
                            <div key={post.id} className="rounded-2xl bg-secondary/15 p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {post.author?.full_name || post.author?.email}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(post.created_at)}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">{post.body}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-border/60 bg-secondary/10 p-5">
                      <h3 className="font-medium text-foreground">Members</h3>
                      <div className="mt-4 space-y-3">
                        {(selectedCommunity.members || []).slice(0, 8).map((member) => (
                          <div key={member.id} className="rounded-2xl bg-white px-4 py-3">
                            <div className="font-medium text-foreground">
                              {member.user?.full_name || member.user?.email}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {member.role} · joined {formatDate(member.joined_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={Users}
                  title="Select a community"
                  description="Choose a group to view its activity and members."
                />
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
