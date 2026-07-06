import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Building, Tag, CheckCircle, XCircle } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import { useToast } from "@/components/ui/use-toast";
import { useAdminOrganizationVerification } from "@/hooks/organizations/useAdminOrganizationVerification";

export default function AdminReview() {
  const [skills, setSkills] = useState([]);
  const [reviewerNotes, setReviewerNotes] = useState({});
  const [overrideFlags, setOverrideFlags] = useState({});
  const { toast } = useToast();
  const {
    requests,
    loading,
    actingId,
    error,
    decide,
  } = useAdminOrganizationVerification();

  const handleSkillApprove = async (skill, approved) => {
    try {
      void approved;
      setSkills(prev => prev.filter(s => s.id !== skill.id));
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-6 h-6 text-teal-600" />
          <h1 className="font-heading font-bold text-3xl text-foreground">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground text-sm">Review trust queues and handle the platform oversight work meant for admins.</p>
        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <Tabs defaultValue="orgs">
        <TabsList className="bg-secondary/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="orgs" className="rounded-lg data-[state=active]:bg-white gap-1.5">
            <Building className="w-4 h-4" /> Organizations ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="skills" className="rounded-lg data-[state=active]:bg-white gap-1.5">
            <Tag className="w-4 h-4" /> Skills ({skills.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orgs">
          {requests.length === 0 ? (
            <EmptyState icon={CheckCircle} title="All caught up!" description="No pending organization verifications." />
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="bg-white rounded-xl border border-border/50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Building className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-semibold text-base">
                          Organization #{request.organization}
                        </h3>
                        <StatusBadge status="pending" />
                        {request.used_admin_override ? <StatusBadge status="reviewing" label="Override" /> : null}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Submitted by {request.requested_by_email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {request.has_business_license
                          ? "Supporting document is on file."
                          : "No supporting document is on file. Override required for approval."}
                      </p>
                      {request.request_notes ? (
                        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-foreground">
                          {request.request_notes}
                        </div>
                      ) : null}
                      <div className="mt-4 space-y-3">
                        <Textarea
                          rows={3}
                          value={reviewerNotes[request.id] || ""}
                          onChange={(event) =>
                            setReviewerNotes((current) => ({
                              ...current,
                              [request.id]: event.target.value,
                            }))
                          }
                          placeholder="Add reviewer notes for the organization."
                        />
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Checkbox
                            checked={Boolean(overrideFlags[request.id])}
                            onCheckedChange={(checked) =>
                              setOverrideFlags((current) => ({
                                ...current,
                                [request.id]: Boolean(checked),
                              }))
                            }
                          />
                          Use admin override if approving without a business license
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pl-16">
                    <Button
                      onClick={async () => {
                        try {
                          await decide(request.id, {
                            decision: "approved",
                            reviewerNotes: reviewerNotes[request.id] || "",
                            useAdminOverride: Boolean(overrideFlags[request.id]),
                          });
                          toast({ title: "Verification approved" });
                        } catch (e) {
                          toast({
                            title: "Approval failed",
                            description: e.message,
                            variant: "destructive",
                          });
                        }
                      }}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                      disabled={actingId === request.id}
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Verify
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          await decide(request.id, {
                            decision: "rejected",
                            reviewerNotes: reviewerNotes[request.id] || "",
                            useAdminOverride: false,
                          });
                          toast({ title: "Verification rejected" });
                        } catch (e) {
                          toast({
                            title: "Rejection failed",
                            description: e.message,
                            variant: "destructive",
                          });
                        }
                      }}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50 gap-1.5"
                      disabled={actingId === request.id}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="skills">
          {skills.length === 0 ? (
            <EmptyState icon={CheckCircle} title="All caught up!" description="No pending skill categories to review." />
          ) : (
            <div className="space-y-3">
              {skills.map(skill => (
                <div key={skill.id} className="bg-white rounded-xl border border-border/50 p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Tag className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{skill.name}</div>
                    <div className="text-xs text-muted-foreground">{skill.category} · {skill.level}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSkillApprove(skill, true)} size="sm" variant="outline" className="text-emerald-600 hover:bg-emerald-50 gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button onClick={() => handleSkillApprove(skill, false)} size="sm" variant="outline" className="text-red-600 hover:bg-red-50 gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
