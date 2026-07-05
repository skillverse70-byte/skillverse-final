from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.common.trust import (
    can_organization_create_paid_course,
    get_paid_course_enrollment_gate,
    is_financial_account_ready,
    is_verified_organization,
    normalize_verification_status,
)


class TrustRuleTests(SimpleTestCase):
    def test_normalize_verification_status_handles_legacy_values(self):
        self.assertEqual(normalize_verification_status("pending"), "unverified")
        self.assertEqual(normalize_verification_status("rejected"), "unverified")
        self.assertEqual(normalize_verification_status("verified"), "verified")

    def test_is_verified_organization_accepts_status_or_legacy_flag(self):
        verified = SimpleNamespace(verification_status="verified", is_verified=False)
        legacy_verified = SimpleNamespace(verification_status="pending", is_verified=True)
        unverified = SimpleNamespace(verification_status="unverified", is_verified=False)

        self.assertTrue(is_verified_organization(verified))
        self.assertTrue(is_verified_organization(legacy_verified))
        self.assertFalse(is_verified_organization(unverified))

    def test_financial_account_ready_requires_ready_status(self):
        ready = SimpleNamespace(status="ready")
        pending = SimpleNamespace(status="pending")

        self.assertTrue(is_financial_account_ready(ready))
        self.assertFalse(is_financial_account_ready(pending))

    def test_paid_course_creation_requires_verified_organization(self):
        verified = SimpleNamespace(verification_status="verified", is_verified=False)
        unverified = SimpleNamespace(verification_status="unverified", is_verified=False)

        self.assertTrue(can_organization_create_paid_course(verified))
        self.assertFalse(can_organization_create_paid_course(unverified))
        self.assertFalse(
            can_organization_create_paid_course(
                verified,
                has_required_verification_evidence=False,
            )
        )

    def test_paid_course_enrollment_gate_matches_prd_rules(self):
        verified = SimpleNamespace(verification_status="verified", is_verified=False)
        unverified = SimpleNamespace(verification_status="unverified", is_verified=False)
        ready_account = SimpleNamespace(status="ready")
        pending_account = SimpleNamespace(status="pending")

        self.assertEqual(
            get_paid_course_enrollment_gate(unverified)["reason"],
            "organization_unverified",
        )
        self.assertEqual(
            get_paid_course_enrollment_gate(verified, pending_account)["reason"],
            "financial_setup_incomplete",
        )
        self.assertTrue(
            get_paid_course_enrollment_gate(verified, ready_account)["can_enroll"]
        )
