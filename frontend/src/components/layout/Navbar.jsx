import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  BookOpen,
  Compass,
  ArrowLeftRight,
  Calendar,
  Briefcase,
  MessageCircle,
  User,
  LayoutDashboard,
  GraduationCap,
  Bookmark,
} from "lucide-react";

const navLinks = [
  { label: "Discover", path: "/discover", icon: Compass },
  { label: "Courses", path: "/courses", icon: BookOpen },
  { label: "Skill Swap", path: "/skill-swap", icon: ArrowLeftRight },
  { label: "Events", path: "/events", icon: Calendar },
  { label: "Jobs", path: "/jobs", icon: Briefcase },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-heading font-bold text-xl text-foreground">
              SkillVerse
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-teal-50 text-teal-700"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/skill-portfolio">
              <Button variant="ghost" size="icon">
                <GraduationCap className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/saved-opportunities">
              <Button variant="ghost" size="icon">
                <Bookmark className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/messages">
              <Button variant="ghost" size="icon" className="relative">
                <MessageCircle className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <LayoutDashboard className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="ghost" size="icon">
                <User className="w-5 h-5" />
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-secondary"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-white pb-4">
          <div className="px-4 pt-2 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-teal-50 text-teal-700"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            <div className="border-t border-border/50 pt-2 mt-2 grid grid-cols-2 gap-2">
              <Link
                to="/messages"
                onClick={() => setMobileOpen(false)}
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <MessageCircle className="w-4 h-4" /> Messages
                </Button>
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Button>
              </Link>
              <Link
                to="/skill-portfolio"
                onClick={() => setMobileOpen(false)}
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <GraduationCap className="w-4 h-4" /> Portfolio
                </Button>
              </Link>
              <Link
                to="/saved-opportunities"
                onClick={() => setMobileOpen(false)}
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Bookmark className="w-4 h-4" /> Saved
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
