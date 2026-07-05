import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Plus, BookOpen, Calendar, Briefcase } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function OrgManagement() {
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [courses, setCourses] = useState([]);
  const [events, setEvents] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrg, setShowNewOrg] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", description: "", contact_email: "" });

  useEffect(() => {
    const load = async () => {
      try {
        const me = await appClient.auth.me();
        const data = await appClient.entities.Organization.filter({ owner_id: me.id });
        setOrgs(data);
        if (data.length > 0) {
          setSelectedOrg(data[0]);
          await loadOrgData(data[0].id);
        }
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const loadOrgData = async (orgId) => {
    const [c, e, j] = await Promise.all([
      appClient.entities.Course.filter({ organization_id: orgId }),
      appClient.entities.Event.filter({ organization_id: orgId }),
      appClient.entities.Job.filter({ organization_id: orgId }),
    ]);
    setCourses(c);
    setEvents(e);
    setJobs(j);
  };

  const createOrg = async () => {
    try {
      const me = await appClient.auth.me();
      const org = await appClient.entities.Organization.create({ ...newOrg, owner_id: me.id });
      setOrgs(prev => [...prev, org]);
      setSelectedOrg(org);
      setShowNewOrg(false);
      setNewOrg({ name: "", description: "", contact_email: "" });
    } catch(e) { console.error(e); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading font-bold text-3xl text-foreground mb-1">Organization</h1>
          <p className="text-muted-foreground text-sm">Manage your organization, courses, events, and job postings.</p>
        </div>
        <Dialog open={showNewOrg} onOpenChange={setShowNewOrg}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700 gap-2"><Plus className="w-4 h-4" /> New Org</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Organization</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Name</Label><Input value={newOrg.name} onChange={e => setNewOrg({...newOrg, name: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Description</Label><Textarea value={newOrg.description} onChange={e => setNewOrg({...newOrg, description: e.target.value})} className="mt-1.5" rows={3} /></div>
              <div><Label>Contact Email</Label><Input value={newOrg.contact_email} onChange={e => setNewOrg({...newOrg, contact_email: e.target.value})} className="mt-1.5" /></div>
              <Button onClick={createOrg} className="w-full bg-teal-600 hover:bg-teal-700">Create Organization</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {orgs.length === 0 ? (
        <EmptyState icon={Building} title="No organization yet" description="Create an organization to start posting courses, events, and jobs." actionLabel="Create Organization" onAction={() => setShowNewOrg(true)} />
      ) : (
        <>
          {/* Org Card */}
          <div className="bg-white rounded-2xl border border-border/50 p-6 mb-8 flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
              <Building className="w-7 h-7 text-teal-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-heading font-bold text-xl">{selectedOrg?.name}</h2>
                <StatusBadge status={selectedOrg?.verification_status || "unverified"} />
              </div>
              <p className="text-sm text-muted-foreground">{selectedOrg?.description}</p>
            </div>
          </div>

          <div className="flex gap-3 mb-8">
            <Link to="/course-builder"><Button variant="outline" className="gap-2"><BookOpen className="w-4 h-4" /> Course Builder</Button></Link>
            <Link to="/organization-profile"><Button variant="outline" className="gap-2"><Building className="w-4 h-4" /> Edit Profile</Button></Link>
          </div>

          <Tabs defaultValue="courses">
            <TabsList className="bg-secondary/50 p-1 rounded-xl mb-6">
              <TabsTrigger value="courses" className="rounded-lg data-[state=active]:bg-white gap-1.5"><BookOpen className="w-4 h-4" /> Courses</TabsTrigger>
              <TabsTrigger value="events" className="rounded-lg data-[state=active]:bg-white gap-1.5"><Calendar className="w-4 h-4" /> Events</TabsTrigger>
              <TabsTrigger value="jobs" className="rounded-lg data-[state=active]:bg-white gap-1.5"><Briefcase className="w-4 h-4" /> Jobs</TabsTrigger>
            </TabsList>

            <TabsContent value="courses">
              {courses.length === 0 ? (
                <EmptyState icon={BookOpen} title="No courses yet" description="Create your first course to start reaching learners." />
              ) : (
                <div className="space-y-3">
                  {courses.map(c => (
                    <div key={c.id} className="bg-white rounded-xl border border-border/50 p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0"><BookOpen className="w-5 h-5 text-teal-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{c.title}</div>
                        <div className="text-xs text-muted-foreground">{c.category} · {c.enrolled_count || 0} enrolled</div>
                      </div>
                      <StatusBadge status={c.status} />
                      <StatusBadge status={c.is_free ? "free" : "paid"} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="events">
              {events.length === 0 ? (
                <EmptyState icon={Calendar} title="No events yet" description="Host events to engage your community." />
              ) : (
                <div className="space-y-3">
                  {events.map(e => (
                    <div key={e.id} className="bg-white rounded-xl border border-border/50 p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0"><Calendar className="w-5 h-5 text-blue-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{e.title}</div>
                        <div className="text-xs text-muted-foreground">{e.current_attendees || 0} attendees</div>
                      </div>
                      <StatusBadge status={e.status || "upcoming"} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="jobs">
              {jobs.length === 0 ? (
                <EmptyState icon={Briefcase} title="No job postings yet" description="Post opportunities to attract talent from the SkillVerse community." />
              ) : (
                <div className="space-y-3">
                  {jobs.map(j => (
                    <div key={j.id} className="bg-white rounded-xl border border-border/50 p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0"><Briefcase className="w-5 h-5 text-purple-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{j.title}</div>
                        <div className="text-xs text-muted-foreground">{j.company_name}</div>
                      </div>
                      <StatusBadge status={j.status} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
