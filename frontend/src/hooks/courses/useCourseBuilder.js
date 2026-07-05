import { useEffect, useState } from "react";
import { fetchCourseBuilderData } from "@/services/courses/courses.service";

export function useCourseBuilder() {
  const [organization, setOrganization] = useState(null);
  const [courses, setCourses] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchCourseBuilderData();
        if (!active) {
          return;
        }
        setOrganization(data.organization);
        setCourses(data.courses);
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

  const handleSaved = (course) => {
    setCourses((current) => {
      const exists = current.find((item) => item.id === course.id);
      return exists
        ? current.map((item) => (item.id === course.id ? course : item))
        : [course, ...current];
    });
    setEditing(null);
  };

  return {
    organization,
    courses,
    editing,
    setEditing,
    loading,
    handleSaved,
  };
}
