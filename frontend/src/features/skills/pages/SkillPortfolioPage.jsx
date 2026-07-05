import React from "react";
import { BookOpen, GraduationCap } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import SkillCard from "@/features/skills/components/SkillCard";
import AddSkillDialog from "@/features/skills/components/AddSkillDialog";
import { useSkillPortfolio } from "@/hooks/skills/useSkillPortfolio";

export default function SkillPortfolioPage() {
  const {
    teaching,
    learning,
    showAdd,
    setShowAdd,
    form,
    setField,
    loading,
    addSkill,
    changeSkillLevel,
    removeSkill,
  } = useSkillPortfolio();
  const { toast } = useToast();

  const handleAdd = async () => {
    try {
      await addSkill();
      toast({ title: "Skill added!" });
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Skill Portfolio"
        description="Manage skills you teach and want to learn."
        actions={
          <AddSkillDialog
            open={showAdd}
            onOpenChange={setShowAdd}
            form={form}
            setField={setField}
            onSubmit={handleAdd}
          />
        }
      />

      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-5 h-5 text-amber-600" />
            <h2 className="font-heading font-semibold text-lg">
              Skills I Teach
            </h2>
            <span className="text-sm text-muted-foreground">
              ({teaching.length})
            </span>
          </div>
          {teaching.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No teaching skills yet.
            </p>
          ) : (
            <div className="space-y-2">
              {teaching.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onLevelChange={changeSkillLevel}
                  onDelete={removeSkill}
                />
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="font-heading font-semibold text-lg">
              Skills I'm Learning
            </h2>
            <span className="text-sm text-muted-foreground">
              ({learning.length})
            </span>
          </div>
          {learning.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No learning skills yet.
            </p>
          ) : (
            <div className="space-y-2">
              {learning.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onLevelChange={changeSkillLevel}
                  onDelete={removeSkill}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
