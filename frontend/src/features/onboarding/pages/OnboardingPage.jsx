import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, User, BookOpen, Target, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const INTERESTS = ["Design", "Programming", "Marketing", "Photography", "Music", "Writing", "Data Science", "Languages", "Business", "Art", "Health & Fitness", "Cooking"];
const LEVELS = [
  { value: "student", label: "Student", desc: "Currently studying" },
  { value: "early_career", label: "Early Career", desc: "0–3 years experience" },
  { value: "mid_career", label: "Mid Career", desc: "3–8 years experience" },
  { value: "experienced", label: "Experienced", desc: "8+ years experience" },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ display_name: "", bio: "", interests: [], experience_level: "student", skills_to_learn: "", skills_to_teach: "" });
  const navigate = useNavigate();

  const steps = [
    { icon: User, label: "About You" },
    { icon: BookOpen, label: "Your Interests" },
    { icon: Target, label: "Your Goals" },
    { icon: CheckCircle, label: "All Set" },
  ];

  const toggleInterest = (i) => {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(i) ? prev.interests.filter(x => x !== i) : [...prev.interests, i]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/50 via-white to-amber-50/30 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i <= step ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-400"
              }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? "bg-teal-600" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-8">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-heading font-bold text-2xl mb-2">Welcome to SkillVerse 👋</h2>
                <p className="text-muted-foreground text-sm mb-6">Let's set up your profile so we can personalize your experience.</p>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Display Name</Label>
                    <Input
                      placeholder="How should we call you?"
                      value={form.display_name}
                      onChange={e => setForm({...form, display_name: e.target.value})}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Short Bio</Label>
                    <Textarea
                      placeholder="Tell us a bit about yourself..."
                      value={form.bio}
                      onChange={e => setForm({...form, bio: e.target.value})}
                      className="mt-1.5 resize-none"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Experience Level</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      {LEVELS.map(l => (
                        <button
                          key={l.value}
                          onClick={() => setForm({...form, experience_level: l.value})}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            form.experience_level === l.value
                              ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                              : "border-border hover:border-teal-200"
                          }`}
                        >
                          <div className="font-medium text-sm">{l.label}</div>
                          <div className="text-xs text-muted-foreground">{l.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-heading font-bold text-2xl mb-2">What interests you?</h2>
                <p className="text-muted-foreground text-sm mb-6">Pick topics you'd like to explore. You can change these later.</p>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(i => (
                    <button
                      key={i}
                      onClick={() => toggleInterest(i)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        form.interests.includes(i)
                          ? "bg-teal-600 text-white"
                          : "bg-secondary text-foreground hover:bg-teal-50 hover:text-teal-700"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-heading font-bold text-2xl mb-2">Set your goals</h2>
                <p className="text-muted-foreground text-sm mb-6">What would you like to learn or teach? This helps us match you with the right people and courses.</p>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Skills I want to learn</Label>
                    <Input
                      placeholder="e.g. Python, Guitar, Public Speaking"
                      value={form.skills_to_learn}
                      onChange={e => setForm({...form, skills_to_learn: e.target.value})}
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Separate with commas</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Skills I can teach</Label>
                    <Input
                      placeholder="e.g. Graphic Design, Cooking, Spanish"
                      value={form.skills_to_teach}
                      onChange={e => setForm({...form, skills_to_teach: e.target.value})}
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Separate with commas</p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="font-heading font-bold text-2xl mb-2">You're all set! 🎉</h2>
                <p className="text-muted-foreground text-sm mb-2">
                  Welcome, <span className="font-medium text-foreground">{form.display_name || "friend"}</span>!
                </p>
                <p className="text-muted-foreground text-sm">
                  Head to your dashboard to start exploring courses, find skill swap partners, and discover opportunities.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
            {step > 0 && step < 3 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            ) : <div />}
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} className="bg-teal-600 hover:bg-teal-700 gap-2">
                {step === 2 ? "Finish Setup" : "Continue"} <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={() => navigate("/discover")} className="bg-teal-600 hover:bg-teal-700 gap-2 mx-auto">
                Explore SkillVerse <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
