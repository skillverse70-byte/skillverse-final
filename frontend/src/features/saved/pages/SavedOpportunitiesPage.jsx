import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bookmark,
  BookOpen,
  Briefcase,
  Calendar,
  Trash2,
  ExternalLink,
} from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

const typeConfig = {
  course: {
    icon: BookOpen,
    color: "bg-teal-50 text-teal-600",
    path: "/courses",
  },
  job: {
    icon: Briefcase,
    color: "bg-purple-50 text-purple-600",
    path: "/jobs",
  },
  event: { icon: Calendar, color: "bg-blue-50 text-blue-600", path: "/events" },
};

export default function SavedOpportunities() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await appClient.auth.me();
        const data = await appClient.entities.SavedItem.filter(
          { user_id: me.id },
          "-created_date",
        );
        setItems(data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleRemove = async (id) => {
    try {
      await appClient.entities.SavedItem.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  const courses = items.filter((i) => i.item_type === "course");
  const jobs = items.filter((i) => i.item_type === "job");
  const events = items.filter((i) => i.item_type === "event");

  const ItemCard = ({ item }) => {
    const cfg = typeConfig[item.item_type] || typeConfig.course;
    const Icon = cfg.icon;
    return (
      <div className="bg-white rounded-xl border border-border/50 p-4 flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-xl ${cfg.color} flex items-center justify-center flex-shrink-0`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{item.item_title}</div>
          <div className="text-xs text-muted-foreground truncate">
            {item.item_subtitle}
            {item.item_category && ` · ${item.item_category}`}
          </div>
        </div>
        <Link to={`${cfg.path}/${item.item_id}`}>
          <Button variant="ghost" size="icon">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleRemove(item.id)}
          className="text-red-500 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  const renderList = (list, icon, label) =>
    list.length === 0 ? (
      <EmptyState
        icon={icon}
        title={`No saved ${label}`}
        description={`Save ${label} to find them here later.`}
      />
    ) : (
      <div className="space-y-3">
        {list.map((i) => (
          <ItemCard key={i.id} item={i} />
        ))}
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl text-foreground mb-1">
          Saved Opportunities
        </h1>
        <p className="text-muted-foreground text-sm">
          Courses, jobs, and events you've bookmarked for later.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Browse courses, jobs, and events, then tap the Save button to bookmark them here."
        />
      ) : (
        <Tabs defaultValue="all">
          <TabsList className="bg-secondary/50 p-1 rounded-xl mb-6">
            <TabsTrigger
              value="all"
              className="rounded-lg data-[state=active]:bg-white"
            >
              All ({items.length})
            </TabsTrigger>
            <TabsTrigger
              value="courses"
              className="rounded-lg data-[state=active]:bg-white"
            >
              Courses ({courses.length})
            </TabsTrigger>
            <TabsTrigger
              value="jobs"
              className="rounded-lg data-[state=active]:bg-white"
            >
              Jobs ({jobs.length})
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="rounded-lg data-[state=active]:bg-white"
            >
              Events ({events.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <div className="space-y-3">
              {items.map((i) => (
                <ItemCard key={i.id} item={i} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="courses">
            {renderList(courses, BookOpen, "courses")}
          </TabsContent>
          <TabsContent value="jobs">
            {renderList(jobs, Briefcase, "jobs")}
          </TabsContent>
          <TabsContent value="events">
            {renderList(events, Calendar, "events")}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
