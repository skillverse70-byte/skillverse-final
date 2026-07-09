export const roles = Object.freeze({
  guest: "guest",
  regularUser: "regular_user",
  organization: "organization",
  admin: "admin",
});

export const organizationTypes = Object.freeze({
  company: "company",
  ngo: "ngo",
  institution: "institution",
  trainingCenter: "training_center",
  community: "community",
  other: "other",
});

export const organizationVerificationStatuses = Object.freeze({
  unverified: "unverified",
  verified: "verified",
});

export const skillDirections = Object.freeze({
  offering: "offering",
  requesting: "requesting",
  both: "both",
});

export const skillSwapStatuses = Object.freeze({
  pending: "pending",
  accepted: "accepted",
  rejected: "rejected",
  cancelled: "cancelled",
  completed: "completed",
});

export const learningSessionStatuses = Object.freeze({
  planned: "planned",
  confirmed: "confirmed",
  completed: "completed",
  cancelled: "cancelled",
});

export const courseProgramStatuses = Object.freeze({
  draft: "draft",
  published: "published",
  archived: "archived",
});

export const lessonItemTypes = Object.freeze({
  video: "video",
  resource: "resource",
  checklist: "checklist",
  assessment: "assessment",
  quiz: "quiz",
  assignment: "assignment",
  reading: "reading",
});

export const enrollmentStatuses = Object.freeze({
  pending: "pending",
  active: "active",
  completed: "completed",
  cancelled: "cancelled",
});

export const financialAccountStatuses = Object.freeze({
  notStarted: "not_started",
  pending: "pending",
  ready: "ready",
  restricted: "restricted",
});

export const paymentTransactionStatuses = Object.freeze({
  pending: "pending",
  succeeded: "succeeded",
  failed: "failed",
  cancelled: "cancelled",
  refunded: "refunded",
  reversed: "reversed",
});

export const paymentTransactionPurposes = Object.freeze({
  courseEnrollment: "course_enrollment",
  communityServiceEnrollment: "community_service_enrollment",
});

export const paymentAutomationStatuses = Object.freeze({
  none: "none",
  pending: "pending",
  completed: "completed",
  failed: "failed",
});

export const courseOfferingTypes = Object.freeze({
  standard: "standard",
  communityService: "community_service",
});

export const opportunityTypes = Object.freeze({
  job: "job",
  internship: "internship",
  program: "program",
  volunteer: "volunteer",
});

export const opportunityStatuses = Object.freeze({
  draft: "draft",
  open: "open",
  closed: "closed",
  filled: "filled",
});

export const jobApplicationStatuses = Object.freeze({
  applied: "applied",
  shortlisted: "shortlisted",
  interview: "interview",
  hired: "hired",
  rejected: "rejected",
  withdrawn: "withdrawn",
});

export const eventStatuses = Object.freeze({
  upcoming: "upcoming",
  live: "live",
  completed: "completed",
  cancelled: "cancelled",
});

export const rsvpStatuses = Object.freeze({
  going: "going",
  interested: "interested",
  cancelled: "cancelled",
});

export const communityVisibilities = Object.freeze({
  public: "public",
  membersOnly: "members_only",
});

export const communityMembershipRoles = Object.freeze({
  member: "member",
  moderator: "moderator",
});

export const serviceCreditStatuses = Object.freeze({
  issued: "issued",
  revoked: "revoked",
});

export const certificateSourceTypes = Object.freeze({
  courseCompletion: "course_completion",
  eventParticipation: "event_participation",
  serviceCredit: "service_credit",
});

export const certificateStatuses = Object.freeze({
  active: "active",
  revoked: "revoked",
});

export const reviewContexts = Object.freeze({
  skillSwap: "skill_swap",
  course: "course",
  event: "event",
});

export const notificationTypes = Object.freeze({
  auth: "auth",
  verification: "verification",
  swap: "swap",
  message: "message",
  session: "session",
  course: "course",
  enrollment: "enrollment",
  event: "event",
  opportunity: "opportunity",
  community: "community",
  certificate: "certificate",
  admin: "admin",
});

export const taxonomyDomains = Object.freeze({
  fieldInterest: "field_interest",
  skill: "skill",
  courseCategory: "course_category",
  eventCategory: "event_category",
  opportunityCategory: "opportunity_category",
});

export const taxonomySuggestionStatuses = Object.freeze({
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
});

export const aiFeatureKeys = Object.freeze({
  recommendations: "recommendations",
  learningGuidance: "learning_guidance",
  assignmentFeedback: "assignment_feedback",
  cognitiveMonitoring: "cognitive_monitoring",
});

export const aiRolloutStates = Object.freeze({
  disabled: "disabled",
  fallbackOnly: "fallback_only",
  ready: "ready",
});
