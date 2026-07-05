import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Compass,
  Lock,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const browseLinks = [
  {
    title: "Browse courses",
    description:
      "Explore public programs and see which organizations are verified.",
    path: "/courses",
    icon: BookOpen,
  },
  {
    title: "Discover skills",
    description:
      "See how SkillVerse connects skills, events, and opportunities.",
    path: "/discover",
    icon: Compass,
  },
];

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.14),_transparent_32%),linear-gradient(180deg,_#f8fffd_0%,_#ffffff_45%,_#f7f4ea_100%)]">
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-3xl sm:mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-teal-700">
            <ShieldCheck className="h-4 w-4" />
            Public entry flow
          </span>
          <h1 className="mt-5 font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Start as a guest, join when you are ready, and keep protected actions protected.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Guests can browse public learning and opportunity surfaces. Account creation opens the protected workflow for skill swaps, saved activity, messaging, and your private profile.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border/60 bg-white/90 p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  Join as a regular user
                </h2>
                <p className="text-sm text-muted-foreground">
                  Create an account, verify your email, then complete your private profile and skills.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link to="/register" className="sm:col-span-2">
                <Button className="h-12 w-full justify-between bg-teal-600 px-5 text-base hover:bg-teal-700">
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="h-11 w-full">
                  Sign in
                </Button>
              </Link>
              <Link to="/forgot-password">
                <Button variant="ghost" className="h-11 w-full">
                  Reset password
                </Button>
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-4 w-4 text-amber-700" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-900">
                    Protected after sign-up
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-amber-900/80">
                    Skill swaps, messaging, dashboards, saved items, and private regular-user profile data stay behind authentication.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-border/60 bg-white/90 p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground">
                    Organization path
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Register organizations through a separate onboarding path with primary-login setup, location fields, optional license upload, and email verification.
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <Link to="/organizations/register">
                  <Button variant="outline" className="h-11 w-full justify-between">
                    Start organization onboarding
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-white/90 p-6 shadow-sm sm:p-8">
              <h2 className="font-heading text-xl font-bold text-foreground">
                Browse publicly first
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Guests can review public discovery surfaces before creating an account.
              </p>
              <div className="mt-5 space-y-3">
                {browseLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="flex items-start gap-3 rounded-2xl border border-border/60 p-4 transition-colors hover:border-teal-300 hover:bg-teal-50/50"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-medium text-foreground">
                            {item.title}
                          </h3>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
