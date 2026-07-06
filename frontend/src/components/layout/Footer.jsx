import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getActorHomePath, getActorProfilePath } from "@/lib/access-control";
import { roles } from "@/lib/domain-enums";

export default function Footer() {
  const { isAuthenticated, actorRole } = useAuth();
  const homePath = getActorHomePath(actorRole);
  const profilePath = getActorProfilePath(actorRole);
  const isRegularUser = actorRole === roles.regularUser;
  const isOrganization = actorRole === roles.organization;
  const isAdmin = actorRole === roles.admin;

  const firstColumnLinks = isAuthenticated
    ? isRegularUser
      ? [
          { to: "/discover", label: "Discover Skills" },
          { to: "/courses", label: "Courses" },
          { to: "/skill-swap", label: "Skill Swap" },
        ]
      : isOrganization
        ? [
            { to: "/org", label: "Organization Dashboard" },
            { to: "/organization-profile", label: "Organization Profile" },
            { to: "/course-builder", label: "Course Builder" },
          ]
        : [
            { to: "/admin", label: "Admin Dashboard" },
          ]
    : [
        { to: "/discover", label: "Discover Skills" },
        { to: "/courses", label: "Courses" },
        { to: "/skill-swap", label: "Skill Swap" },
      ];

  const secondColumnLinks = isAuthenticated
    ? isRegularUser
      ? [
          { to: "/jobs", label: "Jobs" },
          { to: "/events", label: "Events" },
        ]
      : isOrganization
        ? [
            { to: "/courses", label: "Public Courses" },
            { to: "/events", label: "Public Events" },
            { to: "/jobs", label: "Public Jobs" },
          ]
        : [
            { to: "/organizations/register", label: "Organization Onboarding" },
            { to: "/get-started", label: "Public Entry Flow" },
          ]
    : [
        { to: "/jobs", label: "Jobs" },
        { to: "/events", label: "Events" },
      ];

  const accountHeading = isAdmin ? "Admin" : isOrganization ? "Organization" : "Account";
  const accountLinks = isAuthenticated
    ? isAdmin
      ? [{ to: homePath, label: "Admin Dashboard" }]
      : [
          { to: homePath, label: "Dashboard" },
          { to: profilePath, label: isOrganization ? "Organization Profile" : "Profile" },
        ]
    : [
        { to: "/get-started", label: "Create Account" },
        { to: "/login", label: "Sign In" },
      ];

  return (
    <footer className="bg-white border-t border-border/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="font-heading font-bold text-lg">SkillVerse</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Learn, teach, and grow together. Your journey to new skills starts
              here.
            </p>
          </div>
          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">
              {isOrganization ? "Workspace" : isAdmin ? "Oversight" : "Learn"}
            </h4>
            <div className="space-y-2">
              {firstColumnLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">
              {isOrganization ? "Public Browse" : isAdmin ? "Platform" : "Opportunities"}
            </h4>
            <div className="space-y-2">
              {secondColumnLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">{accountHeading}</h4>
            <div className="space-y-2">
              {accountLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-border/50 mt-8 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © 2026 SkillVerse. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
