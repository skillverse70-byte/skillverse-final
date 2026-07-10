from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AccountActionToken, RegularUserProfile
from apps.ai.models import AdaptiveMonitoringCheckIn, CognitiveMonitoringConsentRecord
from apps.audit.models import AuditLog
from apps.certificates.models import Certificate, ServiceCreditRecord
from apps.common.enums import (
    AdaptiveCheckInMood,
    AIFeatureKey,
    CertificateSourceType,
    CertificateStatus,
    CommunityMembershipRole,
    CommunityVisibility,
    CognitiveMonitoringConsentStatus,
    CourseInstructorInvitationStatus,
    CourseOfferingType,
    CourseProgramStatus,
    EnrollmentStatus,
    EventStatus,
    ExperienceLevel,
    FinancialAccountStatus,
    JobApplicationStatus,
    LearningSessionStatus,
    LessonItemType,
    MatchSuggestionType,
    NotificationType,
    OpportunityStatus,
    OpportunityType,
    OrganizationType,
    OrganizationVerificationReviewStatus,
    OrganizationVerificationStatus,
    PaymentAutomationStatus,
    PaymentTransactionPurpose,
    PaymentTransactionStatus,
    ReviewContext,
    Role,
    RSVPStatus,
    ServiceCreditStatus,
    SkillDirection,
    SkillSwapStatus,
    TaxonomyDomain,
    TaxonomySuggestionStatus,
)
from apps.communities.models import CommunityGroup, CommunityMembership, CommunityPost
from apps.courses.models import (
    CourseInstructorInvitation,
    CourseModule,
    CourseProgram,
    Enrollment,
    EnrollmentLessonProgress,
    LessonItem,
)
from apps.events.models import Event, EventRSVP
from apps.messaging.models import MessageThread, MessageThreadReadState, ThreadMessage
from apps.notifications.models import Notification
from apps.opportunities.models import JobApplication, Opportunity
from apps.organizations.models import Organization, OrganizationVerificationRequest
from apps.payments.models import FinancialAccount, PaymentTransaction, PaymentWebhookEvent
from apps.reviews.models import RatingReview
from apps.sessions.models import LearningSession
from apps.skills.models import FieldInterest, Skill, UserFieldInterest, UserSkill
from apps.swaps.models import MatchSuggestion, SkillSwapRequest, SkillSwapStatusHistory
from apps.taxonomy.models import CategorySuggestion, ManagedCategory

User = get_user_model()


class Command(BaseCommand):
    help = "Seed a comprehensive V1 test dataset covering current models and status scenarios."

    def handle(self, *args, **options):
        seeder = V1RecordSeeder(stdout=self.stdout)
        with transaction.atomic():
            seeder.run()
        self.stdout.write(self.style.SUCCESS("V1 test records seeded successfully."))
        self.stdout.write(
            self.style.WARNING(
                f"Primary seeded password for the documented test users: {seeder.default_password}"
            )
        )


class V1RecordSeeder:
    default_password = "StrongPass123!"

    def __init__(self, stdout):
        self.stdout = stdout
        self.now = timezone.now()

    def run(self):
        self.seed_users()
        self.seed_profiles_and_tokens()
        self.seed_taxonomy_and_skill_graph()
        self.seed_organizations_and_trust()
        self.seed_courses_and_invitations()
        self.seed_swaps()
        self.seed_messaging()
        self.seed_sessions()
        self.seed_events_and_rsvps()
        self.seed_opportunities_and_applications()
        self.seed_enrollments_and_progress()
        self.seed_communities()
        self.seed_service_credit_and_certificates()
        self.seed_payments()
        self.seed_reviews()
        self.seed_notifications()
        self.seed_ai_records()
        self.seed_audit_logs()

    def upsert(self, model, lookup, defaults=None):
        defaults = defaults or {}
        obj = model.objects.filter(**lookup).first()
        if obj is None:
            return model.objects.create(**lookup, **defaults)
        for field, value in defaults.items():
            setattr(obj, field, value)
        obj.save()
        return obj

    def user_record(self, email, *, full_name, role, verified=True, is_staff=False, is_superuser=False):
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            user = User.objects.create(
                email=email.lower(),
                full_name=full_name,
                role=role,
                is_staff=is_staff,
                is_superuser=is_superuser,
                email_verified_at=self.now if verified else None,
            )
        else:
            user.full_name = full_name
            user.role = role
            user.is_staff = is_staff
            user.is_superuser = is_superuser
            user.email_verified_at = self.now if verified else None
            user.save()
        user.set_password(self.default_password)
        user.save(update_fields=["password"])
        return user

    def seed_users(self):
        self.regular_user = self.user_record(
            "hawibekele4913@gmail.com",
            full_name="Hawi Bekele",
            role=Role.REGULAR_USER,
            verified=True,
        )
        self.organization_owner = self.user_record(
            "amanuel7245@gmail.com",
            full_name="Amanuel SkillVerse Org",
            role=Role.ORGANIZATION,
            verified=True,
        )
        self.admin_user = self.user_record(
            "skillverse07@gmail.com",
            full_name="SkillVerse Admin",
            role=Role.ADMIN,
            verified=True,
            is_staff=True,
            is_superuser=True,
        )
        self.peer_user = self.user_record(
            "seed.peer.regular@example.com",
            full_name="V1 Peer Regular",
            role=Role.REGULAR_USER,
            verified=True,
        )
        self.reviewer_user = self.user_record(
            "seed.reviewer.regular@example.com",
            full_name="V1 Reviewer Regular",
            role=Role.REGULAR_USER,
            verified=True,
        )
        self.candidate_user = self.user_record(
            "seed.candidate.regular@example.com",
            full_name="V1 Candidate Regular",
            role=Role.REGULAR_USER,
            verified=True,
        )
        self.withdrawn_user = self.user_record(
            "seed.withdrawn.regular@example.com",
            full_name="V1 Withdrawn Regular",
            role=Role.REGULAR_USER,
            verified=True,
        )
        self.rejected_user = self.user_record(
            "seed.rejected.regular@example.com",
            full_name="V1 Rejected Regular",
            role=Role.REGULAR_USER,
            verified=True,
        )
        self.unverified_regular_user = self.user_record(
            "seed.unverified.regular@example.com",
            full_name="V1 Unverified Regular",
            role=Role.REGULAR_USER,
            verified=False,
        )
        self.pending_org_owner = self.user_record(
            "seed.org.pending@example.com",
            full_name="V1 Pending Org Owner",
            role=Role.ORGANIZATION,
            verified=True,
        )
        self.restricted_org_owner = self.user_record(
            "seed.org.restricted@example.com",
            full_name="V1 Restricted Org Owner",
            role=Role.ORGANIZATION,
            verified=True,
        )
        self.not_started_org_owner = self.user_record(
            "seed.org.notstarted@example.com",
            full_name="V1 Not Started Org Owner",
            role=Role.ORGANIZATION,
            verified=True,
        )

    def seed_profiles_and_tokens(self):
        profile_payloads = {
            self.regular_user: ("Primary testing learner and instructor invite target.", "product, data, learning", ExperienceLevel.MID_CAREER),
            self.peer_user: ("Peer learner used across swaps and reviews.", "design, mentorship", ExperienceLevel.EARLY_CAREER),
            self.reviewer_user: ("Reviewer scenario user for course, swap, and event test flows.", "community, research", ExperienceLevel.EXPERIENCED),
            self.candidate_user: ("Candidate scenario user for jobs and completed swap records.", "engineering, teaching", ExperienceLevel.EARLY_CAREER),
            self.withdrawn_user: ("Withdrawn application scenario user.", "copywriting, support", ExperienceLevel.STUDENT),
            self.rejected_user: ("Rejected application and reverse-payment scenario user.", "frontend, events", ExperienceLevel.EARLY_CAREER),
            self.unverified_regular_user: ("Unverified auth-flow scenario user.", "auth testing", ExperienceLevel.STUDENT),
        }
        for user, payload in profile_payloads.items():
            RegularUserProfile.objects.update_or_create(
                user=user,
                defaults={
                    "bio": payload[0],
                    "interests_summary": payload[1],
                    "experience_level": payload[2],
                },
            )

        self.upsert(
            AccountActionToken,
            {"token": "V1VERIFY01"},
            {
                "user": self.unverified_regular_user,
                "purpose": AccountActionToken.Purpose.EMAIL_VERIFICATION,
                "expires_at": self.now + timedelta(minutes=15),
                "used_at": None,
            },
        )
        self.upsert(
            AccountActionToken,
            {"token": "V1VERIFYUSED"},
            {
                "user": self.regular_user,
                "purpose": AccountActionToken.Purpose.EMAIL_VERIFICATION,
                "expires_at": self.now + timedelta(minutes=15),
                "used_at": self.now - timedelta(days=2),
            },
        )
        self.upsert(
            AccountActionToken,
            {"token": "v1-password-reset-active"},
            {
                "user": self.regular_user,
                "purpose": AccountActionToken.Purpose.PASSWORD_RESET,
                "expires_at": self.now + timedelta(hours=1),
                "used_at": None,
            },
        )
        self.upsert(
            AccountActionToken,
            {"token": "v1-password-reset-expired"},
            {
                "user": self.peer_user,
                "purpose": AccountActionToken.Purpose.PASSWORD_RESET,
                "expires_at": self.now - timedelta(hours=1),
                "used_at": None,
            },
        )

    def seed_taxonomy_and_skill_graph(self):
        self.product_field = self.upsert(
            FieldInterest,
            {"slug": "craft-and-handmade"},
            {"name": "Crafts and Handmade Work", "is_active": True},
        )
        self.community_field = self.upsert(
            FieldInterest,
            {"slug": "community-and-volunteering"},
            {"name": "Community and Volunteering", "is_active": True},
        )
        self.data_field = self.upsert(
            FieldInterest,
            {"slug": "information-technology"},
            {"name": "Information Technology", "is_active": True},
        )
        self.music_field = self.upsert(
            FieldInterest,
            {"slug": "music-and-arts"},
            {"name": "Music and Arts", "is_active": True},
        )

        self.python_skill = self.upsert(
            Skill,
            {"slug": "python-programming"},
            {
                "name": "Python Programming",
                "description": "Builds scripts, automation, and backend services.",
                "is_active": True,
            },
        )
        self.react_skill = self.upsert(
            Skill,
            {"slug": "react-ui-development"},
            {
                "name": "React UI Development",
                "description": "Builds interactive frontend interfaces and dashboards.",
                "is_active": True,
            },
        )
        self.facilitation_skill = self.upsert(
            Skill,
            {"slug": "community-facilitation"},
            {
                "name": "Community Facilitation",
                "description": "Leads group sessions, workshops, and peer learning circles.",
                "is_active": True,
            },
        )
        self.research_skill = self.upsert(
            Skill,
            {"slug": "research-and-analysis"},
            {
                "name": "Research and Analysis",
                "description": "Collects information, compares options, and summarizes findings.",
                "is_active": True,
            },
        )
        self.django_skill = self.upsert(
            Skill,
            {"slug": "django-web-development"},
            {
                "name": "Django Web Development",
                "description": "Builds web applications and APIs with Django.",
                "is_active": True,
            },
        )
        self.handicraft_skill = self.upsert(
            Skill,
            {"slug": "handicraft"},
            {
                "name": "Handicraft",
                "description": "Creates handcrafted items such as woven goods, bags, and decor.",
                "is_active": True,
            },
        )
        self.it_support_skill = self.upsert(
            Skill,
            {"slug": "it-support"},
            {
                "name": "IT Support",
                "description": "Supports devices, accounts, and everyday technical troubleshooting.",
                "is_active": True,
            },
        )
        self.guitar_skill = self.upsert(
            Skill,
            {"slug": "guitar"},
            {
                "name": "Guitar",
                "description": "Plays guitar for practice, teaching, and community sessions.",
                "is_active": True,
            },
        )
        self.customer_service_skill = self.upsert(
            Skill,
            {"slug": "customer-service"},
            {
                "name": "Customer Service",
                "description": "Handles learners, customers, and support conversations professionally.",
                "is_active": True,
            },
        )
        self.tailoring_skill = self.upsert(
            Skill,
            {"slug": "tailoring"},
            {
                "name": "Tailoring",
                "description": "Designs and repairs garments with practical sewing skills.",
                "is_active": True,
            },
        )

        field_links = [
            (self.regular_user, self.data_field),
            (self.regular_user, self.music_field),
            (self.peer_user, self.product_field),
            (self.reviewer_user, self.community_field),
            (self.candidate_user, self.data_field),
            (self.withdrawn_user, self.product_field),
        ]
        for user, field in field_links:
            UserFieldInterest.objects.update_or_create(user=user, field_interest=field)

        skill_links = [
            (self.regular_user, self.it_support_skill, SkillDirection.OFFERING, "Can help with device setup and troubleshooting."),
            (self.regular_user, self.guitar_skill, SkillDirection.REQUESTING, "Wants to improve guitar basics."),
            (self.regular_user, self.handicraft_skill, SkillDirection.BOTH, "Can teach and learn small craft work."),
            (self.peer_user, self.handicraft_skill, SkillDirection.OFFERING, "Weaves baskets and makes handmade decor."),
            (self.peer_user, self.python_skill, SkillDirection.REQUESTING, "Wants backend and automation support."),
            (self.reviewer_user, self.facilitation_skill, SkillDirection.BOTH, "Leads community workshops and peer circles."),
            (self.candidate_user, self.django_skill, SkillDirection.OFFERING, "Builds Django systems and APIs."),
            (self.candidate_user, self.customer_service_skill, SkillDirection.REQUESTING, "Wants client communication practice."),
            (self.withdrawn_user, self.tailoring_skill, SkillDirection.BOTH, "Supports tailoring and sewing workshops."),
            (self.rejected_user, self.react_skill, SkillDirection.OFFERING, "Builds frontend interfaces."),
            (self.unverified_regular_user, self.it_support_skill, SkillDirection.REQUESTING, "Wants beginner IT help."),
        ]
        for user, skill, direction, note in skill_links:
            UserSkill.objects.update_or_create(
                user=user,
                skill=skill,
                defaults={"direction": direction, "experience_note": note},
            )

        managed_categories = [
            (TaxonomyDomain.FIELD_INTEREST, "Craft and Work Fields", "craft-and-work-fields"),
            (TaxonomyDomain.SKILL, "Practical Skill Paths", "practical-skill-paths"),
            (TaxonomyDomain.COURSE_CATEGORY, "Learning Tracks", "learning-tracks"),
            (TaxonomyDomain.EVENT_CATEGORY, "Workshops and Meetups", "workshops-and-meetups"),
            (TaxonomyDomain.OPPORTUNITY_CATEGORY, "Jobs and Programs", "jobs-and-programs"),
        ]
        for domain, name, slug in managed_categories:
            self.upsert(
                ManagedCategory,
                {"domain": domain, "slug": slug},
                {
                    "name": name,
                    "description": f"Platform-managed category for {domain.replace('_', ' ')}.",
                    "is_active": True,
                    "approved_by": self.admin_user,
                    "approved_at": self.now - timedelta(days=10),
                },
            )

    def seed_organizations_and_trust(self):
        self.main_org = Organization.objects.update_or_create(
            owner=self.organization_owner,
            defaults={
                "name": "Amanuel Skills Hub",
                "type": OrganizationType.COMPANY,
                "description": "Verified learning and services organization for platform testing.",
                "contact_email": self.organization_owner.email,
                "country": "Ethiopia",
                "location": "Addis Ababa",
                "website_url": "https://amanuel-skills-hub.example.com",
                "contact_phone": "+251900000001",
                "offerings_summary": "Practical courses, events, job openings, and community initiatives.",
                "verification_status": OrganizationVerificationStatus.VERIFIED,
                "is_suspended": False,
                "suspension_reason": "",
                "moderated_by": self.admin_user,
                "moderated_at": self.now - timedelta(days=20),
            },
        )[0]
        self.pending_org = Organization.objects.update_or_create(
            owner=self.pending_org_owner,
            defaults={
                "name": "Blue Oak Learning Cooperative",
                "type": OrganizationType.INSTITUTION,
                "description": "Learning cooperative waiting on verification review.",
                "contact_email": self.pending_org_owner.email,
                "country": "Ethiopia",
                "location": "Hawassa",
                "website_url": "https://blue-oak-learning.example.com",
                "contact_phone": "+251900000002",
                "offerings_summary": "Workshops, training sessions, and community classes.",
                "verification_status": OrganizationVerificationStatus.UNVERIFIED,
                "is_suspended": False,
                "suspension_reason": "",
                "moderated_by": None,
                "moderated_at": None,
            },
        )[0]
        self.restricted_org = Organization.objects.update_or_create(
            owner=self.restricted_org_owner,
            defaults={
                "name": "North Star Community Collective",
                "type": OrganizationType.NGO,
                "description": "Moderated organization used for governance scenarios.",
                "contact_email": self.restricted_org_owner.email,
                "country": "Kenya",
                "location": "Nairobi",
                "website_url": "https://north-star-collective.example.com",
                "contact_phone": "+254700000003",
                "offerings_summary": "Archived content and moderation scenarios.",
                "verification_status": OrganizationVerificationStatus.VERIFIED,
                "is_suspended": True,
                "suspension_reason": "V1 moderation restriction scenario.",
                "moderated_by": self.admin_user,
                "moderated_at": self.now - timedelta(days=7),
            },
        )[0]
        self.not_started_org = Organization.objects.update_or_create(
            owner=self.not_started_org_owner,
            defaults={
                "name": "Lighthouse Training Center",
                "type": OrganizationType.TRAINING_CENTER,
                "description": "Verified organization with finance setup not started.",
                "contact_email": self.not_started_org_owner.email,
                "country": "Ethiopia",
                "location": "Adama",
                "website_url": "https://lighthouse-training.example.com",
                "contact_phone": "+251900000004",
                "offerings_summary": "Ready for finance setup and paid enrollment testing.",
                "verification_status": OrganizationVerificationStatus.VERIFIED,
                "is_suspended": False,
                "suspension_reason": "",
                "moderated_by": None,
                "moderated_at": None,
            },
        )[0]

        self.upsert(
            OrganizationVerificationRequest,
            {"organization": self.main_org, "request_notes": "V1 approved verification path"},
            {
                "requested_by": self.organization_owner,
                "status": OrganizationVerificationReviewStatus.APPROVED,
                "reviewer_notes": "Approved in seeded V1 scenario.",
                "used_admin_override": False,
                "reviewed_by": self.admin_user,
                "submitted_at": self.now - timedelta(days=30),
                "reviewed_at": self.now - timedelta(days=28),
            },
        )
        self.upsert(
            OrganizationVerificationRequest,
            {"organization": self.pending_org, "request_notes": "V1 pending verification path"},
            {
                "requested_by": self.pending_org_owner,
                "status": OrganizationVerificationReviewStatus.PENDING,
                "reviewer_notes": "",
                "used_admin_override": False,
                "reviewed_by": None,
                "submitted_at": self.now - timedelta(days=2),
                "reviewed_at": None,
            },
        )
        self.upsert(
            OrganizationVerificationRequest,
            {"organization": self.restricted_org, "request_notes": "V1 rejected verification path"},
            {
                "requested_by": self.restricted_org_owner,
                "status": OrganizationVerificationReviewStatus.REJECTED,
                "reviewer_notes": "Rejected for seeded moderation scenario.",
                "used_admin_override": True,
                "reviewed_by": self.admin_user,
                "submitted_at": self.now - timedelta(days=12),
                "reviewed_at": self.now - timedelta(days=10),
            },
        )

        self.upsert(
            FinancialAccount,
            {"organization": self.main_org},
            {
                "provider": "chapa",
                "status": FinancialAccountStatus.READY,
                "business_name": "Amanuel Skills Hub PLC",
                "account_holder_name": "Amanuel Skills Hub",
                "bank_name": "Seed Bank",
                "bank_code": "001",
                "account_number_last4": "1234",
                "mobile_money_number": "+251900000001",
                "setup_notes": "Ready for paid-course tests.",
                "provider_account_reference": "v1-chapa-ready-account",
                "restricted_reason": "",
                "review_notes": "Approved for V1 test coverage.",
                "reviewed_by": self.admin_user,
                "reviewed_at": self.now - timedelta(days=18),
                "submitted_at": self.now - timedelta(days=19),
                "verified_at": self.now - timedelta(days=18),
            },
        )
        self.upsert(
            FinancialAccount,
            {"organization": self.pending_org},
            {
                "provider": "chapa",
                "status": FinancialAccountStatus.PENDING,
                "business_name": "Blue Oak Learning Cooperative",
                "account_holder_name": "Blue Oak Learning Cooperative",
                "bank_name": "Pending Bank",
                "bank_code": "002",
                "account_number_last4": "2345",
                "mobile_money_number": "+251900000002",
                "setup_notes": "Pending finance review scenario.",
                "provider_account_reference": "v1-chapa-pending-account",
                "reviewed_by": None,
                "reviewed_at": None,
                "submitted_at": self.now - timedelta(days=1),
                "verified_at": None,
            },
        )
        self.upsert(
            FinancialAccount,
            {"organization": self.restricted_org},
            {
                "provider": "chapa",
                "status": FinancialAccountStatus.RESTRICTED,
                "business_name": "North Star Community Collective",
                "account_holder_name": "North Star Community Collective",
                "bank_name": "Restricted Bank",
                "bank_code": "003",
                "account_number_last4": "3456",
                "mobile_money_number": "+254700000003",
                "setup_notes": "Restricted payout scenario.",
                "provider_account_reference": "v1-chapa-restricted-account",
                "restricted_reason": "Compliance hold in seeded test data.",
                "review_notes": "Restricted by admin for scenario coverage.",
                "reviewed_by": self.admin_user,
                "reviewed_at": self.now - timedelta(days=6),
                "submitted_at": self.now - timedelta(days=8),
                "verified_at": None,
            },
        )
        self.upsert(
            FinancialAccount,
            {"organization": self.not_started_org},
            {
                "provider": "chapa",
                "status": FinancialAccountStatus.NOT_STARTED,
                "business_name": "Lighthouse Training Center",
                "account_holder_name": "",
                "bank_name": "",
                "bank_code": "",
                "account_number_last4": "",
                "mobile_money_number": "",
                "setup_notes": "No payout setup started yet.",
                "provider_account_reference": "",
                "reviewed_by": None,
                "reviewed_at": None,
                "submitted_at": None,
                "verified_at": None,
            },
        )

        self.upsert(
            CategorySuggestion,
            {
                "domain": TaxonomyDomain.SKILL,
                "suggested_by": self.regular_user,
                "name": "Handmade Workshop Support",
            },
            {
                "description": "Pending taxonomy suggestion for a practical workshop-support skill.",
                "status": TaxonomySuggestionStatus.PENDING,
                "organization": None,
                "reviewer_notes": "",
                "reviewed_by": None,
                "reviewed_at": None,
                "resolved_entry_name": "",
                "resolved_entry_slug": "",
            },
        )
        self.upsert(
            CategorySuggestion,
            {
                "domain": TaxonomyDomain.COURSE_CATEGORY,
                "suggested_by": self.organization_owner,
                "name": "Community Learning Track",
            },
            {
                "description": "Approved taxonomy suggestion for a community learning track.",
                "status": TaxonomySuggestionStatus.APPROVED,
                "organization": self.main_org,
                "reviewer_notes": "Approved in seeded data.",
                "reviewed_by": self.admin_user,
                "reviewed_at": self.now - timedelta(days=5),
                "resolved_entry_name": "Community Learning Track",
                "resolved_entry_slug": "community-learning-track",
            },
        )
        self.upsert(
            CategorySuggestion,
            {
                "domain": TaxonomyDomain.EVENT_CATEGORY,
                "suggested_by": self.peer_user,
                "name": "Local Skills Meetup",
            },
            {
                "description": "Rejected taxonomy suggestion for a local skills meetup.",
                "status": TaxonomySuggestionStatus.REJECTED,
                "organization": self.main_org,
                "reviewer_notes": "Rejected in seeded data.",
                "reviewed_by": self.admin_user,
                "reviewed_at": self.now - timedelta(days=4),
                "resolved_entry_name": "",
                "resolved_entry_slug": "",
            },
        )

    def seed_courses_and_invitations(self):
        self.free_course = self.upsert(
            CourseProgram,
            {"organization": self.main_org, "title": "Practical IT Support Foundations"},
            {
                "description": "A beginner-friendly track for practical IT support, service desk habits, and device troubleshooting.",
                "category": "Learning Tracks",
                "difficulty": "beginner",
                "instructor_name": "Amanuel Learning Team",
                "tags": ["it-support", "beginner", "free"],
                "offering_type": CourseOfferingType.STANDARD,
                "is_free": True,
                "price_amount": Decimal("0.00"),
                "price_currency": "ETB",
                "service_credit_hours": Decimal("0.00"),
                "auto_issue_service_credit": False,
                "service_credit_title": "",
                "service_credit_description": "",
                "enrollment_open": True,
                "admin_review_notes": "Reviewed published free course.",
                "admin_reviewed_by": self.admin_user,
                "admin_reviewed_at": self.now - timedelta(days=20),
                "status": CourseProgramStatus.PUBLISHED,
            },
        )
        self.paid_course = self.upsert(
            CourseProgram,
            {"organization": self.main_org, "title": "Creative Web Design Bootcamp"},
            {
                "description": "A hands-on paid course for web design, small-business websites, and frontend delivery.",
                "category": "Learning Tracks",
                "difficulty": "intermediate",
                "instructor_name": "Amanuel Learning Team",
                "tags": ["web-design", "paid", "creator-skills"],
                "offering_type": CourseOfferingType.STANDARD,
                "is_free": False,
                "price_amount": Decimal("2499.00"),
                "price_currency": "ETB",
                "service_credit_hours": Decimal("0.00"),
                "auto_issue_service_credit": False,
                "service_credit_title": "",
                "service_credit_description": "",
                "enrollment_open": True,
                "admin_review_notes": "Reviewed paid course.",
                "admin_reviewed_by": self.admin_user,
                "admin_reviewed_at": self.now - timedelta(days=18),
                "status": CourseProgramStatus.PUBLISHED,
            },
        )
        self.community_course = self.upsert(
            CourseProgram,
            {"organization": self.main_org, "title": "Community Facilitation and Outreach"},
            {
                "description": "A community-service course focused on workshop planning, volunteering, and public participation.",
                "category": "Learning Tracks",
                "difficulty": "advanced",
                "instructor_name": "North Star Community Team",
                "tags": ["community-service", "facilitation", "volunteering"],
                "offering_type": CourseOfferingType.COMMUNITY_SERVICE,
                "is_free": False,
                "price_amount": Decimal("399.00"),
                "price_currency": "ETB",
                "service_credit_hours": Decimal("6.00"),
                "auto_issue_service_credit": True,
                "service_credit_title": "Community Facilitation Hours",
                "service_credit_description": "Automatically issued service-credit hours for verified participation.",
                "enrollment_open": True,
                "admin_review_notes": "Reviewed community-service course.",
                "admin_reviewed_by": self.admin_user,
                "admin_reviewed_at": self.now - timedelta(days=15),
                "status": CourseProgramStatus.PUBLISHED,
            },
        )
        self.draft_course = self.upsert(
            CourseProgram,
            {"organization": self.pending_org, "title": "Handmade Business Starter Track"},
            {
                "description": "Draft course for handmade business skills, pricing, and customer handling.",
                "category": "Learning Tracks",
                "difficulty": "beginner",
                "instructor_name": "Blue Oak Learning Team",
                "tags": ["handicraft", "draft", "business"],
                "offering_type": CourseOfferingType.STANDARD,
                "is_free": True,
                "price_amount": Decimal("0.00"),
                "price_currency": "ETB",
                "service_credit_hours": Decimal("0.00"),
                "auto_issue_service_credit": False,
                "service_credit_title": "",
                "service_credit_description": "",
                "enrollment_open": False,
                "admin_review_notes": "",
                "admin_reviewed_by": None,
                "admin_reviewed_at": None,
                "status": CourseProgramStatus.DRAFT,
            },
        )
        self.archived_course = self.upsert(
            CourseProgram,
            {"organization": self.restricted_org, "title": "Creative Studio Launchpad"},
            {
                "description": "Archived course for a creative studio launch scenario.",
                "category": "Learning Tracks",
                "difficulty": "intermediate",
                "instructor_name": "North Star Community Team",
                "tags": ["creative", "archived"],
                "offering_type": CourseOfferingType.STANDARD,
                "is_free": True,
                "price_amount": Decimal("0.00"),
                "price_currency": "ETB",
                "service_credit_hours": Decimal("0.00"),
                "auto_issue_service_credit": False,
                "service_credit_title": "",
                "service_credit_description": "",
                "enrollment_open": False,
                "admin_review_notes": "Archived during moderation scenario.",
                "admin_reviewed_by": self.admin_user,
                "admin_reviewed_at": self.now - timedelta(days=5),
                "status": CourseProgramStatus.ARCHIVED,
            },
        )

        self._replace_course_content(
            self.free_course,
            [
                (
                    "Workspace Setup and Hardware Basics",
                    "Learners start with device setup, common hardware terms, and service desk basics.",
                    [
                        ("Welcome to IT Support", LessonItemType.VIDEO, "Introductory course video.", "https://example.com/it-support-welcome", [], 12, False),
                        ("Service Desk Reading Pack", LessonItemType.READING, "Reading pack covering support language and expectations.", "https://example.com/service-desk-reading", [], 8, False),
                        ("Device Setup Guide", LessonItemType.RESOURCE, "Downloadable quick-start guide.", "", [], 5, False),
                        ("Workspace Readiness Checklist", LessonItemType.CHECKLIST, "Checklist lesson for setup tasks.", "", ["Prepare workspace", "Identify device parts", "Record support notes"], 10, False),
                    ],
                ),
                (
                    "Troubleshooting and Client Support",
                    "A practical module on diagnosing issues and speaking clearly with users.",
                    [
                        ("Troubleshooting Assessment", LessonItemType.ASSESSMENT, "Assessment gate for support readiness.", "https://example.com/it-support-assessment", [], 15, True),
                        ("Client Communication Quiz", LessonItemType.QUIZ, "Short quiz on support communication.", "https://example.com/it-support-quiz", [], 7, False),
                        ("Support Log Assignment", LessonItemType.ASSIGNMENT, "Submit a simple support ticket log.", "https://example.com/it-support-assignment", [], 20, False),
                    ],
                ),
                (
                    "Community Practice Lab",
                    "Practice with real-world IT support and peer-learning scenarios.",
                    [
                        ("Hands-On Lab Video", LessonItemType.VIDEO, "Walkthrough of a live support scenario.", "https://example.com/it-support-lab", [], 11, False),
                        ("Escalation Checklist", LessonItemType.CHECKLIST, "Checklist for escalation and handoff.", "", ["Identify the issue", "Escalate clearly", "Close the ticket"], 9, False),
                    ],
                ),
            ],
        )
        self._replace_course_content(
            self.paid_course,
            [
                (
                    "Design Thinking and Brand Basics",
                    "Learners plan the look, feel, and direction of a small-business website.",
                    [
                        ("Brand Design Overview", LessonItemType.VIDEO, "Course overview and design intent.", "https://example.com/web-design-overview", [], 14, False),
                        ("Brand Workbook", LessonItemType.RESOURCE, "Workbook for brand choices and layout ideas.", "", [], 6, False),
                        ("Audience Planning Checklist", LessonItemType.CHECKLIST, "Checklist for clarifying target users.", "", ["Define audience", "Pick a visual theme", "List page goals"], 10, False),
                    ],
                ),
                (
                    "Building the First Site",
                    "The hands-on module for turning design ideas into a working page.",
                    [
                        ("Layout Walkthrough", LessonItemType.VIDEO, "Build the page structure step by step.", "https://example.com/web-design-layout", [], 16, False),
                        ("Site Assets Pack", LessonItemType.RESOURCE, "Images, fonts, and brand assets.", "", [], 6, False),
                        ("Landing Page Assignment", LessonItemType.ASSIGNMENT, "Create a first landing page draft.", "https://example.com/web-design-assignment", [], 22, True),
                    ],
                ),
                (
                    "Launch and Client Handover",
                    "Focuses on publishing, feedback, and presenting work professionally.",
                    [
                        ("Launch Readiness Quiz", LessonItemType.QUIZ, "Check understanding before launch.", "https://example.com/web-design-quiz", [], 8, False),
                        ("Launch Assessment", LessonItemType.ASSESSMENT, "Final assessment for paid track completion.", "https://example.com/web-design-assessment", [], 18, True),
                    ],
                )
            ],
        )
        self._replace_course_content(
            self.community_course,
            [
                (
                    "Community Work Basics",
                    "Learners understand group facilitation, volunteering, and service expectations.",
                    [
                        ("Community Brief", LessonItemType.READING, "Service brief and participation expectations.", "https://example.com/community-brief", [], 9, False),
                        ("Volunteer Orientation", LessonItemType.VIDEO, "Orientation video for community work.", "https://example.com/community-orientation", [], 11, False),
                        ("Community Checklist", LessonItemType.CHECKLIST, "Checklist for first-time service participants.", "", ["Arrive on time", "Introduce yourself", "Log attendance"], 8, False),
                    ],
                ),
                (
                    "Delivery and Reflection",
                    "Evidence, reflection, and completion for service-credit tracking.",
                    [
                        ("Reflection Submission", LessonItemType.ASSIGNMENT, "Submit a reflection after service.", "https://example.com/community-reflection", [], 18, True),
                        ("Completion Review", LessonItemType.ASSESSMENT, "Review of service participation evidence.", "https://example.com/community-assessment", [], 14, True),
                    ],
                ),
                (
                    "Community Follow-Up",
                    "Materials for continued volunteering and peer support.",
                    [
                        ("Follow-Up Reading", LessonItemType.READING, "Short guide on staying involved.", "https://example.com/community-follow-up", [], 7, False),
                    ],
                ),
            ],
        )

        self.pending_invitation = self.upsert(
            CourseInstructorInvitation,
            {"token": "v1-invite-pending-main-regular"},
            {
                "course_program": self.community_course,
                "user": self.regular_user,
                "invited_by": self.organization_owner,
                "invited_email": self.regular_user.email,
                "status": CourseInstructorInvitationStatus.PENDING,
                "expires_at": self.now + timedelta(hours=24),
                "last_sent_at": self.now - timedelta(hours=1),
                "sent_count": 1,
                "accepted_at": None,
                "declined_at": None,
                "revoked_at": None,
            },
        )
        self.accepted_invitation = self.upsert(
            CourseInstructorInvitation,
            {"token": "v1-invite-accepted-peer"},
            {
                "course_program": self.paid_course,
                "user": self.peer_user,
                "invited_by": self.organization_owner,
                "invited_email": self.peer_user.email,
                "status": CourseInstructorInvitationStatus.ACCEPTED,
                "expires_at": self.now + timedelta(hours=24),
                "last_sent_at": self.now - timedelta(days=3),
                "sent_count": 2,
                "accepted_at": self.now - timedelta(days=2),
                "declined_at": None,
                "revoked_at": None,
            },
        )
        self.declined_invitation = self.upsert(
            CourseInstructorInvitation,
            {"token": "v1-invite-declined-reviewer"},
            {
                "course_program": self.free_course,
                "user": self.reviewer_user,
                "invited_by": self.organization_owner,
                "invited_email": self.reviewer_user.email,
                "status": CourseInstructorInvitationStatus.DECLINED,
                "expires_at": self.now + timedelta(hours=24),
                "last_sent_at": self.now - timedelta(days=4),
                "sent_count": 1,
                "accepted_at": None,
                "declined_at": self.now - timedelta(days=3),
                "revoked_at": None,
            },
        )
        self.revoked_invitation = self.upsert(
            CourseInstructorInvitation,
            {"token": "v1-invite-revoked-external"},
            {
                "course_program": self.free_course,
                "user": None,
                "invited_by": self.organization_owner,
                "invited_email": "seed.revoked.instructor@example.com",
                "status": CourseInstructorInvitationStatus.REVOKED,
                "expires_at": self.now + timedelta(hours=24),
                "last_sent_at": self.now - timedelta(days=6),
                "sent_count": 2,
                "accepted_at": None,
                "declined_at": None,
                "revoked_at": self.now - timedelta(days=5),
            },
        )
        self.expired_invitation = self.upsert(
            CourseInstructorInvitation,
            {"token": "v1-invite-expired-external"},
            {
                "course_program": self.paid_course,
                "user": None,
                "invited_by": self.organization_owner,
                "invited_email": "seed.expired.instructor@example.com",
                "status": CourseInstructorInvitationStatus.EXPIRED,
                "expires_at": self.now - timedelta(hours=2),
                "last_sent_at": self.now - timedelta(days=2),
                "sent_count": 1,
                "accepted_at": None,
                "declined_at": None,
                "revoked_at": None,
            },
        )

    def _replace_course_content(self, course_program, modules_payload):
        course_program.modules.all().delete()
        for module_index, module_payload in enumerate(modules_payload):
            module = CourseModule.objects.create(
                course_program=course_program,
                title=module_payload[0],
                description=module_payload[1],
                sort_order=module_index,
            )
            for lesson_index, lesson_payload in enumerate(module_payload[2]):
                LessonItem.objects.create(
                    module=module,
                    title=lesson_payload[0],
                    item_type=lesson_payload[1],
                    description=lesson_payload[2],
                    content_url=lesson_payload[3],
                    checklist_items=lesson_payload[4],
                    duration_minutes=lesson_payload[5],
                    sort_order=lesson_index,
                    progression_gate=lesson_payload[6],
                )

    def seed_swaps(self):
        self.direct_match = self.upsert(
            MatchSuggestion,
            {"source_user": self.regular_user, "target_user": self.peer_user},
            {
                "suggestion_type": MatchSuggestionType.DIRECT_SWAP,
                "score": 92,
                "rationale": "Direct reciprocal skill swap.",
                "context_snapshot": {"type": "v1", "reason": "direct"},
            },
        )
        self.partial_match = self.upsert(
            MatchSuggestion,
            {"source_user": self.peer_user, "target_user": self.regular_user},
            {
                "suggestion_type": MatchSuggestionType.PARTIAL_OVERLAP,
                "score": 76,
                "rationale": "Partial overlap between teaching and learning goals.",
                "context_snapshot": {"type": "v1", "reason": "partial"},
            },
        )
        self.field_match = self.upsert(
            MatchSuggestion,
            {"source_user": self.reviewer_user, "target_user": self.regular_user},
            {
                "suggestion_type": MatchSuggestionType.FIELD_RELEVANT,
                "score": 68,
                "rationale": "Field relevance between community and product work.",
                "context_snapshot": {"type": "v1", "reason": "field"},
            },
        )

        self.pending_swap = self.upsert(
            SkillSwapRequest,
            {"message": "Pending IT support and craft swap request"},
            {
                "requester": self.regular_user,
                "recipient": self.peer_user,
                "match_suggestion": self.direct_match,
                "status": SkillSwapStatus.PENDING,
                "requester_note": "Pending requester note.",
                "recipient_note": "",
                "cancelled_reason": "",
                "responded_at": None,
            },
        )
        self.accepted_swap = self.upsert(
            SkillSwapRequest,
            {"message": "Accepted web design and guitar swap request"},
            {
                "requester": self.peer_user,
                "recipient": self.regular_user,
                "match_suggestion": self.partial_match,
                "status": SkillSwapStatus.ACCEPTED,
                "requester_note": "Accepted requester note.",
                "recipient_note": "Accepted recipient note.",
                "cancelled_reason": "",
                "responded_at": self.now - timedelta(days=4),
            },
        )
        self.rejected_swap = self.upsert(
            SkillSwapRequest,
            {"message": "Rejected research and facilitation swap request"},
            {
                "requester": self.reviewer_user,
                "recipient": self.regular_user,
                "match_suggestion": self.field_match,
                "status": SkillSwapStatus.REJECTED,
                "requester_note": "Rejected requester note.",
                "recipient_note": "Rejected recipient note.",
                "cancelled_reason": "",
                "responded_at": self.now - timedelta(days=3),
            },
        )
        self.cancelled_swap = self.upsert(
            SkillSwapRequest,
            {"message": "Cancelled tailoring and support swap request"},
            {
                "requester": self.withdrawn_user,
                "recipient": self.candidate_user,
                "match_suggestion": None,
                "status": SkillSwapStatus.CANCELLED,
                "requester_note": "Cancelled requester note.",
                "recipient_note": "",
                "cancelled_reason": "Scheduling conflict.",
                "responded_at": self.now - timedelta(days=2),
            },
        )
        self.completed_swap = self.upsert(
            SkillSwapRequest,
            {"message": "Completed community facilitation swap request"},
            {
                "requester": self.candidate_user,
                "recipient": self.rejected_user,
                "match_suggestion": None,
                "status": SkillSwapStatus.COMPLETED,
                "requester_note": "Completed requester note.",
                "recipient_note": "Completed recipient note.",
                "cancelled_reason": "",
                "responded_at": self.now - timedelta(days=8),
            },
        )

        self._reset_swap_history(
            self.pending_swap,
            [(None, SkillSwapStatus.PENDING, self.regular_user, "Pending request created")],
        )
        self._reset_swap_history(
            self.accepted_swap,
            [
                (None, SkillSwapStatus.PENDING, self.peer_user, "Accepted request created"),
                (SkillSwapStatus.PENDING, SkillSwapStatus.ACCEPTED, self.regular_user, "Accepted decision logged"),
            ],
        )
        self._reset_swap_history(
            self.rejected_swap,
            [
                (None, SkillSwapStatus.PENDING, self.reviewer_user, "Rejected request created"),
                (SkillSwapStatus.PENDING, SkillSwapStatus.REJECTED, self.regular_user, "Rejected decision logged"),
            ],
        )
        self._reset_swap_history(
            self.cancelled_swap,
            [
                (None, SkillSwapStatus.PENDING, self.withdrawn_user, "Cancelled request created"),
                (SkillSwapStatus.PENDING, SkillSwapStatus.CANCELLED, self.withdrawn_user, "Cancelled decision logged"),
            ],
        )
        self._reset_swap_history(
            self.completed_swap,
            [
                (None, SkillSwapStatus.PENDING, self.candidate_user, "Completed request created"),
                (SkillSwapStatus.PENDING, SkillSwapStatus.ACCEPTED, self.rejected_user, "Completed swap accepted"),
                (SkillSwapStatus.ACCEPTED, SkillSwapStatus.COMPLETED, self.candidate_user, "Completed swap finished"),
            ],
        )

    def _reset_swap_history(self, swap_request, history_rows):
        swap_request.status_history.all().delete()
        for index, row in enumerate(history_rows):
            SkillSwapStatusHistory.objects.create(
                swap_request=swap_request,
                from_status=row[0] or "",
                to_status=row[1],
                changed_by=row[2],
                note=row[3],
                created_at=self.now - timedelta(days=max(1, len(history_rows) - index)),
            )

    def seed_messaging(self):
        self.accepted_thread = self.upsert(
            MessageThread,
            {"swap_request": self.accepted_swap},
            {"created_by": self.peer_user},
        )
        self.completed_thread = self.upsert(
            MessageThread,
            {"swap_request": self.completed_swap},
            {"created_by": self.candidate_user},
        )

        self._reset_thread_messages(
            self.accepted_thread,
            [
                (self.peer_user, ThreadMessage.MessageType.TEXT, "Thanks for connecting on IT support and craft exchange.", "", ""),
                (self.regular_user, ThreadMessage.MessageType.RESOURCE, "", "https://example.com/support-resource", "Support Resource"),
                (self.peer_user, ThreadMessage.MessageType.TEXT, "Let's confirm the workshop schedule.", "", ""),
            ],
        )
        self._reset_thread_messages(
            self.completed_thread,
            [
                (self.candidate_user, ThreadMessage.MessageType.TEXT, "Wrapping up the completed learning session.", "", ""),
                (self.rejected_user, ThreadMessage.MessageType.TEXT, "Thanks for the productive exchange.", "", ""),
            ],
        )

        accepted_messages = list(self.accepted_thread.messages.order_by("created_at", "id"))
        completed_messages = list(self.completed_thread.messages.order_by("created_at", "id"))

        MessageThreadReadState.objects.update_or_create(
            thread=self.accepted_thread,
            user=self.peer_user,
            defaults={
                "last_read_message": accepted_messages[-1],
                "last_read_at": self.now - timedelta(hours=2),
            },
        )
        MessageThreadReadState.objects.update_or_create(
            thread=self.accepted_thread,
            user=self.regular_user,
            defaults={
                "last_read_message": accepted_messages[1],
                "last_read_at": self.now - timedelta(hours=3),
            },
        )
        MessageThreadReadState.objects.update_or_create(
            thread=self.completed_thread,
            user=self.candidate_user,
            defaults={
                "last_read_message": completed_messages[-1],
                "last_read_at": self.now - timedelta(days=1),
            },
        )
        MessageThreadReadState.objects.update_or_create(
            thread=self.completed_thread,
            user=self.rejected_user,
            defaults={
                "last_read_message": completed_messages[-1],
                "last_read_at": self.now - timedelta(days=1),
            },
        )

    def _reset_thread_messages(self, thread, message_rows):
        thread.messages.all().delete()
        for row in message_rows:
            ThreadMessage.objects.create(
                thread=thread,
                sender=row[0],
                message_type=row[1],
                content=row[2],
                resource_url=row[3],
                resource_label=row[4],
            )

    def seed_sessions(self):
        session_rows = [
            ("IT Support Practice Session", self.accepted_swap, self.peer_user, LearningSessionStatus.PLANNED, self.now + timedelta(days=2), None, ""),
            ("Guitar Coaching Session", self.accepted_swap, self.regular_user, LearningSessionStatus.CONFIRMED, self.now + timedelta(days=4), None, ""),
            ("Handicraft Planning Session", self.accepted_swap, self.peer_user, LearningSessionStatus.CANCELLED, self.now + timedelta(days=1), self.now - timedelta(hours=6), "Cancelled before start."),
            ("Community Wrap-Up Session", self.completed_swap, self.candidate_user, LearningSessionStatus.COMPLETED, self.now - timedelta(days=4), None, "Completed successfully."),
        ]
        existing_titles = [row[0] for row in session_rows]
        LearningSession.objects.filter(title__in=existing_titles).delete()
        for title, swap_request, created_by, status, start_at, cancelled_at, completion_notes in session_rows:
            LearningSession.objects.create(
                swap_request=swap_request,
                created_by=created_by,
                title=title,
                description=f"{title} description",
                status=status,
                scheduled_start_at=start_at,
                scheduled_end_at=start_at + timedelta(hours=1),
                timezone="Africa/Nairobi",
                meeting_url="https://meet.example.com/session" if status != LearningSessionStatus.CANCELLED else "",
                meeting_notes="Seeded meeting notes",
                location_note="Remote",
                completion_notes=completion_notes,
                metadata={"seed": "v1"},
                completed_at=(self.now - timedelta(days=3)) if status == LearningSessionStatus.COMPLETED else None,
                cancelled_at=cancelled_at,
            )

    def seed_events_and_rsvps(self):
        self.upcoming_event = self.upsert(
            Event,
            {"organization": self.main_org, "title": "Hands-On Tech Support Clinic"},
            {
                "description": "A practical clinic where learners help with devices, accounts, and troubleshooting questions.",
                "category": "Workshops and Meetups",
                "location": "Addis Ababa",
                "is_online": False,
                "meeting_url": "",
                "cover_image_url": "https://example.com/tech-support-clinic.jpg",
                "max_attendees": 100,
                "rsvp_open": True,
                "tags": ["it-support", "community", "workshop"],
                "field_signals": ["information-technology", "community-and-volunteering"],
                "related_skills": ["IT Support", "Community Facilitation"],
                "related_course_ids": [self.free_course.id],
                "participation_signals": ["attendance", "networking"],
                "admin_review_notes": "",
                "admin_reviewed_by": None,
                "admin_reviewed_at": None,
                "status": EventStatus.UPCOMING,
                "starts_at": self.now + timedelta(days=7),
                "ends_at": self.now + timedelta(days=7, hours=2),
            },
        )
        self.live_event = self.upsert(
            Event,
            {"organization": self.pending_org, "title": "Guitar Jam and Mentoring Night"},
            {
                "description": "A live online event mixing music practice, mentoring, and peer learning.",
                "category": "Workshops and Meetups",
                "location": "Online",
                "is_online": True,
                "meeting_url": "https://meet.example.com/guitar-jam-night",
                "cover_image_url": "https://example.com/guitar-jam-night.jpg",
                "max_attendees": 80,
                "rsvp_open": True,
                "tags": ["music", "live", "mentoring"],
                "field_signals": ["music-and-arts", "community-and-volunteering"],
                "related_skills": ["Guitar", "Community Facilitation"],
                "related_course_ids": [self.draft_course.id],
                "participation_signals": ["live"],
                "admin_review_notes": "",
                "admin_reviewed_by": None,
                "admin_reviewed_at": None,
                "status": EventStatus.LIVE,
                "starts_at": self.now - timedelta(hours=1),
                "ends_at": self.now + timedelta(hours=2),
            },
        )
        self.completed_event = self.upsert(
            Event,
            {"organization": self.main_org, "title": "Local Makers Showcase"},
            {
                "description": "A completed showcase event for makers, crafters, and volunteers.",
                "category": "Workshops and Meetups",
                "location": "Bahir Dar",
                "is_online": False,
                "meeting_url": "",
                "cover_image_url": "https://example.com/local-makers-showcase.jpg",
                "max_attendees": 60,
                "rsvp_open": False,
                "tags": ["makers", "completed", "showcase"],
                "field_signals": ["craft-and-handmade", "community-and-volunteering"],
                "related_skills": ["Handicraft", "Community Facilitation"],
                "related_course_ids": [self.community_course.id],
                "participation_signals": ["certificate"],
                "admin_review_notes": "Reviewed completed event.",
                "admin_reviewed_by": self.admin_user,
                "admin_reviewed_at": self.now - timedelta(days=4),
                "status": EventStatus.COMPLETED,
                "starts_at": self.now - timedelta(days=6),
                "ends_at": self.now - timedelta(days=6, hours=-3),
            },
        )
        self.cancelled_event = self.upsert(
            Event,
            {"organization": self.restricted_org, "title": "Neighbourhood Repair and Support Drive"},
            {
                "description": "Cancelled community repair drive for lifecycle testing.",
                "category": "Workshops and Meetups",
                "location": "Nairobi",
                "is_online": False,
                "meeting_url": "",
                "cover_image_url": "https://example.com/support-drive.jpg",
                "max_attendees": 40,
                "rsvp_open": False,
                "tags": ["community", "cancelled"],
                "field_signals": ["community-and-volunteering"],
                "related_skills": ["Research and Analysis", "IT Support"],
                "related_course_ids": [self.archived_course.id],
                "participation_signals": ["cancelled"],
                "admin_review_notes": "Cancelled during moderation scenario.",
                "admin_reviewed_by": self.admin_user,
                "admin_reviewed_at": self.now - timedelta(days=3),
                "status": EventStatus.CANCELLED,
                "starts_at": self.now + timedelta(days=1),
                "ends_at": self.now + timedelta(days=1, hours=3),
            },
        )

        self.upcoming_rsvp = EventRSVP.objects.update_or_create(
            user=self.regular_user,
            event=self.upcoming_event,
            defaults={"status": RSVPStatus.GOING, "attended_at": None},
        )[0]
        self.live_rsvp = EventRSVP.objects.update_or_create(
            user=self.peer_user,
            event=self.live_event,
            defaults={"status": RSVPStatus.INTERESTED, "attended_at": None},
        )[0]
        self.cancelled_rsvp = EventRSVP.objects.update_or_create(
            user=self.reviewer_user,
            event=self.cancelled_event,
            defaults={"status": RSVPStatus.CANCELLED, "attended_at": None},
        )[0]
        self.completed_rsvp = EventRSVP.objects.update_or_create(
            user=self.regular_user,
            event=self.completed_event,
            defaults={"status": RSVPStatus.GOING, "attended_at": self.now - timedelta(days=6, hours=-1)},
        )[0]

    def seed_opportunities_and_applications(self):
        self.open_job = self.upsert(
            Opportunity,
            {"organization": self.main_org, "title": "IT Support Assistant"},
            {
                "description": "Support learners and staff with device setup, ticket triage, and simple troubleshooting.",
                "type": OpportunityType.JOB,
                "status": OpportunityStatus.OPEN,
                "category": "Jobs and Programs",
                "location": "Remote",
                "is_remote": True,
                "experience_level": ExperienceLevel.MID_CAREER,
                "salary_range": "18,000 - 28,000 ETB",
                "deadline": (self.now + timedelta(days=21)).date(),
                "required_skills": ["IT Support", "Customer Service"],
                "field_signals": ["information-technology"],
                "related_course_ids": [self.paid_course.id],
                "verified_activity_signals": ["course_completion", "service_record"],
                "admin_review_notes": "Reviewed open job.",
                "admin_reviewed_by": self.admin_user,
                "admin_reviewed_at": self.now - timedelta(days=9),
            },
        )
        self.draft_internship = self.upsert(
            Opportunity,
            {"organization": self.pending_org, "title": "Craft Operations Intern"},
            {
                "description": "Draft internship for a small handmade business and operations workflow.",
                "type": OpportunityType.INTERNSHIP,
                "status": OpportunityStatus.DRAFT,
                "category": "Jobs and Programs",
                "location": "Hawassa",
                "is_remote": False,
                "experience_level": ExperienceLevel.STUDENT,
                "salary_range": "Stipend",
                "deadline": None,
                "required_skills": ["Handicraft", "Customer Service"],
                "field_signals": ["craft-and-handmade"],
                "related_course_ids": [self.draft_course.id],
                "verified_activity_signals": [],
                "admin_review_notes": "",
                "admin_reviewed_by": None,
                "admin_reviewed_at": None,
            },
        )
        self.filled_program = self.upsert(
            Opportunity,
            {"organization": self.main_org, "title": "Community Program Coordinator"},
            {
                "description": "Filled program role for coordinating workshops and community sessions.",
                "type": OpportunityType.PROGRAM,
                "status": OpportunityStatus.FILLED,
                "category": "Jobs and Programs",
                "location": "Addis Ababa",
                "is_remote": False,
                "experience_level": ExperienceLevel.EARLY_CAREER,
                "salary_range": "Non-paid fellowship",
                "deadline": (self.now - timedelta(days=1)).date(),
                "required_skills": ["Community Facilitation", "IT Support"],
                "field_signals": ["community-and-volunteering"],
                "related_course_ids": [self.free_course.id],
                "verified_activity_signals": ["event_participation", "community_service"],
                "admin_review_notes": "Reviewed filled program.",
                "admin_reviewed_by": self.admin_user,
                "admin_reviewed_at": self.now - timedelta(days=8),
            },
        )
        self.closed_volunteer = self.upsert(
            Opportunity,
            {"organization": self.restricted_org, "title": "Guitar Workshop Volunteer"},
            {
                "description": "Closed volunteer role supporting music and mentoring events.",
                "type": OpportunityType.VOLUNTEER,
                "status": OpportunityStatus.CLOSED,
                "category": "Jobs and Programs",
                "location": "Nairobi",
                "is_remote": False,
                "experience_level": ExperienceLevel.EARLY_CAREER,
                "salary_range": "Volunteer",
                "deadline": (self.now - timedelta(days=4)).date(),
                "required_skills": ["Guitar", "Community Facilitation"],
                "field_signals": ["music-and-arts", "community-and-volunteering"],
                "related_course_ids": [self.archived_course.id],
                "verified_activity_signals": ["community_service"],
                "admin_review_notes": "Closed during moderation scenario.",
                "admin_reviewed_by": self.admin_user,
                "admin_reviewed_at": self.now - timedelta(days=4),
            },
        )

        application_rows = [
            (self.regular_user, self.open_job, JobApplicationStatus.APPLIED, "Applied for the support assistant role with hardware troubleshooting experience.", ""),
            (self.peer_user, self.open_job, JobApplicationStatus.SHORTLISTED, "Shortlisted with customer-facing support experience.", "Shortlisted in seeded data."),
            (self.reviewer_user, self.filled_program, JobApplicationStatus.INTERVIEW, "Interview discussion for community coordination work.", "Interview scheduled in seeded data."),
            (self.candidate_user, self.filled_program, JobApplicationStatus.HIRED, "Accepted for the coordinator role after strong facilitation history.", "Hired in seeded data."),
            (self.rejected_user, self.closed_volunteer, JobApplicationStatus.REJECTED, "Application for the volunteer role was reviewed and declined.", "Rejected in seeded data."),
            (self.withdrawn_user, self.open_job, JobApplicationStatus.WITHDRAWN, "Withdrew after accepting another support placement.", "Withdrawn in seeded data."),
        ]
        for user, opportunity, status_value, cover_letter, notes in application_rows:
            JobApplication.objects.update_or_create(
                user=user,
                opportunity=opportunity,
                defaults={
                    "status": status_value,
                    "cover_letter": cover_letter,
                    "reviewer_notes": notes,
                    "reviewed_at": self.now - timedelta(days=1) if status_value != JobApplicationStatus.APPLIED else None,
                },
            )

    def seed_enrollments_and_progress(self):
        self.active_free_enrollment = Enrollment.objects.update_or_create(
            user=self.regular_user,
            course_program=self.free_course,
            defaults={
                "status": EnrollmentStatus.ACTIVE,
                "progress_percent": 40,
                "completed_at": None,
            },
        )[0]
        self.active_paid_enrollment = Enrollment.objects.update_or_create(
            user=self.regular_user,
            course_program=self.paid_course,
            defaults={
                "status": EnrollmentStatus.ACTIVE,
                "progress_percent": 65,
                "completed_at": None,
            },
        )[0]
        self.completed_enrollment = Enrollment.objects.update_or_create(
            user=self.candidate_user,
            course_program=self.community_course,
            defaults={
                "status": EnrollmentStatus.COMPLETED,
                "progress_percent": 100,
                "completed_at": self.now - timedelta(days=2),
            },
        )[0]
        self.cancelled_enrollment = Enrollment.objects.update_or_create(
            user=self.reviewer_user,
            course_program=self.free_course,
            defaults={
                "status": EnrollmentStatus.CANCELLED,
                "progress_percent": 20,
                "completed_at": None,
            },
        )[0]
        self.pending_enrollment = Enrollment.objects.update_or_create(
            user=self.withdrawn_user,
            course_program=self.paid_course,
            defaults={
                "status": EnrollmentStatus.PENDING,
                "progress_percent": 0,
                "completed_at": None,
            },
        )[0]

        self._reset_lesson_progress(self.active_free_enrollment, ["Welcome to IT Support", "Service Desk Reading Pack"])
        self._reset_lesson_progress(self.active_paid_enrollment, ["Brand Design Overview", "Layout Walkthrough"])
        self._reset_lesson_progress(
            self.completed_enrollment,
            ["Community Brief", "Volunteer Orientation", "Reflection Submission"],
        )

    def _reset_lesson_progress(self, enrollment, completed_titles):
        enrollment.lesson_progresses.all().delete()
        completed_titles = set(completed_titles)
        for lesson in LessonItem.objects.filter(module__course_program=enrollment.course_program):
            if lesson.title not in completed_titles:
                continue
            EnrollmentLessonProgress.objects.create(
                enrollment=enrollment,
                lesson_item=lesson,
                is_completed=True,
                completed_at=self.now - timedelta(days=1),
            )

    def seed_communities(self):
        self.public_community = self.upsert(
            CommunityGroup,
            {"slug": "skill-swap-circle"},
            {
                "organization": self.main_org,
                "created_by": self.organization_owner,
                "title": "Skill Swap Circle",
                "description": "Public community for practical peer learning, workshops, and collaboration.",
                "category": "Community",
                "tags": ["public", "skills", "peer-learning"],
                "visibility": CommunityVisibility.PUBLIC,
                "related_course": self.free_course,
                "related_event": self.upcoming_event,
                "is_active": True,
            },
        )
        self.members_only_community = self.upsert(
            CommunityGroup,
            {"slug": "makers-guild"},
            {
                "organization": self.restricted_org,
                "created_by": self.restricted_org_owner,
                "title": "Makers Guild",
                "description": "Members-only maker community for craft, repair, and studio collaboration.",
                "category": "Community",
                "tags": ["private", "makers", "craft"],
                "visibility": CommunityVisibility.MEMBERS_ONLY,
                "related_course": self.archived_course,
                "related_event": self.cancelled_event,
                "is_active": False,
            },
        )

        CommunityMembership.objects.update_or_create(
            community=self.public_community,
            user=self.regular_user,
            defaults={"role": CommunityMembershipRole.MEMBER},
        )
        CommunityMembership.objects.update_or_create(
            community=self.public_community,
            user=self.peer_user,
            defaults={"role": CommunityMembershipRole.MODERATOR},
        )
        CommunityMembership.objects.update_or_create(
            community=self.members_only_community,
            user=self.candidate_user,
            defaults={"role": CommunityMembershipRole.MEMBER},
        )

        CommunityPost.objects.update_or_create(
            community=self.public_community,
            author=self.regular_user,
            body="Sharing support tips for the IT support track and asking for guitar practice partners.",
        )
        CommunityPost.objects.update_or_create(
            community=self.public_community,
            author=self.peer_user,
            body="Posting a handmade craft showcase and inviting others to swap skills.",
        )

    def seed_service_credit_and_certificates(self):
        self.issued_service_credit = self.upsert(
            ServiceCreditRecord,
            {"organization": self.main_org, "user": self.regular_user, "title": "Community Outreach Service Credit"},
            {
                "community_group": self.public_community,
                "event": self.completed_event,
                "course_program": self.community_course,
                "description": "Issued service-credit record for verified community outreach and event support.",
                "credit_hours": Decimal("6.00"),
                "status": ServiceCreditStatus.ISSUED,
                "evidence_note": "Verified community-service participation.",
                "issued_by": self.organization_owner,
            },
        )
        self.revoked_service_credit = self.upsert(
            ServiceCreditRecord,
            {"organization": self.main_org, "user": self.peer_user, "title": "Makers Support Service Credit"},
            {
                "community_group": self.public_community,
                "event": self.completed_event,
                "course_program": self.free_course,
                "description": "Revoked service-credit record for governance testing.",
                "credit_hours": Decimal("2.50"),
                "status": ServiceCreditStatus.REVOKED,
                "evidence_note": "Revoked for testing.",
                "issued_by": self.organization_owner,
            },
        )

        self.course_certificate = self.upsert(
            Certificate,
            {"certificate_id": "SV-CERT-COURSE-001"},
            {
                "organization": self.main_org,
                "user": self.candidate_user,
                "service_credit": None,
                "course_program": self.community_course,
                "event": None,
                "source_type": CertificateSourceType.COURSE_COMPLETION,
                "title": "Community Facilitation Completion Certificate",
                "summary": "Awarded for completing the community facilitation track.",
                "signature_label": "SkillVerse Verified",
                "status": CertificateStatus.ACTIVE,
                "issued_by": self.organization_owner,
            },
        )
        self.event_certificate = self.upsert(
            Certificate,
            {"certificate_id": "SV-CERT-EVENT-001"},
            {
                "organization": self.main_org,
                "user": self.regular_user,
                "service_credit": None,
                "course_program": None,
                "event": self.completed_event,
                "source_type": CertificateSourceType.EVENT_PARTICIPATION,
                "title": "Event Participation Certificate",
                "summary": "Revoked participation certificate for the showcase event.",
                "signature_label": "SkillVerse Verified",
                "status": CertificateStatus.REVOKED,
                "issued_by": self.organization_owner,
            },
        )
        self.service_certificate = self.upsert(
            Certificate,
            {"certificate_id": "SV-CERT-SERVICE-001"},
            {
                "organization": self.main_org,
                "user": self.regular_user,
                "service_credit": self.issued_service_credit,
                "course_program": None,
                "event": self.completed_event,
                "source_type": CertificateSourceType.SERVICE_CREDIT,
                "title": "Service Credit Certificate",
                "summary": "Certificate backed by verified service credit.",
                "signature_label": "SkillVerse Verified",
                "status": CertificateStatus.ACTIVE,
                "issued_by": self.organization_owner,
            },
        )

    def seed_payments(self):
        payment_rows = [
            ("v1-tx-paid-success", self.regular_user, self.paid_course, self.main_org, Decimal("1499.00"), PaymentTransactionPurpose.COURSE_ENROLLMENT, PaymentTransactionStatus.SUCCEEDED, PaymentAutomationStatus.COMPLETED, "", None),
            ("v1-tx-paid-pending", self.candidate_user, self.paid_course, self.main_org, Decimal("1499.00"), PaymentTransactionPurpose.COURSE_ENROLLMENT, PaymentTransactionStatus.PENDING, PaymentAutomationStatus.NONE, "", None),
            ("v1-tx-paid-failed", self.reviewer_user, self.paid_course, self.main_org, Decimal("1499.00"), PaymentTransactionPurpose.COURSE_ENROLLMENT, PaymentTransactionStatus.FAILED, PaymentAutomationStatus.FAILED, "Payment authorization failed.", None),
            ("v1-tx-paid-cancelled", self.withdrawn_user, self.paid_course, self.main_org, Decimal("1499.00"), PaymentTransactionPurpose.COURSE_ENROLLMENT, PaymentTransactionStatus.CANCELLED, PaymentAutomationStatus.NONE, "User cancelled checkout.", None),
            ("v1-tx-paid-refunded", self.peer_user, self.paid_course, self.main_org, Decimal("1499.00"), PaymentTransactionPurpose.COURSE_ENROLLMENT, PaymentTransactionStatus.REFUNDED, PaymentAutomationStatus.PENDING, "", None),
            ("v1-tx-paid-reversed", self.rejected_user, self.paid_course, self.main_org, Decimal("1499.00"), PaymentTransactionPurpose.COURSE_ENROLLMENT, PaymentTransactionStatus.REVERSED, PaymentAutomationStatus.NONE, "Provider reversed payment.", None),
            ("v1-tx-community-success", self.regular_user, self.community_course, self.main_org, Decimal("299.00"), PaymentTransactionPurpose.COMMUNITY_SERVICE_ENROLLMENT, PaymentTransactionStatus.SUCCEEDED, PaymentAutomationStatus.PENDING, "", self.issued_service_credit),
        ]
        for tx_ref, user, course, organization, amount, purpose, status_value, automation_status, failure_reason, service_credit in payment_rows:
            self.upsert(
                PaymentTransaction,
                {"tx_ref": tx_ref},
                {
                    "user": user,
                    "course_program": course,
                    "organization": organization,
                    "provider": "chapa",
                    "amount": amount,
                    "currency": "ETB",
                    "purpose": purpose,
                    "status": status_value,
                    "automation_status": automation_status,
                    "automation_error": "Automation follow-up required." if automation_status == PaymentAutomationStatus.FAILED else "",
                    "fulfilled_at": self.now - timedelta(days=1) if status_value == PaymentTransactionStatus.SUCCEEDED else None,
                    "checkout_url": f"https://checkout.example.com/{tx_ref}",
                    "callback_url": f"https://backend.example.com/payments/{tx_ref}/callback",
                    "return_url": f"https://frontend.example.com/payments/{tx_ref}/return",
                    "provider_reference": f"provider-{tx_ref}",
                    "provider_method": "checkout",
                    "provider_mode": "sandbox",
                    "provider_charge": Decimal("15.00") if status_value == PaymentTransactionStatus.SUCCEEDED else None,
                    "failure_reason": failure_reason,
                    "verification_data": {"seed": "v1", "tx_ref": tx_ref},
                    "service_credit_record": service_credit,
                    "last_verified_at": self.now - timedelta(hours=2),
                    "verified_at": self.now - timedelta(hours=2) if status_value == PaymentTransactionStatus.SUCCEEDED else None,
                },
            )

        self.upsert(
            PaymentWebhookEvent,
            {"event_key": "v1-webhook-processed"},
            {
                "event_type": "charge.success",
                "tx_ref": "v1-tx-paid-success",
                "provider_reference": "provider-v1-tx-paid-success",
                "processed": True,
                "processed_at": self.now - timedelta(hours=1),
            },
        )
        self.upsert(
            PaymentWebhookEvent,
            {"event_key": "v1-webhook-unprocessed"},
            {
                "event_type": "charge.failed",
                "tx_ref": "v1-tx-paid-failed",
                "provider_reference": "provider-v1-tx-paid-failed",
                "processed": False,
                "processed_at": None,
            },
        )

    def seed_reviews(self):
        RatingReview.objects.update_or_create(
            reviewer=self.candidate_user,
            swap_request=self.completed_swap,
            defaults={
                "reviewee_user": self.rejected_user,
                "context": ReviewContext.SKILL_SWAP,
                "rating": 5,
                "comment": "Completed swap review.",
                "enrollment": None,
                "course_program": None,
                "event_rsvp": None,
                "event": None,
            },
        )
        RatingReview.objects.update_or_create(
            reviewer=self.candidate_user,
            enrollment=self.completed_enrollment,
            defaults={
                "reviewee_user": None,
                "context": ReviewContext.COURSE,
                "rating": 4,
                "comment": "Course completion review.",
                "swap_request": None,
                "course_program": self.community_course,
                "event_rsvp": None,
                "event": None,
            },
        )
        RatingReview.objects.update_or_create(
            reviewer=self.regular_user,
            event_rsvp=self.completed_rsvp,
            defaults={
                "reviewee_user": None,
                "context": ReviewContext.EVENT,
                "rating": 5,
                "comment": "Event participation review.",
                "swap_request": None,
                "enrollment": None,
                "course_program": None,
                "event": self.completed_event,
            },
        )

    def seed_notifications(self):
        notification_rows = [
            (self.regular_user, NotificationType.AUTH, "Login update", "/login"),
            (self.unverified_regular_user, NotificationType.VERIFICATION, "Verify your email", "/verify-email"),
            (self.regular_user, NotificationType.SWAP, "Swap update", "/skill-swap"),
            (self.regular_user, NotificationType.MESSAGE, "New message", "/messages"),
            (self.regular_user, NotificationType.SESSION, "Session update", "/messages?panel=sessions"),
            (self.regular_user, NotificationType.COURSE, "Course update", f"/courses/{self.free_course.id}"),
            (self.regular_user, NotificationType.ENROLLMENT, "Enrollment update", f"/courses/{self.paid_course.id}"),
            (self.regular_user, NotificationType.EVENT, "Event update", f"/events/{self.upcoming_event.id}"),
            (self.regular_user, NotificationType.OPPORTUNITY, "Opportunity update", f"/jobs/{self.open_job.id}"),
            (self.regular_user, NotificationType.COMMUNITY, "Community update", "/communities"),
            (self.regular_user, NotificationType.CERTIFICATE, "Certificate update", f"/certificates/{self.service_certificate.certificate_id}"),
            (self.organization_owner, NotificationType.ADMIN, "Admin update", "/org?tab=trust"),
        ]
        for index, row in enumerate(notification_rows):
            self.upsert(
                Notification,
                {"user": row[0], "type": row[1], "title": row[2]},
                {
                    "message": f"{row[2]} message payload.",
                    "action_url": row[3],
                    "metadata": {"seed": "v1", "index": index},
                    "is_read": index % 2 == 0,
                    "read_at": self.now - timedelta(hours=1) if index % 2 == 0 else None,
                    "emailed_at": self.now - timedelta(hours=2) if index % 3 == 0 else None,
                },
            )

    def seed_ai_records(self):
        consent_rows = [
            (AIFeatureKey.RECOMMENDATIONS, CognitiveMonitoringConsentStatus.ACTIVE, ["lesson_progress", "reflection_checkins"], ["/dashboard"]),
            (AIFeatureKey.LEARNING_GUIDANCE, CognitiveMonitoringConsentStatus.ACTIVE, ["enrollment_activity"], ["/courses/:id"]),
            (AIFeatureKey.ASSIGNMENT_FEEDBACK, CognitiveMonitoringConsentStatus.REVOKED, ["assignment_activity"], ["/courses/:id"]),
            (AIFeatureKey.COGNITIVE_MONITORING, CognitiveMonitoringConsentStatus.ACTIVE, ["self_reported_mood", "message_responsiveness"], ["/dashboard", "/messages"]),
        ]
        for feature_key, status_value, signals, surfaces in consent_rows:
            CognitiveMonitoringConsentRecord.objects.update_or_create(
                user=self.regular_user,
                feature_key=feature_key,
                defaults={
                    "status": status_value,
                    "policy_version": "v1-policy",
                    "allowed_signals": signals,
                    "surfaces": surfaces,
                    "source_surface": surfaces[0],
                    "disclosure_acknowledged": True,
                    "revoked_at": self.now - timedelta(days=1) if status_value == CognitiveMonitoringConsentStatus.REVOKED else None,
                    "revoked_reason": "Seeded revoked scenario." if status_value == CognitiveMonitoringConsentStatus.REVOKED else "",
                    "metadata": {"seed": "v1"},
                },
            )

        AdaptiveMonitoringCheckIn.objects.filter(
            user=self.regular_user,
            reflection_note__startswith="Adaptive mood",
        ).delete()
        for index, mood in enumerate(AdaptiveCheckInMood.values):
            AdaptiveMonitoringCheckIn.objects.create(
                user=self.regular_user,
                course_program=self.free_course if index % 2 == 0 else self.community_course,
                surface="/dashboard" if index % 2 == 0 else f"/courses/{self.community_course.id}",
                mood_label=mood,
                focus_level=min(100, 35 + (index * 10)),
                energy_level=min(100, 40 + (index * 8)),
                stress_level=min(100, 20 + (index * 11)),
                reflection_note=f"Adaptive mood scenario: {mood}.",
                metadata={"seed": "v1", "mood_index": index},
            )

    def seed_audit_logs(self):
        audit_rows = [
            (self.admin_user, "v1.organization.review.approved", "organization", self.main_org.id, "Admin approved organization."),
            (self.organization_owner, "v1.course.publish", "course_program", self.free_course.id, "Organization published free course."),
            (self.regular_user, "v1.swap.accepted", "skill_swap_request", self.accepted_swap.id, "Regular user accepted swap."),
            (None, "v1.instructor.link_only.accept", "course_instructor_invitation", self.expired_invitation.id, "Link-only instructor invitation scenario."),
        ]
        for actor, action, target_type, target_id, summary in audit_rows:
            self.upsert(
                AuditLog,
                {"action": action, "target_type": target_type, "target_id": target_id},
                {
                    "actor": actor,
                    "summary": summary,
                    "metadata": {"seed": "v1"},
                },
            )


# StrongPass123!
