import React from "react";
import { BriefcaseBusiness, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

function TagSection({ title, items, className, emptyLabel }) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {items?.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item} className={className}>
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

const experienceLevelLabels = {
  student: "Student",
  early_career: "Early Career",
  mid_career: "Mid Career",
  experienced: "Experienced",
};

export default function ProfileDetails({ profile, onStartEditing }) {
  if (!profile) {
    return (
      <div className="py-6 text-center">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
        <p className="mb-4 text-sm text-muted-foreground">
          You haven&apos;t set up your profile yet.
        </p>
        <Button onClick={onStartEditing} className="bg-teal-600 hover:bg-teal-700">
          Set Up Profile
        </Button>
      </div>
    );
  }

  const fieldInterests = (profile.field_interests || []).map(
    (entry) => entry.field_interest.name,
  );

  return (
    <div className="space-y-5">
      {profile.bio ? (
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            About
          </div>
          <p className="text-sm leading-6 text-foreground">{profile.bio}</p>
        </div>
      ) : null}

      {profile.experience_level ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BriefcaseBusiness className="h-4 w-4" />
          {experienceLevelLabels[profile.experience_level] || profile.experience_level}
        </div>
      ) : null}

      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Interests Summary
        </div>
        <p className="text-sm leading-6 text-foreground">
          {profile.interests_summary || "No interests summary added yet."}
        </p>
      </div>

      <TagSection
        title="Field Interests"
        items={fieldInterests}
        emptyLabel="No field interests added yet."
        className="rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-700"
      />
    </div>
  );
}
