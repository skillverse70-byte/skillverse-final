import { useEffect, useMemo, useState } from "react";
import {
  createUserSkill,
  deleteUserSkill,
  fetchSkillPortfolioData,
  updateUserSkill,
} from "@/services/skills/skills.service";

const emptySkillForm = {
  skill_name: "",
  level: "beginner",
  can_teach: false,
  wants_to_learn: true,
};

export function useSkillPortfolio() {
  const [me, setMe] = useState(null);
  const [skills, setSkills] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptySkillForm);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchSkillPortfolioData();
        if (!active) {
          return;
        }
        setMe(data.user);
        setSkills(data.skills);
      } catch (error) {
        console.error(error);
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

  const teaching = useMemo(
    () => skills.filter((skill) => skill.can_teach),
    [skills],
  );
  const learning = useMemo(
    () => skills.filter((skill) => skill.wants_to_learn && !skill.can_teach),
    [skills],
  );

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addSkill = async () => {
    if (!form.skill_name.trim()) {
      return null;
    }
    const created = await createUserSkill({
      ...form,
      user_id: me.id,
    });
    setSkills((current) => [...current, created]);
    setForm(emptySkillForm);
    setShowAdd(false);
    return created;
  };

  const changeSkillLevel = async (id, level) => {
    const updated = await updateUserSkill(id, { level });
    setSkills((current) =>
      current.map((skill) => (skill.id === id ? updated : skill)),
    );
    return updated;
  };

  const removeSkill = async (id) => {
    await deleteUserSkill(id);
    setSkills((current) => current.filter((skill) => skill.id !== id));
  };

  return {
    me,
    skills,
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
  };
}
