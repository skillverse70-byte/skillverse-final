import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CheckCircle, Clock, Search, Users } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchPublishedCourses } from "@/services/courses/courses.service";

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchPublishedCourses();
        if (active) {
          setCourses(data);
        }
      } catch (error) {
        console.error(error);
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
  }, []);

  const filtered = courses.filter(
    (course) =>
      (!search || course.title?.toLowerCase().includes(search.toLowerCase())) &&
      (difficulty === "all" || course.difficulty === difficulty) &&
      (priceFilter === "all" || (priceFilter === "free" ? course.is_free : !course.is_free)),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl text-foreground mb-2">Courses</h1>
        <p className="text-muted-foreground">
          Structured learning from organizations and expert instructors.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priceFilter} onValueChange={setPriceFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses found"
          description="Try adjusting your filters or check back soon for new courses."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((course) => (
            <Link key={course.id} to={`/courses/${course.id}`} className="group">
              <div className="bg-white rounded-2xl border border-border/50 overflow-hidden card-hover">
                <div className="aspect-video bg-gradient-to-br from-teal-100 to-emerald-50 relative">
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-teal-300" />
                  </div>
                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                    <StatusBadge
                      status={course.is_free ? "free" : "paid"}
                      label={
                        course.is_free
                          ? "Free"
                          : `${course.price_currency || "ETB"} ${course.price || 0}`
                      }
                    />
                    {!course.enrollment_open && (
                      <StatusBadge status="enrollment_unavailable" />
                    )}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      {course.category || "General"}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full capitalize">
                      {course.difficulty}
                    </span>
                  </div>
                  <h3 className="font-heading font-semibold text-base mb-1.5 group-hover:text-teal-600 transition-colors line-clamp-2">
                    {course.title}
                  </h3>
                  {course.organization_name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                      by {course.organization_name}
                      {course.organization_verification_status === "verified" && (
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                      )}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" /> {course.total_lessons || 0} lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {course.enrolled_count || 0}
                    </span>
                    {course.modules?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {course.modules.length} modules
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
