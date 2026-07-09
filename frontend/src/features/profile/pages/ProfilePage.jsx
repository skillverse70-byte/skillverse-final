import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BrainCircuit, Edit2, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import AIAdaptiveMonitoringPanel from "@/components/shared/AIAdaptiveMonitoringPanel";
import AICognitiveMonitoringConsentPanel from "@/components/shared/AICognitiveMonitoringConsentPanel";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import ProfileDetails from "@/features/profile/components/ProfileDetails";
import ProfileForm from "@/features/profile/components/ProfileForm";
import { useAIAdaptiveMonitoring } from "@/hooks/ai/useAIAdaptiveMonitoring";
import { useAICognitiveMonitoringConsent } from "@/hooks/ai/useAICognitiveMonitoringConsent";
import { useProfile } from "@/hooks/profile/useProfile";

export default function ProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = new URLSearchParams(location.search).get("tab") === "adaptive"
    ? "adaptive"
    : "profile";
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
  const {
    feature: monitoringFeature,
    consent: monitoringConsent,
    loading: monitoringLoading,
    saving: monitoringSaving,
    error: monitoringError,
    saveConsent,
    revokeConsent,
  } = useAICognitiveMonitoringConsent();
  const {
    adaptiveState,
    loading: adaptiveLoading,
    submitting: adaptiveSubmitting,
    error: adaptiveError,
    submitCheckIn,
  } = useAIAdaptiveMonitoring({
    surface: "/profile",
  });

  const setActiveTab = (tab) => {
    navigate(tab === "adaptive" ? "/profile?tab=adaptive" : "/profile", {
      replace: true,
    });
  };

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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader
        title="My Profile"
        description="Your regular-user profile stays private while powering matching, recommendations, and future opportunity relevance."
      />

      <div className="mb-5 inline-flex rounded-lg border border-border/60 bg-white p-1">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
            activeTab === "profile"
              ? "bg-teal-600 text-white"
              : "text-muted-foreground hover:bg-secondary/30"
          }`}
        >
          <User className="h-4 w-4" />
          Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("adaptive")}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
            activeTab === "adaptive"
              ? "bg-teal-600 text-white"
              : "text-muted-foreground hover:bg-secondary/30"
          }`}
        >
          <BrainCircuit className="h-4 w-4" />
          Adaptive
        </button>
      </div>

      {activeTab === "adaptive" ? (
        <div className="space-y-5">
          <AIAdaptiveMonitoringPanel
            title="Adaptive focus and mood mirror"
            description="Review your current focus drift, submit check-ins, and see response suggestions from approved signals."
            adaptiveState={adaptiveState}
            loading={adaptiveLoading}
            submitting={adaptiveSubmitting}
            error={adaptiveError}
            onSubmitCheckIn={submitCheckIn}
            manageHref="/profile?tab=adaptive"
          />
          <AICognitiveMonitoringConsentPanel
            title="Adaptive monitoring settings"
            description="Choose the non-camera signals SkillVerse may use for focus drift, mood mirror, and adaptive response suggestions."
            feature={monitoringFeature}
            consentView={monitoringConsent}
            loading={monitoringLoading}
            saving={monitoringSaving}
            error={monitoringError}
            sourceSurface="/profile"
            onSave={saveConsent}
            onRevoke={revokeConsent}
          />
        </div>
      ) : (
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
      )}
    </div>
  );
}
