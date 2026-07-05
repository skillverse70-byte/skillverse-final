import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  User,
  BookOpen,
  Target,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchProfileData,
  saveProfile,
  addFieldInterest,
  removeFieldInterest,
} from "@/services/profile/profile.service";
import {
  fetchSkillPortfolioData,
  createUserSkill,
  updateUserSkill,
} from "@/services/skills/skills.service";

const INTERESTS = [
  "Design",
  "Programming",
  "Marketing",
  "Photography",
  "Music",
  "Writing",
  "Data Science",
  "Languages",
  "Business",
  "Art",
  "Health & Fitness",
  "Cooking",
];

const LEVELS = [
  { value: "student", label: "Student", desc: "Currently studying" },
  { value: "early_career", label: "Early Career", desc: "0-3 years experience" },
  { value: "mid_career", label: "Mid Career", desc: "3-8 years experience" },
  { value: "experienced", label: "Experienced", desc: "8+ years experience" },
];

const emptyForm = {
  display_name: "",
  bio: "",
  interests: [],
  experience_level: "student",
  skills_to_learn: "",
  skills_to_teach: "",
};

function parseCommaSeparatedSkills(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeDesiredSkills(skillsToTeach, skillsToLearn) {
  const desired = new Map();

  skillsToTeach.forEach((name) => {
    desired.set(name.toLowerCase(), {
      name,
      direction: "offering",
    });
  });

  skillsToLearn.forEach((name) => {
    const key = name.toLowerCase();
    const existing = desired.get(key);
    if (existing) {
      desired.set(key, { ...existing, direction: "both" });
      return;
    }
    desired.set(key, {
      name,
      direction: "requesting",
    });
  });

  return desired;
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [profile, setProfile] = useState(null);
  const [currentSkills, setCurrentSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const steps = useMemo(
    () => [
      { icon: User, label: "About You" },
      { icon: BookOpen, label: "Your Interests" },
      { icon: Target, label: "Your Goals" },
      { icon: CheckCircle, label: "All Set" },
    ],
    [],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [profileData, skillsData] = await Promise.all([
          fetchProfileData(),
          fetchSkillPortfolioData(),
        ]);

        if (!active) {
          return;
        }

        setProfile(profileData);
        setCurrentSkills(skillsData);

        const teaching = [];
        const learning = [];

        skillsData.forEach((skill) => {
          if (skill.direction === "offering" || skill.direction === "both") {
            teaching.push(skill.skill.name);
          }
          if (skill.direction === "requesting" || skill.direction === "both") {
            learning.push(skill.skill.name);
          }
        });

        setForm({
          display_name: profileData.user?.full_name || "",
          bio: profileData.bio || "",
          interests: (profileData.field_interests || []).map(
            (entry) => entry.field_interest.name,
          ),
          experience_level: profileData.experience_level || "student",
          skills_to_learn: learning.join(", "),
          skills_to_teach: teaching.join(", "),
        });
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Failed to load onboarding data.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const toggleInterest = (interest) => {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((value) => value !== interest)
        : [...current.interests, interest],
    }));
  };

  const syncFieldInterests = async () => {
    const currentLinks = profile?.field_interests || [];
    const currentByName = new Map(
      currentLinks.map((entry) => [
        entry.field_interest.name.toLowerCase(),
        entry,
      ]),
    );
    const desiredNames = new Set(form.interests.map((item) => item.toLowerCase()));

    const removals = currentLinks.filter(
      (entry) => !desiredNames.has(entry.field_interest.name.toLowerCase()),
    );
    const additions = form.interests.filter(
      (name) => !currentByName.has(name.toLowerCase()),
    );

    await Promise.all(removals.map((entry) => removeFieldInterest(entry.id)));
    await Promise.all(additions.map((name) => addFieldInterest({ name })));
  };

  const syncSkills = async () => {
    const desiredSkills = mergeDesiredSkills(
      parseCommaSeparatedSkills(form.skills_to_teach),
      parseCommaSeparatedSkills(form.skills_to_learn),
    );
    const currentByName = new Map(
      currentSkills.map((entry) => [entry.skill.name.toLowerCase(), entry]),
    );

    const updates = [];
    const creations = [];

    desiredSkills.forEach((desired, key) => {
      const existing = currentByName.get(key);
      if (existing) {
        if (existing.direction !== desired.direction) {
          updates.push(
            updateUserSkill(existing.id, {
              direction: desired.direction,
              experience_note: existing.experience_note || "",
            }),
          );
        }
        return;
      }

      creations.push(
        createUserSkill({
          name: desired.name,
          direction: desired.direction,
        }),
      );
    });

    await Promise.all([...updates, ...creations]);
  };

  const handleFinish = async () => {
    setError("");
    setSaving(true);

    try {
      await saveProfile({
        full_name: form.display_name,
        bio: form.bio,
        interests_summary: form.interests.join(", "),
        experience_level: form.experience_level,
      });
      await syncFieldInterests();
      await syncSkills();
      setStep(3);
    } catch (requestError) {
      setError(requestError.message || "Failed to save your onboarding details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50/50 via-white to-amber-50/30 flex items-center justify-center px-4 py-12">
        <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-white px-5 py-4 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
          Loading your onboarding setup...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/50 via-white to-amber-50/30 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((stepItem, index) => (
            <div key={stepItem.label} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index <= step ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                {index < step ? <CheckCircle className="w-4 h-4" /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${index < step ? "bg-teal-600" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-8">
          {error ? (
            <div className="mb-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-heading font-bold text-2xl mb-2">Welcome to SkillVerse</h2>
                <p className="text-muted-foreground text-sm mb-6">Let's set up your profile so we can personalize your experience.</p>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Display Name</Label>
                    <Input
                      placeholder="How should we call you?"
                      value={form.display_name}
                      onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Short Bio</Label>
                    <Textarea
                      placeholder="Tell us a bit about yourself..."
                      value={form.bio}
                      onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                      className="mt-1.5 resize-none"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Experience Level</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      {LEVELS.map((level) => (
                        <button
                          key={level.value}
                          onClick={() => setForm((current) => ({ ...current, experience_level: level.value }))}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            form.experience_level === level.value
                              ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                              : "border-border hover:border-teal-200"
                          }`}
                        >
                          <div className="font-medium text-sm">{level.label}</div>
                          <div className="text-xs text-muted-foreground">{level.desc}</div>
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
                <p className="text-muted-foreground text-sm mb-6">Pick topics you'd like to explore. These also become discovery signals across the platform.</p>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        form.interests.includes(interest)
                          ? "bg-teal-600 text-white"
                          : "bg-secondary text-foreground hover:bg-teal-50 hover:text-teal-700"
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-heading font-bold text-2xl mb-2">Set your goals</h2>
                <p className="text-muted-foreground text-sm mb-6">What would you like to learn or teach? These will be saved into your real skill portfolio.</p>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Skills I want to learn</Label>
                    <Input
                      placeholder="e.g. Python, Guitar, Public Speaking"
                      value={form.skills_to_learn}
                      onChange={(event) => setForm((current) => ({ ...current, skills_to_learn: event.target.value }))}
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Separate with commas</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Skills I can teach</Label>
                    <Input
                      placeholder="e.g. Graphic Design, Cooking, Spanish"
                      value={form.skills_to_teach}
                      onChange={(event) => setForm((current) => ({ ...current, skills_to_teach: event.target.value }))}
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
                <h2 className="font-heading font-bold text-2xl mb-2">You're all set!</h2>
                <p className="text-muted-foreground text-sm mb-2">
                  Welcome, <span className="font-medium text-foreground">{form.display_name || "friend"}</span>.
                </p>
                <p className="text-muted-foreground text-sm">
                  Your profile, interests, and skill signals are now saved and ready for swaps, discovery, and future recommendations.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
            {step > 0 && step < 3 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)} className="gap-2" disabled={saving}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            ) : <div />}
            {step < 3 ? (
              step === 2 ? (
                <Button onClick={handleFinish} className="bg-teal-600 hover:bg-teal-700 gap-2" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving setup...
                    </>
                  ) : (
                    <>
                      Finish Setup <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={() => setStep(step + 1)} className="bg-teal-600 hover:bg-teal-700 gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              )
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
