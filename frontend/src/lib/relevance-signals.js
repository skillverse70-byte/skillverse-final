function normalizeStringList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set();
  return values
    .map((value) => String(value || "").trim())
    .filter((value) => {
      if (!value) {
        return false;
      }
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function normalizeIntList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set();
  return values
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value))
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
}

export function normalizeRelevanceSignals(signals = {}, fallbacks = {}) {
  return {
    fields: normalizeStringList(signals.fields ?? fallbacks.fields ?? []),
    skills: normalizeStringList(signals.skills ?? fallbacks.skills ?? []),
    courses: normalizeIntList(signals.courses ?? fallbacks.courses ?? []),
    participation: {
      signals: normalizeStringList(
        signals.participation?.signals ?? fallbacks.participationSignals ?? [],
      ),
      rsvp_open:
        typeof signals.participation?.rsvp_open === "boolean"
          ? signals.participation.rsvp_open
          : null,
      current_attendees: Number.isFinite(Number(signals.participation?.current_attendees))
        ? Number(signals.participation.current_attendees)
        : 0,
      application_count: Number.isFinite(Number(signals.participation?.application_count))
        ? Number(signals.participation.application_count)
        : 0,
    },
    organization_verification_status:
      signals.organization_verification_status ||
      fallbacks.organizationVerificationStatus ||
      "unverified",
  };
}
