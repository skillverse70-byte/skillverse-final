from django.db import models


class Role(models.TextChoices):
    GUEST = "guest", "Guest"
    REGULAR_USER = "regular_user", "Regular User"
    ORGANIZATION = "organization", "Organization"
    ADMIN = "admin", "Admin"


class OrganizationType(models.TextChoices):
    COMPANY = "company", "Company"
    NGO = "ngo", "NGO"
    INSTITUTION = "institution", "Institution"
    TRAINING_CENTER = "training_center", "Training Center"
    COMMUNITY = "community", "Community"
    OTHER = "other", "Other"


class OrganizationVerificationStatus(models.TextChoices):
    UNVERIFIED = "unverified", "Unverified"
    VERIFIED = "verified", "Verified"


class OrganizationVerificationReviewStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class ExperienceLevel(models.TextChoices):
    STUDENT = "student", "Student"
    EARLY_CAREER = "early_career", "Early Career"
    MID_CAREER = "mid_career", "Mid Career"
    EXPERIENCED = "experienced", "Experienced"


class SkillDirection(models.TextChoices):
    OFFERING = "offering", "Offering"
    REQUESTING = "requesting", "Requesting"
    BOTH = "both", "Both"


class MatchSuggestionType(models.TextChoices):
    DIRECT_SWAP = "direct_swap", "Direct Swap"
    PARTIAL_OVERLAP = "partial_overlap", "Partial Overlap"
    FIELD_RELEVANT = "field_relevant", "Field Relevant"


class SkillSwapStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    REJECTED = "rejected", "Rejected"
    CANCELLED = "cancelled", "Cancelled"
    COMPLETED = "completed", "Completed"


class LearningSessionStatus(models.TextChoices):
    PLANNED = "planned", "Planned"
    CONFIRMED = "confirmed", "Confirmed"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class CourseProgramStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    ARCHIVED = "archived", "Archived"


class CourseOfferingType(models.TextChoices):
    STANDARD = "standard", "Standard"
    COMMUNITY_SERVICE = "community_service", "Community Service"


class LessonItemType(models.TextChoices):
    VIDEO = "video", "Video"
    RESOURCE = "resource", "Resource"
    CHECKLIST = "checklist", "Checklist"
    ASSESSMENT = "assessment", "Assessment"
    QUIZ = "quiz", "Quiz"
    ASSIGNMENT = "assignment", "Assignment"
    READING = "reading", "Reading"


class EnrollmentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACTIVE = "active", "Active"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class FinancialAccountStatus(models.TextChoices):
    NOT_STARTED = "not_started", "Not Started"
    PENDING = "pending", "Pending"
    READY = "ready", "Ready"
    RESTRICTED = "restricted", "Restricted"


class PaymentTransactionStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SUCCEEDED = "succeeded", "Succeeded"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"
    REFUNDED = "refunded", "Refunded"
    REVERSED = "reversed", "Reversed"


class PaymentTransactionPurpose(models.TextChoices):
    COURSE_ENROLLMENT = "course_enrollment", "Course Enrollment"
    COMMUNITY_SERVICE_ENROLLMENT = (
        "community_service_enrollment",
        "Community Service Enrollment",
    )


class PaymentAutomationStatus(models.TextChoices):
    NONE = "none", "None"
    PENDING = "pending", "Pending"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class OpportunityType(models.TextChoices):
    JOB = "job", "Job"
    INTERNSHIP = "internship", "Internship"
    PROGRAM = "program", "Program"
    VOLUNTEER = "volunteer", "Volunteer"


class OpportunityStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    OPEN = "open", "Open"
    CLOSED = "closed", "Closed"
    FILLED = "filled", "Filled"


class JobApplicationStatus(models.TextChoices):
    APPLIED = "applied", "Applied"
    SHORTLISTED = "shortlisted", "Shortlisted"
    INTERVIEW = "interview", "Interview"
    HIRED = "hired", "Hired"
    REJECTED = "rejected", "Rejected"
    WITHDRAWN = "withdrawn", "Withdrawn"


class EventStatus(models.TextChoices):
    UPCOMING = "upcoming", "Upcoming"
    LIVE = "live", "Live"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class RSVPStatus(models.TextChoices):
    GOING = "going", "Going"
    INTERESTED = "interested", "Interested"
    CANCELLED = "cancelled", "Cancelled"


class CommunityVisibility(models.TextChoices):
    PUBLIC = "public", "Public"
    MEMBERS_ONLY = "members_only", "Members Only"


class CommunityMembershipRole(models.TextChoices):
    MEMBER = "member", "Member"
    MODERATOR = "moderator", "Moderator"


class ServiceCreditStatus(models.TextChoices):
    ISSUED = "issued", "Issued"
    REVOKED = "revoked", "Revoked"


class CertificateSourceType(models.TextChoices):
    COURSE_COMPLETION = "course_completion", "Course Completion"
    EVENT_PARTICIPATION = "event_participation", "Event Participation"
    SERVICE_CREDIT = "service_credit", "Service Credit"


class CertificateStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    REVOKED = "revoked", "Revoked"


class ReviewContext(models.TextChoices):
    SKILL_SWAP = "skill_swap", "Skill Swap"
    COURSE = "course", "Course"
    EVENT = "event", "Event"


class NotificationType(models.TextChoices):
    AUTH = "auth", "Authentication"
    VERIFICATION = "verification", "Verification"
    SWAP = "swap", "Swap"
    MESSAGE = "message", "Message"
    SESSION = "session", "Session"
    COURSE = "course", "Course"
    ENROLLMENT = "enrollment", "Enrollment"
    EVENT = "event", "Event"
    OPPORTUNITY = "opportunity", "Opportunity"
    COMMUNITY = "community", "Community"
    CERTIFICATE = "certificate", "Certificate"
    ADMIN = "admin", "Admin"


class TaxonomyDomain(models.TextChoices):
    FIELD_INTEREST = "field_interest", "Field Interest"
    SKILL = "skill", "Skill"
    COURSE_CATEGORY = "course_category", "Course Category"
    EVENT_CATEGORY = "event_category", "Event Category"
    OPPORTUNITY_CATEGORY = "opportunity_category", "Opportunity Category"


class TaxonomySuggestionStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class AIFeatureKey(models.TextChoices):
    RECOMMENDATIONS = "recommendations", "Recommendations"
    LEARNING_GUIDANCE = "learning_guidance", "Learning Guidance"
    ASSIGNMENT_FEEDBACK = "assignment_feedback", "Assignment Feedback"
    COGNITIVE_MONITORING = "cognitive_monitoring", "Cognitive Monitoring"


class AIRolloutState(models.TextChoices):
    DISABLED = "disabled", "Disabled"
    FALLBACK_ONLY = "fallback_only", "Fallback Only"
    READY = "ready", "Ready"


class CognitiveMonitoringConsentStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    REVOKED = "revoked", "Revoked"


class CognitiveMonitoringSignalKey(models.TextChoices):
    LESSON_PROGRESS = "lesson_progress", "Lesson Progress"
    ENROLLMENT_ACTIVITY = "enrollment_activity", "Enrollment Activity"
    ASSIGNMENT_ACTIVITY = "assignment_activity", "Assignment Activity"
    SESSION_ENGAGEMENT = "session_engagement", "Session Engagement"
    MESSAGE_RESPONSIVENESS = "message_responsiveness", "Message Responsiveness"
    SELF_REPORTED_MOOD = "self_reported_mood", "Self Reported Mood"
    REFLECTION_CHECKINS = "reflection_checkins", "Reflection Check-ins"


class AdaptiveCheckInMood(models.TextChoices):
    ENERGIZED = "energized", "Energized"
    STEADY = "steady", "Steady"
    TIRED = "tired", "Tired"
    DISTRACTED = "distracted", "Distracted"
    STUCK = "stuck", "Stuck"
    OVERWHELMED = "overwhelmed", "Overwhelmed"


class AdaptiveFocusDriftLevel(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    INACTIVE = "inactive", "Inactive"
