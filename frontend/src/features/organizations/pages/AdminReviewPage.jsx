import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Building, Tag, CheckCircle, XCircle } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";

export default function AdminReview() {
  const [orgs, setOrgs] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [o, s] = await Promise.all([
          appClient.entities.Organization.filter({ verification_status: "pending" }),
          appClient.entities.Skill.filter({ is_approved: false }),
        ]);
        setOrgs(o);
        setSkills(s);
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const handleOrgVerify = async (org, status) => {
    try {
      await appClient.entities.Organization.update(org.id, {
        verification_status: status,
        is_verified: status === "verified",
      });
      setOrgs(prev => prev.filter(o => o.id !== org.id));
    } catch(e) { console.error(e); }
  };

  const handleSkillApprove = async (skill, approved) => {
    try {
      await appClient.entities.Skill.update(skill.id, { is_approved: approved });
      setSkills(prev => prev.filter(s => s.id !== skill.id));
    } catch(e) { console.error(e); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-6 h-6 text-teal-600" />
          <h1 className="font-heading font-bold text-3xl text-foreground">Admin Review</h1>
        </div>
        <p className="text-muted-foreground text-sm">Review pending verifications and category approvals.</p>
      </div>

      <Tabs defaultValue="orgs">
        <TabsList className="bg-secondary/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="orgs" className="rounded-lg data-[state=active]:bg-white gap-1.5">
            <Building className="w-4 h-4" /> Organizations ({orgs.length})
          </TabsTrigger>
          <TabsTrigger value="skills" className="rounded-lg data-[state=active]:bg-white gap-1.5">
            <Tag className="w-4 h-4" /> Skills ({skills.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orgs">
          {orgs.length === 0 ? (
            <EmptyState icon={CheckCircle} title="All caught up!" description="No pending organization verifications." />
          ) : (
            <div className="space-y-4">
              {orgs.map(org => (
                <div key={org.id} className="bg-white rounded-xl border border-border/50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Building className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-semibold text-base">{org.name}</h3>
                        <StatusBadge status="pending" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{org.description}</p>
                      {org.website && <p className="text-xs text-teal-600">{org.website}</p>}
                      {org.contact_email && <p className="text-xs text-muted-foreground">{org.contact_email}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pl-16">
                    <Button onClick={() => handleOrgVerify(org, "verified")} size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Verify
                    </Button>
                    <Button onClick={() => handleOrgVerify(org, "rejected")} size="sm" variant="outline" className="text-red-600 hover:bg-red-50 gap-1.5">
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
