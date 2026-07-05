import React from "react";
import { Edit2, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import ProfileDetails from "@/features/profile/components/ProfileDetails";
import ProfileForm from "@/features/profile/components/ProfileForm";
import { useProfile } from "@/hooks/profile/useProfile";

export default function ProfilePage() {
  const {
    profile,
    editing,
    setEditing,
    form,
    setForm,
    availableFieldCatalog,
    newFieldInterest,
    setNewFieldInterest,
    loading,
    error,
    savingProfile,
    savingField,
    persistProfile,
    createFieldInterest,
    deleteFieldInterest,
  } = useProfile();
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await persistProfile();
      toast({ title: "Profile updated!" });
    } catch (requestError) {
      toast({
        title: requestError.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleAddFieldInterest = async () => {
    try {
      await createFieldInterest();
      toast({ title: "Field interest added!" });
    } catch (requestError) {
      toast({
        title: requestError.message || "Could not add field interest",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFieldInterest = async (id) => {
    try {
      await deleteFieldInterest(id);
      toast({ title: "Field interest removed." });
    } catch (requestError) {
      toast({
        title: requestError.message || "Could not remove field interest",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        title="My Profile"
        description="Your regular-user profile stays private while powering matching, recommendations, and future opportunity relevance."
      />

      <div className="rounded-2xl border border-border/50 bg-white p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-4 border-b border-border/50 pb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50">
            <User className="h-8 w-8 text-teal-600" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold">
              {profile?.user?.full_name || "Your Name"}
            </h2>
            <p className="text-sm text-muted-foreground">{profile?.user?.email}</p>
          </div>
          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="ml-auto gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </Button>
          ) : null}
        </div>

        {error ? (
          <div className="mb-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {editing ? (
          <ProfileForm
            form={form}
            setForm={setForm}
            fieldInterests={profile?.field_interests || []}
            availableFieldCatalog={availableFieldCatalog}
            newFieldInterest={newFieldInterest}
            setNewFieldInterest={setNewFieldInterest}
            onAddFieldInterest={handleAddFieldInterest}
            onDeleteFieldInterest={handleDeleteFieldInterest}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
            savingProfile={savingProfile}
            savingField={savingField}
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
