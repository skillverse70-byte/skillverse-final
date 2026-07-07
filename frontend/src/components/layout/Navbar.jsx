import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMessagesCount } from "@/hooks/messages/useUnreadMessagesCount";
import { getActorHomePath, getActorProfilePath } from "@/lib/access-control";
import { useAppShellStore } from "@/stores/app-shell-store";
import {
  Menu,
  X,
  BookOpen,
  Compass,
  ArrowLeftRight,
  Calendar,
  Briefcase,
  Building,
  MessageCircle,
  User,
  LayoutDashboard,
  GraduationCap,
  Bookmark,
  LogIn,
  UserPlus,
} from "lucide-react";
import { roles } from "@/lib/domain-enums";

const primaryNavByRole = {
  [roles.guest]: [
    { label: "Discover", path: "/discover", icon: Compass },
    { label: "Courses", path: "/courses", icon: BookOpen },
    { label: "Skill Swap", path: "/skill-swap", icon: ArrowLeftRight },
    { label: "Events", path: "/events", icon: Calendar },
    { label: "Jobs", path: "/jobs", icon: Briefcase },
  ],
  [roles.regularUser]: [
    { label: "Discover", path: "/discover", icon: Compass },
    { label: "Courses", path: "/courses", icon: BookOpen },
    { label: "Skill Swap", path: "/skill-swap", icon: ArrowLeftRight },
    { label: "Events", path: "/events", icon: Calendar },
    { label: "Jobs", path: "/jobs", icon: Briefcase },
  ],
  [roles.organization]: [
    { label: "Dashboard", path: "/org", icon: LayoutDashboard },
    { label: "Courses", path: "/org?tab=courses", icon: BookOpen },
    { label: "Events", path: "/org?tab=events", icon: Calendar },
    { label: "Jobs", path: "/org?tab=jobs", icon: Briefcase },
    { label: "Learners", path: "/org?tab=learners", icon: GraduationCap },
  ],
  [roles.admin]: [
    { label: "Admin Dashboard", path: "/admin", icon: LayoutDashboard },
    { label: "Verification", path: "/admin?tab=orgs", icon: Building },
    { label: "Finance", path: "/admin?tab=financial", icon: BookOpen },
    { label: "Events", path: "/admin?tab=events", icon: Calendar },
  ],
};

const quickLinksByRole = {
  [roles.regularUser]: [
    { path: "/messages", label: "Messages", icon: MessageCircle },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/skill-portfolio", label: "Portfolio", icon: GraduationCap },
    { path: "/saved-opportunities", label: "Saved", icon: Bookmark },
  ],
  [roles.organization]: [
    { path: "/org", label: "Dashboard", icon: LayoutDashboard },
    { path: "/organization-profile", label: "Org Profile", icon: Building },
    { path: "/course-builder", label: "Course Builder", icon: BookOpen },
  ],
  [roles.admin]: [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  ],
};

function isNavLinkActive(location, linkPath) {
  const [pathname, rawQuery = ""] = linkPath.split("?");
  if (!location.pathname.startsWith(pathname)) {
    return false;
  }
  if (!rawQuery) {
    return true;
  }

  const expectedParams = new URLSearchParams(rawQuery);
  const currentParams = new URLSearchParams(location.search);
  return Array.from(expectedParams.entries()).every(
    ([key, value]) => currentParams.get(key) === value,
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, logout, actorRole } = useAuth();
  const unreadNotificationCount = useAppShellStore(
    (state) => state.unreadNotificationCount,
  );
  const homePath = getActorHomePath(actorRole);
  const profilePath = getActorProfilePath(actorRole);
  useUnreadMessagesCount();
  const primaryNavLinks = primaryNavByRole[actorRole] || primaryNavByRole[roles.guest];
  const quickLinks = isAuthenticated
    ? quickLinksByRole[actorRole] || [{ path: homePath, label: "Dashboard", icon: LayoutDashboard }]
    : [];
  const showProfileShortcut = isAuthenticated && actorRole !== roles.admin;
  const guestCtas = [
    { path: "/login", label: "Log in", icon: LogIn, variant: "ghost" },
    { path: "/get-started", label: "Get Started", icon: UserPlus, variant: "default" },
  ];

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
            {primaryNavLinks.map((link) => {
              const isActive = isNavLinkActive(location, link.path);
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

          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                const isMessagesLink = link.path === "/messages";
                return (
                  <Link key={link.path} to={link.path}>
                    <Button variant="ghost" size="icon" className={isMessagesLink ? "relative" : ""}>
                      <Icon className="w-5 h-5" />
                      {isMessagesLink && unreadNotificationCount > 0 ? (
                        <span className="absolute -bottom-1 -right-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                          {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                        </span>
                      ) : null}
                    </Button>
                  </Link>
                );
              })}
              {showProfileShortcut ? (
                <Link to={profilePath}>
                  <Button variant="ghost" size="icon">
                    <User className="w-5 h-5" />
                  </Button>
                </Link>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => logout()}>
                Log out
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              {guestCtas.map((cta) => {
                const Icon = cta.icon;
                return (
                  <Link key={cta.path} to={cta.path}>
                    <Button
                      variant={cta.variant}
                      size="sm"
                      className={cta.variant === "default" ? "bg-teal-600 hover:bg-teal-700" : ""}
                    >
                      <Icon className="mr-2 w-4 h-4" />
                      {cta.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}

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
            {primaryNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = isNavLinkActive(location, link.path);
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
              {isAuthenticated ? (
                <>
                  {quickLinks.map((link) => {
                    const Icon = link.icon;
                    const isMessagesLink = link.path === "/messages";
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setMobileOpen(false)}
                        className="flex-1"
                      >
                        <Button variant="outline" size="sm" className="relative w-full gap-2">
                          <Icon className="w-4 h-4" /> {link.label}
                          {isMessagesLink && unreadNotificationCount > 0 ? (
                            <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                              {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                            </span>
                          ) : null}
                        </Button>
                      </Link>
                    );
                  })}
                  {showProfileShortcut ? (
                    <Link
                      to={profilePath}
                      onClick={() => setMobileOpen(false)}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <User className="w-4 h-4" /> Profile
                      </Button>
                    </Link>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                  >
                    <LogIn className="w-4 h-4 rotate-180" /> Log out
                  </Button>
                </>
              ) : (
                <>
                  {guestCtas.map((cta) => {
                    const Icon = cta.icon;
                    return (
                      <Link
                        key={cta.path}
                        to={cta.path}
                        onClick={() => setMobileOpen(false)}
                        className="flex-1"
                      >
                        <Button
                          variant={cta.variant === "default" ? "default" : "outline"}
                          size="sm"
                          className={`w-full gap-2 ${cta.variant === "default" ? "bg-teal-600 hover:bg-teal-700" : ""}`}
                        >
                          <Icon className="w-4 h-4" /> {cta.label}
                        </Button>
                      </Link>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
