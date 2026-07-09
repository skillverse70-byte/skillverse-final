function humanizeSuggestionType(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function cleanList(values, limit = 3) {
  return (Array.isArray(values) ? values : []).filter(Boolean).slice(0, limit);
}

export function buildPeerRecommendationItems(items = []) {
  return items.map((item) => {
    const match = item.match || {};
    const targetUser = match.target_user || {};
    const canLearn = cleanList(item.source_signals?.can_learn_from_match);
    const canTeach = cleanList(item.source_signals?.can_teach_match);
    const sharedFields = cleanList(item.source_signals?.shared_fields);

    return {
      key: `peer-${match.id || targetUser.id || targetUser.full_name || "unknown"}`,
      title: targetUser.full_name || "Suggested peer",
      subtitle:
        canLearn.length > 0
          ? `Can teach you ${canLearn.join(", ")}`
          : "Potential reciprocal learning match.",
      rationale: item.rationale,
      badges: [
        humanizeSuggestionType(match.suggestion_type),
        `${item.score} match score`,
      ],
      meta: [
        canTeach.length ? `You can teach: ${canTeach.join(", ")}` : "",
        sharedFields.length ? `Shared fields: ${sharedFields.join(", ")}` : "",
      ],
      to: "/skill-swap",
      actionLabel: "Open skill swap",
    };
  });
}

export function buildSkillRecommendationItems(items = []) {
  return items.map((item) => ({
    key: `skill-${item.skill?.slug || item.skill?.name || "unknown"}`,
    title: item.skill?.name || "Suggested skill",
    subtitle: "Useful next skill to improve your discovery and learning paths.",
    rationale: item.rationale,
    badges: [`${item.score} relevance score`],
    meta: [
      cleanList(item.source_signals?.peer_matches).length
        ? `Peers: ${cleanList(item.source_signals?.peer_matches).join(", ")}`
        : "",
      cleanList(item.source_signals?.opportunities).length
        ? `Opportunities: ${cleanList(item.source_signals?.opportunities).join(", ")}`
        : "",
    ],
    to: "/skill-portfolio",
    actionLabel: "Open skill portfolio",
  }));
}

export function buildCourseRecommendationItems(items = [], { excludeIds = [] } = {}) {
  return items
    .filter((item) => !excludeIds.includes(Number(item.course?.id)))
    .map((item) => ({
      key: `course-${item.course?.id || item.course?.title || "unknown"}`,
      title: item.course?.title || "Suggested course",
      subtitle:
        item.course?.organization_name ||
        item.course?.category ||
        "Relevant learning path",
      rationale: item.rationale,
      badges: [
        item.course?.category || "",
        item.course?.is_free ? "Free" : item.course?.price ? `${item.course.price_currency} ${item.course.price}` : "Paid",
      ],
      meta: [
        item.course?.difficulty ? `Level: ${item.course.difficulty}` : "",
        item.course?.organization_name ? `By ${item.course.organization_name}` : "",
      ],
      to: item.course?.id ? `/courses/${item.course.id}` : "/courses",
      actionLabel: "Open course",
    }));
}

export function buildEventRecommendationItems(items = []) {
  return items.map((item) => ({
    key: `event-${item.event?.id || item.event?.title || "unknown"}`,
    title: item.event?.title || "Suggested event",
    subtitle:
      item.event?.organization_name ||
      item.event?.category ||
      "Relevant live session",
    rationale: item.rationale,
    badges: [
      item.event?.category || "",
      item.event?.is_online ? "Online" : "In person",
    ],
    meta: [
      item.event?.starts_at
        ? `Starts ${new Date(item.event.starts_at).toLocaleDateString()}`
        : "",
      item.event?.organization_name ? `By ${item.event.organization_name}` : "",
    ],
    to: item.event?.id ? `/events/${item.event.id}` : "/events",
    actionLabel: "Open event",
  }));
}

export function buildOpportunityRecommendationItems(items = []) {
  return items.map((item) => ({
    key: `opportunity-${item.opportunity?.id || item.opportunity?.title || "unknown"}`,
    title: item.opportunity?.title || "Suggested opportunity",
    subtitle:
      item.opportunity?.company_name ||
      item.opportunity?.category ||
      "Relevant opportunity",
    rationale: item.rationale,
    badges: [
      item.opportunity?.type || "",
      item.opportunity?.status || "",
    ],
    meta: [
      item.opportunity?.required_skills?.length
        ? `Skills: ${cleanList(item.opportunity.required_skills).join(", ")}`
        : "",
      item.opportunity?.is_remote
        ? "Remote-friendly"
        : item.opportunity?.location || "",
    ],
    to: item.opportunity?.id ? `/jobs/${item.opportunity.id}` : "/jobs",
    actionLabel: "Open opportunity",
  }));
}
