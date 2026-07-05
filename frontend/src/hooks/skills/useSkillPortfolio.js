import { useEffect, useMemo, useState } from "react";
import {
  createUserSkill,
  deleteUserSkill,
  fetchSkillCatalog,
  fetchSkillPortfolioData,
  updateUserSkill,
} from "@/services/skills/skills.service";

const emptySkillForm = {
  name: "",
  direction: "requesting",
  experience_note: "",
};

export function useSkillPortfolio() {
  const [skills, setSkills] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptySkillForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [skillsData, catalogData] = await Promise.all([
          fetchSkillPortfolioData(),
          fetchSkillCatalog(),
        ]);
        if (!active) {
          return;
        }
        setSkills(skillsData);
        setCatalog(catalogData);
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Failed to load your skills.");
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

  const groupedSkills = useMemo(() => {
    const teaching = [];
    const learning = [];
    const both = [];

    skills.forEach((skill) => {
      if (skill.direction === "offering") {
        teaching.push(skill);
      } else if (skill.direction === "requesting") {
        learning.push(skill);
      } else {
        both.push(skill);
      }
    });

    return { teaching, learning, both };
  }, [skills]);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addSkill = async () => {
    const trimmed = form.name.trim();
    if (!trimmed) {
      return null;
    }

    setError("");
    setSaving(true);
    try {
      const matchingSkill = catalog.find(
        (entry) => entry.name.toLowerCase() === trimmed.toLowerCase(),
      );
      const created = await createUserSkill(
        matchingSkill
          ? {
              skill_id: matchingSkill.id,
              direction: form.direction,
              experience_note: form.experience_note,
            }
          : {
              name: trimmed,
              direction: form.direction,
              experience_note: form.experience_note,
            },
      );
      setSkills((current) => [...current, created]);
      setForm(emptySkillForm);
      setShowAdd(false);
      return created;
    } catch (requestError) {
      setError(requestError.message || "Failed to add skill.");
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  const updateSkill = async (id, updates) => {
    setError("");
    setSaving(true);
    try {
      const updated = await updateUserSkill(id, updates);
      setSkills((current) =>
        current.map((skill) => (skill.id === id ? updated : skill)),
      );
      return updated;
    } catch (requestError) {
      setError(requestError.message || "Failed to update skill.");
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  const removeSkill = async (id) => {
    setError("");
    setSaving(true);
    try {
      await deleteUserSkill(id);
      setSkills((current) => current.filter((skill) => skill.id !== id));
    } catch (requestError) {
      setError(requestError.message || "Failed to remove skill.");
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  return {
    skills,
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
  };
}
