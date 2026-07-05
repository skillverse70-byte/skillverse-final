import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeftRight,
  Search,
  User,
  MessageCircle,
  Calendar,
  Heart,
} from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";

export default function SkillSwap() {
  const [userSkills, setUserSkills] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await appClient.entities.UserSkill.filter(
          { can_teach: true },
          "-created_date",
          50,
        );
        setUserSkills(data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = userSkills.filter(
    (us) =>
      !search || us.skill_name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-heading font-bold text-3xl text-foreground">
            Skill Swap
          </h1>
          <StatusBadge status="free" label="Always Free" />
        </div>
        <p className="text-muted-foreground">
          Find someone who can teach you — and teach them something in return.
          No money involved.
        </p>
      </div>

      {/* How it Works */}
      <div className="bg-white rounded-2xl border border-border/50 p-6 mb-8">
        <h2 className="font-heading font-semibold text-base mb-4">
          How Skill Swap Works
        </h2>
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            {
              icon: Heart,
              step: "1",
              title: "Find a Match",
              desc: "Browse people offering skills you want to learn",
            },
            {
              icon: MessageCircle,
              step: "2",
              title: "Start a Chat",
              desc: "Connect and share resources with your swap partner",
            },
            {
              icon: Calendar,
              step: "3",
              title: "Schedule",
              desc: "Set up a time that works for both of you",
            },
            {
              icon: ArrowLeftRight,
              step: "4",
              title: "Swap & Learn",
              desc: "Meet, teach each other, and grow together",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 font-semibold text-sm">
                  {s.step}
                </div>
                <h3 className="font-heading font-semibold text-sm mb-1">
                  {s.title}
                </h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search for a skill you want to learn..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No skill swap offers yet"
          description="Be the first! Add skills you can teach to your profile, and start matching with learners."
          actionLabel="Add Your Skills"
          onAction={() => {}}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((us) => (
            <div
              key={us.id}
              className="bg-white rounded-2xl border border-border/50 p-5 card-hover"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm">
                    Can teach: {us.skill_name}
                  </h3>
                  <span className="text-xs text-muted-foreground capitalize">
                    {us.level} level
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to="/messages" className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Chat
                  </Button>
                </Link>
                <Button
                  size="sm"
                  className="flex-1 text-xs bg-teal-600 hover:bg-teal-700 gap-1"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" /> Request Swap
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
