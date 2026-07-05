from django.test import SimpleTestCase

from apps.common.contracts import CORE_DOMAIN_STATUS_FIELDS, DOMAIN_ENTITIES
from apps.common.enums import (
    CourseProgramStatus,
    EnrollmentStatus,
    EventStatus,
    FinancialAccountStatus,
    JobApplicationStatus,
    LearningSessionStatus,
    NotificationType,
    OpportunityStatus,
    OrganizationVerificationStatus,
    ReviewContext,
    Role,
    SkillDirection,
    SkillSwapStatus,
)
from apps.common.trust import get_paid_course_enrollment_gate


class DomainContractTests(SimpleTestCase):
    def test_expected_core_entities_are_declared(self):
        self.assertIn("User", DOMAIN_ENTITIES)
        self.assertIn("Organization", DOMAIN_ENTITIES)
        self.assertIn("SkillSwapRequest", DOMAIN_ENTITIES)
        self.assertIn("CourseProgram", DOMAIN_ENTITIES)
        self.assertIn("Notification", DOMAIN_ENTITIES)

    def test_status_field_index_covers_major_workflows(self):
        self.assertIn("Organization.verification_status", CORE_DOMAIN_STATUS_FIELDS)
        self.assertIn("SkillSwapRequest.status", CORE_DOMAIN_STATUS_FIELDS)
        self.assertIn("Enrollment.status", CORE_DOMAIN_STATUS_FIELDS)
        self.assertIn("JobApplication.status", CORE_DOMAIN_STATUS_FIELDS)

    def test_role_enum_contains_primary_actor_values(self):
        self.assertEqual(Role.GUEST, "guest")
        self.assertEqual(Role.REGULAR_USER, "regular_user")
        self.assertEqual(Role.ORGANIZATION, "organization")
        self.assertEqual(Role.ADMIN, "admin")

    def test_verification_and_swap_statuses_match_prd_language(self):
        self.assertEqual(
            set(OrganizationVerificationStatus.values),
            {"unverified", "verified"},
        )
        self.assertEqual(
            set(SkillSwapStatus.values),
            {"pending", "accepted", "rejected", "cancelled", "completed"},
        )

    def test_major_lifecycle_enums_cover_required_states(self):
        self.assertIn("planned", LearningSessionStatus.values)
        self.assertIn("published", CourseProgramStatus.values)
        self.assertIn("active", EnrollmentStatus.values)
        self.assertIn("ready", FinancialAccountStatus.values)
        self.assertIn("open", OpportunityStatus.values)
        self.assertIn("applied", JobApplicationStatus.values)
        self.assertIn("upcoming", EventStatus.values)

    def test_supporting_contract_enums_are_present(self):
        self.assertEqual(set(SkillDirection.values), {"offering", "requesting", "both"})
        self.assertEqual(set(ReviewContext.values), {"skill_swap", "course", "event"})
        self.assertIn("message", NotificationType.values)

    def test_trust_gating_uses_enrollment_unavailable_language(self):
        gate = get_paid_course_enrollment_gate(
            organization=type("Org", (), {"verification_status": "unverified", "is_verified": False})(),
            financial_account=None,
        )
        self.assertEqual(gate["label"], "Enrollment Unavailable")
