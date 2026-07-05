import React from "react";
import { Button } from "@/components/ui/button";
import { User, Edit2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PageLoader from "@/components/shared/PageLoader";
import PageHeader from "@/components/shared/PageHeader";
import ProfileForm from "@/features/profile/components/ProfileForm";
import ProfileDetails from "@/features/profile/components/ProfileDetails";
import { useProfile } from "@/hooks/profile/useProfile";

export default function ProfilePage() {
  const { me, profile, editing, setEditing, form, setForm, loading, persistProfile } =
    useProfile();
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await persistProfile();
      toast({ title: "Profile updated!" });
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="My Profile"
        description="Your profile is private. Only your skill swap partners can see your display name."
      />

      <div className="bg-white rounded-2xl border border-border/50 p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/50">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center">
            <User className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl">
              {profile?.display_name || me?.full_name || "Your Name"}
            </h2>
            <p className="text-sm text-muted-foreground">{me?.email}</p>
          </div>
          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="ml-auto gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
          ) : null}
        </div>

        {editing ? (
          <ProfileForm
            form={form}
            setForm={setForm}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <ProfileDetails
            profile={profile}
            onStartEditing={() => setEditing(true)}
          />
        )}
      </div>
    </div>
  );
}
