import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  LogIn,
  Mail,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { roles } from "@/lib/domain-enums";
import { authService } from "@/services/auth/auth.service";
import {
  fetchCourseInstructorInvitationPreview,
  respondToCourseInstructorInvitation,
} from "@/services/courses/courses.service";

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function buildReturnPath(token) {
  return `/instructor-invitations/accept?token=${encodeURIComponent(token)}`;
}

function InvitationSummaryRow({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary/20 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export default function InstructorInvitationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState("");
  const [respondingAction, setRespondingAction] = useState("");
  const { toast } = useToast();
  const {
    user,
    isAuthenticated,
    isLoadingAuth,
    authChecked,
  } = useAuth();

  useEffect(() => {
    let active = true;

    if (!token) {
      setPreview(null);
      setLoadingPreview(false);
      setPreviewError("");
      return () => {
        active = false;
      };
    }

    const loadPreview = async () => {
      setLoadingPreview(true);
      setPreviewError("");
      try {
        const result = await fetchCourseInstructorInvitationPreview(token);
        if (active) {
          setPreview(result);
        }
      } catch (error) {
        if (active) {
          setPreview(null);
          setPreviewError(
            error?.message || "We could not load this instructor invitation.",
          );
        }
      } finally {
        if (active) {
          setLoadingPreview(false);
        }
      }
    };

    loadPreview();

    return () => {
      active = false;
    };
  }, [token]);

  const returnPath = useMemo(() => buildReturnPath(token), [token]);
  const actorRole = user?.role || roles.guest;
  const isRegularUser = actorRole === roles.regularUser;
  const isMatchingRegularUser =
    isAuthenticated && isRegularUser && preview?.response_actor_matches;
  const isInvitationClosed =
    preview?.status === "accepted" ||
    preview?.status === "declined" ||
    preview?.status === "revoked" ||
    preview?.status === "expired";
  const canAct = Boolean(preview?.can_respond) && !isInvitationClosed;

  const handleRespond = async (action) => {
    if (!token) {
      return;
    }

    setRespondingAction(action);
    try {
      const updatedPreview = await respondToCourseInstructorInvitation(token, action);
      setPreview(updatedPreview);
      toast({
        title:
          action === "accept"
            ? "Instructor invitation accepted"
            : "Instructor invitation declined",
        description:
          action === "accept"
            ? "The course now shows you as an accepted instructor."
            : "The organization can now see that you declined this invitation.",
      });
    } catch (error) {
      toast({
        title: "Unable to update invitation",
        description: error?.message || "Something went wrong while updating the invitation.",
        variant: "destructive",
      });
    } finally {
      setRespondingAction("");
    }
  };

  const handleSwitchAccount = async () => {
    await authService.logout(`/login?from=${encodeURIComponent(returnPath)}`);
  };

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-12 sm:px-6">
        <EmptyState
          icon={Mail}
          title="Invitation link is incomplete"
          description="This instructor invitation link is missing its secure token. Open the latest email invitation and try again."
        />
      </div>
    );
  }

  if (loadingPreview || isLoadingAuth || !authChecked) {
    return <PageLoader />;
  }

  if (previewError || !preview) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-12 sm:px-6">
        <EmptyState
          icon={AlertTriangle}
          title="Invitation unavailable"
          description={previewError || "We could not load this invitation."}
          actionLabel="Back to home"
          onAction={() => {
            window.location.href = "/";
          }}
        />
      </div>
    );
  }

  const statusHeadline = {
    pending: "Instructor invitation ready",
    accepted: "Instructor invitation accepted",
    declined: "Instructor invitation declined",
    revoked: "Instructor invitation revoked",
    expired: "Instructor invitation expired",
  }[preview.status] || "Instructor invitation";

  const statusMessage = {
    pending:
      "Review the organization, course, and invited email below before accepting or declining.",
    accepted:
      "This invitation has already been accepted. You are now attached to the course as an instructor.",
    declined:
      "This invitation was already declined. The organization can invite you again later if needed.",
    revoked:
      "The organization revoked this invitation before it was accepted.",
    expired:
      "The 24-hour acceptance window ended for this invitation. The organization will need to resend it.",
  }[preview.status] || "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="rounded-[28px] border border-border/60 bg-white p-6 shadow-sm shadow-black/5 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <StatusBadge status={preview.status} />
            {preview.can_respond ? (
              <StatusBadge status="active" label="Ready to respond" />
            ) : null}
          </div>

          <h1 className="mt-6 font-heading text-3xl font-bold text-foreground sm:text-4xl">
            {statusHeadline}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {statusMessage}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <InvitationSummaryRow
              label="Organization"
              value={preview.course_program?.organization_name || "Not available"}
            />
            <InvitationSummaryRow
              label="Course"
              value={preview.course_program?.title || "Not available"}
            />
            <InvitationSummaryRow
              label="Invited email"
              value={preview.invited_email || "Not available"}
            />
            <InvitationSummaryRow
              label="Expires"
              value={formatDateTime(preview.expires_at)}
            />
          </div>

          <div className="mt-8 rounded-3xl border border-border/60 bg-secondary/10 p-5">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-teal-700" />
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Account match
              </h2>
            </div>

            {isInvitationClosed ? (
              <div className="mt-4 rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm text-muted-foreground">
                This invitation is no longer waiting for a response.
              </div>
            ) : canAct ? (
              <div className="mt-4 space-y-4">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    isMatchingRegularUser
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  {isMatchingRegularUser ? (
                    <>
                      You are signed in with the invited regular-user account. If you accept,
                      this course will attach to your account immediately and show up in your
                      dashboard.
                    </>
                  ) : !isAuthenticated ? (
                    <>
                      You can respond from this secure email link even without an account. If you
                      later register or sign in with{" "}
                      <span className="font-medium">{preview.invited_email}</span>, the invitation
                      will be linked to that dashboard automatically.
                    </>
                  ) : !isRegularUser ? (
                    <>
                      You are currently signed in as a different actor. You can still respond from
                      this secure link, but the invitation will only attach after a regular-user
                      account with <span className="font-medium">{preview.invited_email}</span>{" "}
                      signs in.
                    </>
                  ) : (
                    <>
                      This invitation was sent to{" "}
                      <span className="font-medium">{preview.invited_email}</span>, but you are
                      currently signed in as{" "}
                      <span className="font-medium">{user?.email || "another account"}</span>. You
                      can still respond from this link, but the course will only attach once the
                      invited email signs in.
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Once accepted, you will appear publicly as an instructor for this course.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    className="bg-teal-600 hover:bg-teal-700"
                    disabled={Boolean(respondingAction)}
                    onClick={() => handleRespond("accept")}
                  >
                    {respondingAction === "accept" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Accept invitation
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={Boolean(respondingAction)}
                    onClick={() => handleRespond("decline")}
                  >
                    {respondingAction === "decline" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Declining...
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Decline invitation
                      </>
                    )}
                  </Button>
                  {!isMatchingRegularUser && isAuthenticated ? (
                    <Button type="button" variant="ghost" onClick={handleSwitchAccount}>
                      Sign out and switch account
                    </Button>
                  ) : null}
                  {!isAuthenticated ? (
                    <>
                      <Link to={`/login?from=${encodeURIComponent(returnPath)}`}>
                        <Button type="button" variant="outline">
                          <LogIn className="mr-2 h-4 w-4" />
                          Login instead
                        </Button>
                      </Link>
                      <Link to={`/register?from=${encodeURIComponent(returnPath)}`}>
                        <Button type="button" variant="ghost">
                          Create account
                        </Button>
                      </Link>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-teal-700" />
              <h2 className="font-heading text-lg font-semibold text-foreground">
                What happens next
              </h2>
            </div>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>Accepted instructors become publicly visible on the course page.</p>
              <p>Declined, revoked, and expired invitations remain visible to admins and the organization team.</p>
              <p>Accepted instructors cannot enroll in the same course as learners.</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-border/60 bg-white p-6 shadow-sm shadow-black/5">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-teal-700" />
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Quick links
              </h2>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <Link to={`/courses/${preview.course_program?.id || ""}`}>
                <Button variant="outline" className="w-full justify-start">
                  View course page
                </Button>
              </Link>
              <Link to="/">
                <Button variant="ghost" className="w-full justify-start">
                  Back to home
                </Button>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
