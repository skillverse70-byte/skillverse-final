import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, ArrowLeftRight, Briefcase, Calendar, TrendingUp, Sparkles } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

const CATEGORIES = ["All", "Design", "Programming", "Marketing", "Photography", "Music", "Writing", "Data Science", "Languages", "Business"];

export default function Discover() {
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await appClient.entities.Skill.list("-created_date", 50);
        setSkills(data);
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = skills.filter(s =>
    (category === "All" || s.category === category) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()))
  );

  const quickLinks = [
    { icon: BookOpen, label: "Courses", path: "/courses", color: "bg-teal-50 text-teal-600", desc: "Structured learning" },
    { icon: ArrowLeftRight, label: "Skill Swap", path: "/skill-swap", color: "bg-amber-50 text-amber-600", desc: "Learn for free" },
    { icon: Calendar, label: "Events", path: "/events", color: "bg-blue-50 text-blue-600", desc: "Workshops & meetups" },
    { icon: Briefcase, label: "Jobs", path: "/jobs", color: "bg-purple-50 text-purple-600", desc: "Opportunities" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl text-foreground mb-2">Discover</h1>
        <p className="text-muted-foreground">Find skills, courses, and opportunities that match your goals.</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {quickLinks.map(ql => {
          const Icon = ql.icon;
          return (
            <Link key={ql.path} to={ql.path} className="bg-white rounded-2xl border border-border/50 p-5 card-hover flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl ${ql.color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-sm">{ql.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{ql.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              category === c
                ? "bg-teal-600 text-white"
                : "bg-white border border-border text-foreground hover:bg-teal-50"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Skills Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No skills found"
          description="Try a different search or category, or check back soon as new skills are added."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(skill => (
            <div key={skill.id} className="bg-white rounded-2xl border border-border/50 p-5 card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                  {skill.category}
                </span>
              </div>
              <h3 className="font-heading font-semibold text-base mb-1">{skill.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{skill.description || "Explore this skill and find related courses, swaps, and opportunities."}</p>
              <div className="flex gap-2">
                <Link to={`/courses?skill=${skill.name}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs">View Courses</Button>
                </Link>
                <Link to={`/skill-swap?skill=${skill.name}`} className="flex-1">
                  <Button size="sm" className="w-full text-xs bg-teal-600 hover:bg-teal-700">Swap</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
