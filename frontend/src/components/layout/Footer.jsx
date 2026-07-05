import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
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
            <h4 className="font-heading font-semibold text-sm mb-3">Learn</h4>
            <div className="space-y-2">
              <Link
                to="/discover"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Discover Skills
              </Link>
              <Link
                to="/courses"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Courses
              </Link>
              <Link
                to="/skill-swap"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skill Swap
              </Link>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">
              Opportunities
            </h4>
            <div className="space-y-2">
              <Link
                to="/jobs"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Jobs
              </Link>
              <Link
                to="/events"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Events
              </Link>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">Account</h4>
            <div className="space-y-2">
              <Link
                to="/dashboard"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Profile
              </Link>
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
