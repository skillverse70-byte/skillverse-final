import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, Clock, Users, Star, CheckCircle } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await appClient.entities.Course.filter({ status: "published" }, "-created_date", 50);
        setCourses(data);
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = courses.filter(c =>
    (!search || c.title?.toLowerCase().includes(search.toLowerCase())) &&
    (difficulty === "all" || c.difficulty === difficulty) &&
    (priceFilter === "all" || (priceFilter === "free" ? c.is_free : !c.is_free))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl text-foreground mb-2">Courses</h1>
        <p className="text-muted-foreground">Structured learning from verified organizations and expert instructors.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priceFilter} onValueChange={setPriceFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Price" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses found" description="Try adjusting your filters or check back soon for new courses." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(course => (
            <Link key={course.id} to={`/courses/${course.id}`} className="group">
              <div className="bg-white rounded-2xl border border-border/50 overflow-hidden card-hover">
                <div className="aspect-video bg-gradient-to-br from-teal-100 to-emerald-50 relative">
                  {course.cover_image ? (
                    <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-teal-300" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <StatusBadge status={course.is_free ? "free" : "paid"} label={course.is_free ? "Free" : `$${course.price || 0}`} />
                    {!course.enrollment_open && <StatusBadge status="enrollment_unavailable" />}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{course.category}</span>
                    <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full capitalize">{course.difficulty}</span>
                  </div>
                  <h3 className="font-heading font-semibold text-base mb-1.5 group-hover:text-teal-600 transition-colors line-clamp-2">{course.title}</h3>
                  {course.organization_name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                      by {course.organization_name}
                      {course.is_verified && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {course.total_lessons > 0 && (
                      <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {course.total_lessons} lessons</span>
                    )}
                    {course.total_duration_hours > 0 && (
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {course.total_duration_hours}h</span>
                    )}
                    {course.enrolled_count > 0 && (
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {course.enrolled_count}</span>
                    )}
                    {course.rating > 0 && (
                      <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {course.rating}</span>
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
