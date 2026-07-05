import React from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Sparkles } from "lucide-react";

function TagSection({ title, items, className }) {
  if (!items?.length) {
    return null;
  }

  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className={className}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ProfileDetails({ profile, onStartEditing }) {
  return (
    <div className="space-y-4">
      {profile?.bio ? (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            About
          </div>
          <p className="text-sm text-foreground">{profile.bio}</p>
        </div>
      ) : null}
      {profile?.location ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" /> {profile.location}
        </div>
      ) : null}
      <TagSection
        title="Interests"
        items={profile?.interests}
        className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-sm"
      />
      <TagSection
        title="Want to Learn"
        items={profile?.skills_to_learn}
        className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm"
      />
      <TagSection
        title="Can Teach"
        items={profile?.skills_to_teach}
        className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm"
      />
      {!profile ? (
        <div className="py-6 text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            You haven't set up your profile yet.
          </p>
          <Button onClick={onStartEditing} className="bg-teal-600 hover:bg-teal-700">
            Set Up Profile
          </Button>
        </div>
      ) : null}
    </div>
  );
}
