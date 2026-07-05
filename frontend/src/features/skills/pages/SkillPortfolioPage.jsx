import React from "react";
import { BookOpen, GraduationCap, Repeat2, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import AddSkillDialog from "@/features/skills/components/AddSkillDialog";
import SkillCard from "@/features/skills/components/SkillCard";
import { useSkillPortfolio } from "@/hooks/skills/useSkillPortfolio";

function SkillSection({ icon: Icon, title, count, emptyLabel, skills, onSave, onDelete, saving }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-teal-600" />
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">({count})</span>
      </div>
      {skills.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onSave={onSave}
              onDelete={onDelete}
              saving={saving}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SkillPortfolioPage() {
  const {
    groupedSkills,
    catalog,
    showAdd,
    setShowAdd,
    form,
    setField,
    loading,
    saving,
    error,
    addSkill,
    updateSkill,
    removeSkill,
  } = useSkillPortfolio();
  const { toast } = useToast();

  const handleAdd = async () => {
    try {
      await addSkill();
      toast({ title: "Skill added!" });
    } catch (requestError) {
      toast({
        title: requestError.message || "Could not add skill",
        variant: "destructive",
      });
    }
  };

  const handleSaveSkill = async (id, updates) => {
    try {
      await updateSkill(id, updates);
      toast({ title: "Skill updated!" });
    } catch (requestError) {
      toast({
        title: requestError.message || "Could not update skill",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSkill = async (id) => {
    try {
      await removeSkill(id);
      toast({ title: "Skill removed." });
    } catch (requestError) {
      toast({
        title: requestError.message || "Could not remove skill",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Skill Portfolio"
        description="Manage the skills you can offer, the skills you want to learn, and the overlaps that power future matching."
        actions={(
          <AddSkillDialog
            open={showAdd}
            onOpenChange={setShowAdd}
            form={form}
            setField={setField}
            catalog={catalog}
            saving={saving}
            onSubmit={handleAdd}
          />
        )}
      />

      {error ? (
        <div className="mb-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!groupedSkills.teaching.length &&
      !groupedSkills.learning.length &&
      !groupedSkills.both.length ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-white p-10 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <h2 className="font-heading text-xl font-semibold">Start your skill graph</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Add at least one offered or requested skill so SkillVerse can use your profile for future matches, recommendations, and discovery.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <SkillSection
            icon={GraduationCap}
            title="Skills I Offer"
            count={groupedSkills.teaching.length}
            emptyLabel="No offered skills yet."
            skills={groupedSkills.teaching}
            onSave={handleSaveSkill}
            onDelete={handleDeleteSkill}
            saving={saving}
          />
          <SkillSection
            icon={BookOpen}
            title="Skills I Want to Learn"
            count={groupedSkills.learning.length}
            emptyLabel="No requested skills yet."
            skills={groupedSkills.learning}
            onSave={handleSaveSkill}
            onDelete={handleDeleteSkill}
            saving={saving}
          />
          <SkillSection
            icon={Repeat2}
            title="Skills I Both Offer and Learn"
            count={groupedSkills.both.length}
            emptyLabel="No dual-direction skills yet."
            skills={groupedSkills.both}
            onSave={handleSaveSkill}
            onDelete={handleDeleteSkill}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}
