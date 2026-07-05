import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, ArrowLeftRight, Calendar, Briefcase, Users, Star, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: BookOpen,
    title: "Learn at Your Pace",
    description: "Explore structured courses with video lessons, quizzes, and hands-on projects.",
    color: "bg-teal-50 text-teal-600",
  },
  {
    icon: ArrowLeftRight,
    title: "Swap Skills for Free",
    description: "Match with someone who has what you need — and teach what you know in return.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Calendar,
    title: "Attend Events",
    description: "Join workshops, meetups, and webinars from verified organizations.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Briefcase,
    title: "Find Opportunities",
    description: "Discover jobs and internships matched to the skills you're building.",
    color: "bg-purple-50 text-purple-600",
  },
];

const stats = [
  { value: "10K+", label: "Active Learners" },
  { value: "500+", label: "Courses" },
  { value: "2K+", label: "Skill Swaps" },
  { value: "300+", label: "Organizations" },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Navbar for landing */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-heading font-bold text-xl text-foreground">SkillVerse</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/discover">
              <Button variant="ghost" className="text-sm">Explore</Button>
            </Link>
            <Link to="/onboarding">
              <Button className="bg-teal-600 hover:bg-teal-700 text-sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50/80 via-white to-amber-50/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-sm font-medium mb-6">
              <Star className="w-3.5 h-3.5 fill-teal-500" />
              Your learning journey starts here
            </div>
            <h1 className="font-heading font-extrabold text-4xl sm:text-5xl md:text-6xl text-foreground leading-tight mb-6">
              Learn, teach, and{" "}
              <span className="text-gradient">grow together</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8 max-w-xl">
              SkillVerse connects you with courses, skill swaps, events, and career opportunities — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/onboarding">
                <Button size="lg" className="bg-teal-600 hover:bg-teal-700 h-12 px-8 text-base gap-2 w-full sm:w-auto">
                  Start Learning <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/courses">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base w-full sm:w-auto">
                  Browse Courses
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Hero illustration - abstract shapes */}
          <div className="hidden lg:block absolute right-8 top-20 w-96 h-96">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-100/60 rounded-3xl rotate-12" />
            <div className="absolute bottom-8 right-12 w-48 h-48 bg-amber-100/60 rounded-3xl -rotate-6" />
            <div className="absolute top-16 right-32 w-32 h-32 bg-blue-100/60 rounded-3xl rotate-3" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/50 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-heading font-extrabold text-3xl text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-foreground mb-4">
            Everything you need to grow
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Whether you're picking up a new skill or sharing your expertise, SkillVerse has you covered.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl border border-border/50 p-6 card-hover"
              >
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-heading font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Trust */}
      <section className="bg-white border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl mb-4">
              Built on trust and transparency
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Organizations on SkillVerse go through a verification process. Look for the
              <span className="inline-flex items-center mx-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                <CheckCircle className="w-3 h-3 mr-1" /> Verified
              </span>
              badge to know you're learning from a trusted source.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                Community-driven
              </div>
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-teal-600" />
                Always free skill swaps
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-3xl p-10 md:p-16 text-center text-white">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl mb-4">Ready to start your journey?</h2>
          <p className="text-teal-100 text-lg mb-8 max-w-lg mx-auto">
            Join thousands of learners, teachers, and professionals on SkillVerse.
          </p>
          <Link to="/onboarding">
            <Button size="lg" className="bg-white text-teal-700 hover:bg-teal-50 h-12 px-8 text-base gap-2">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="text-xs text-muted-foreground">© 2026 SkillVerse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
