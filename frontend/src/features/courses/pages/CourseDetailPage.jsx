import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Clock, Users, Star, CheckCircle, FileText, HelpCircle, Clipboard, ArrowLeft, Download, Video } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import BookmarkButton from "@/components/shared/BookmarkButton";
import { getPaidCourseEnrollmentGate } from "@/lib/trust-state";

const lessonIcons = {
  video: Video,
  reading: FileText,
  quiz: HelpCircle,
  assignment: Clipboard,
  resource: Download,
};

export default function CourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await appClient.entities.Course.get(id);
        setCourse(data);
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="font-heading font-bold text-xl mb-2">Course not found</h2>
        <Link to="/courses"><Button variant="outline">Back to Courses</Button></Link>
      </div>
    );
  }

  const modules = course.modules || [];
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const organization = {
    id: course.organization_id,
    verification_status: course.organization_verification_status,
    is_verified: course.is_verified,
  };
  const enrollmentGate = getPaidCourseEnrollmentGate({
    organization,
    financialAccount: course.financial_account || null,
    isFree: course.is_free,
    enrollmentOpen: course.enrollment_open,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/courses" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Cover */}
          <div className="aspect-video bg-gradient-to-br from-teal-100 to-emerald-50 rounded-2xl overflow-hidden mb-6">
            {course.cover_image ? (
              <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-teal-300" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <StatusBadge status={course.is_free ? "free" : "paid"} label={course.is_free ? "Free" : `$${course.price || 0}`} />
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{course.category}</span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground capitalize">{course.difficulty}</span>
            {!enrollmentGate.canEnroll && <StatusBadge status={enrollmentGate.status} label={enrollmentGate.label} />}
          </div>

          <h1 className="font-heading font-bold text-2xl sm:text-3xl mb-3">{course.title}</h1>

          {course.organization_name && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-4">
              by {course.organization_id ? (
                <Link
                  to={`/organizations/${course.organization_id}`}
                  className="font-medium text-foreground hover:text-teal-700 hover:underline"
                >
                  {course.organization_name}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{course.organization_name}</span>
              )}
              <StatusBadge organization={organization} />
            </p>
          )}

          {course.instructor_name && (
            <p className="text-sm text-muted-foreground mb-6">Instructor: <span className="font-medium text-foreground">{course.instructor_name}</span></p>
          )}

          <p className="text-foreground leading-relaxed mb-8">{course.description}</p>

          {/* Modules */}
          <div className="mb-8">
            <h2 className="font-heading font-semibold text-xl mb-4">Course Content</h2>
            {modules.length === 0 ? (
              <div className="bg-secondary/50 rounded-xl p-6 text-center">
                <p className="text-sm text-muted-foreground">Course content is being prepared. Check back soon!</p>
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-3">
                {modules.sort((a, b) => (a.order || 0) - (b.order || 0)).map((mod, mi) => (
                  <AccordionItem key={mi} value={`mod-${mi}`} className="bg-white rounded-xl border border-border/50 px-5 overflow-hidden">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 font-semibold text-sm flex-shrink-0">
                          {mi + 1}
                        </div>
                        <div>
                          <div className="font-heading font-semibold text-sm">{mod.title}</div>
                          <div className="text-xs text-muted-foreground">{mod.lessons?.length || 0} lessons</div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-2 pl-11">
                        {(mod.lessons || []).map((lesson, li) => {
                          const LIcon = lessonIcons[lesson.type] || FileText;
                          return (
                            <div key={li} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
                              <LIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{lesson.title}</div>
                                {lesson.description && <div className="text-xs text-muted-foreground truncate">{lesson.description}</div>}
                              </div>
                              {lesson.duration_minutes > 0 && (
                                <span className="text-xs text-muted-foreground flex-shrink-0">{lesson.duration_minutes} min</span>
                              )}
                              <span className="text-xs text-muted-foreground capitalize bg-secondary px-2 py-0.5 rounded flex-shrink-0">{lesson.type}</span>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-2xl border border-border/50 p-6">
            <div className="text-center mb-5">
              {course.is_free ? (
                <div className="font-heading font-bold text-3xl text-teal-600">Free</div>
              ) : (
                <div className="font-heading font-bold text-3xl">${course.price || 0}</div>
              )}
            </div>

            {enrollmentGate.canEnroll ? (
              <Button className="w-full bg-teal-600 hover:bg-teal-700 h-11 text-base mb-4">
                Enroll Now
              </Button>
            ) : (
              <Button className="w-full h-11 text-base mb-4" disabled>
                {enrollmentGate.label}
              </Button>
            )}

            <BookmarkButton itemType="course" itemId={course.id} itemTitle={course.title} itemSubtitle={course.organization_name} itemCategory={course.category} className="w-full mb-4 justify-center" />

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-2"><BookOpen className="w-4 h-4" /> Lessons</span>
                <span className="font-medium">{totalLessons || course.total_lessons || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Duration</span>
                <span className="font-medium">{course.total_duration_hours || "—"}h</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" /> Enrolled</span>
                <span className="font-medium">{course.enrolled_count || 0}</span>
              </div>
              {course.rating > 0 && (
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground flex items-center gap-2"><Star className="w-4 h-4" /> Rating</span>
                  <span className="font-medium flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {course.rating}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Level</span>
                <span className="font-medium capitalize">{course.difficulty}</span>
              </div>
            </div>

            {course.tags?.length > 0 && (
              <div className="mt-5 pt-4 border-t border-border/50">
                <div className="flex flex-wrap gap-1.5">
                  {course.tags.map(t => (
                    <span key={t} className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
