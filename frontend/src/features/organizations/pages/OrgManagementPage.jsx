import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, BookOpen, Calendar, Briefcase, ExternalLink } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { fetchOrganizationManagementData } from "@/services/organizations/organization.service";

export default function OrgManagement() {
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [courses, setCourses] = useState([]);
  const [events, setEvents] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchOrganizationManagementData();
        if (data.organization) {
          setSelectedOrg(data.organization);
          await loadOrgData(data.organization.id);
        }
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const loadOrgData = async (orgId) => {
    void orgId;
    setCourses([]);
    setEvents([]);
    setJobs([]);
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
        <Link to="/organization-profile"><Button className="bg-teal-600 hover:bg-teal-700 gap-2"><Building className="w-4 h-4" /> Edit Profile</Button></Link>
      </div>

      {!selectedOrg ? (
        <EmptyState icon={Building} title="No organization profile found" description="Finish your organization profile to prepare for courses, events, and job postings." actionLabel="Open Organization Profile" onAction={() => { window.location.href = "/organization-profile"; }} />
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
            <Link to={`/organizations/${selectedOrg.id}`}><Button variant="outline" className="gap-2"><ExternalLink className="w-4 h-4" /> Public View</Button></Link>
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
