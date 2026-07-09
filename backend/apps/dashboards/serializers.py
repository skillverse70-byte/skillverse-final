from rest_framework import serializers

from apps.accounts.models import User
from apps.common.enums import SkillDirection
from apps.courses.serializers import (
    CourseProgramSummarySerializer,
    EnrollmentSummarySerializer,
    OrganizationEnrollmentSerializer,
)
from apps.events.serializers import (
    AdminEventOversightSerializer,
    EventRSVPSummarySerializer,
    EventSummarySerializer,
)
from apps.opportunities.serializers import (
    ApplicantSummarySerializer,
    JobApplicationSummarySerializer,
    OpportunitySummarySerializer,
)
from apps.organizations.serializers import (
    OrganizationProfileSerializer,
    OrganizationVerificationOverviewSerializer,
    OrganizationVerificationRequestSerializer,
)
from apps.payments.serializers import AdminFinancialAccountSerializer, FinancialAccountSerializer
from apps.sessions.serializers import LearningSessionSerializer
from apps.swaps.serializers import SkillSwapRequestSerializer


class DashboardUserSummarySerializer(serializers.ModelSerializer):
    is_email_verified = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "role",
            "is_email_verified",
        ]
        read_only_fields = fields


class RecommendationSignalsSerializer(serializers.Serializer):
    profile_fields = serializers.ListField(child=serializers.CharField(), read_only=True)
    offered_skills = serializers.ListField(child=serializers.CharField(), read_only=True)
    learning_skills = serializers.ListField(child=serializers.CharField(), read_only=True)
    course_categories = serializers.ListField(child=serializers.CharField(), read_only=True)
    event_fields = serializers.ListField(child=serializers.CharField(), read_only=True)
    application_fields = serializers.ListField(child=serializers.CharField(), read_only=True)
    activity_signals = serializers.ListField(child=serializers.CharField(), read_only=True)


class RegularUserDashboardStatsSerializer(serializers.Serializer):
    active_courses = serializers.IntegerField(read_only=True)
    completed_courses = serializers.IntegerField(read_only=True)
    pending_swap_requests = serializers.IntegerField(read_only=True)
    active_swaps = serializers.IntegerField(read_only=True)
    upcoming_sessions = serializers.IntegerField(read_only=True)
    applications = serializers.IntegerField(read_only=True)
    active_rsvps = serializers.IntegerField(read_only=True)


class RegularUserDashboardSerializer(serializers.Serializer):
    user = DashboardUserSummarySerializer(read_only=True)
    stats = RegularUserDashboardStatsSerializer(read_only=True)
    recommendation_signals = RecommendationSignalsSerializer(read_only=True)
    enrollments = EnrollmentSummarySerializer(many=True, read_only=True)
    sessions = LearningSessionSerializer(many=True, read_only=True)
    swap_requests = SkillSwapRequestSerializer(many=True, read_only=True)
    applications = JobApplicationSummarySerializer(many=True, read_only=True)
    rsvps = EventRSVPSummarySerializer(many=True, read_only=True)


class OrganizationDashboardStatsSerializer(serializers.Serializer):
    total_courses = serializers.IntegerField(read_only=True)
    published_courses = serializers.IntegerField(read_only=True)
    active_enrollments = serializers.IntegerField(read_only=True)
    completed_enrollments = serializers.IntegerField(read_only=True)
    open_opportunities = serializers.IntegerField(read_only=True)
    total_applications = serializers.IntegerField(read_only=True)
    hired_applicants = serializers.IntegerField(read_only=True)
    active_events = serializers.IntegerField(read_only=True)
    total_event_rsvps = serializers.IntegerField(read_only=True)


class CoursePerformanceSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    is_free = serializers.BooleanField(read_only=True)
    enrollment_count = serializers.IntegerField(read_only=True)
    active_enrollment_count = serializers.IntegerField(read_only=True)
    completed_enrollment_count = serializers.IntegerField(read_only=True)
    average_progress_percent = serializers.IntegerField(read_only=True)


class OrganizationDashboardSerializer(serializers.Serializer):
    organization = OrganizationProfileSerializer(read_only=True)
    verification = OrganizationVerificationOverviewSerializer(read_only=True)
    financial_account = FinancialAccountSerializer(allow_null=True, read_only=True)
    stats = OrganizationDashboardStatsSerializer(read_only=True)
    course_performance = CoursePerformanceSummarySerializer(many=True, read_only=True)
    courses = CourseProgramSummarySerializer(many=True, read_only=True)
    enrollments = OrganizationEnrollmentSerializer(many=True, read_only=True)
    events = EventSummarySerializer(many=True, read_only=True)
    opportunities = OpportunitySummarySerializer(many=True, read_only=True)
    applications = ApplicantSummarySerializer(many=True, read_only=True)


class AdminPlatformSummarySerializer(serializers.Serializer):
    total_users = serializers.IntegerField(read_only=True)
    regular_users = serializers.IntegerField(read_only=True)
    organizations = serializers.IntegerField(read_only=True)
    verified_organizations = serializers.IntegerField(read_only=True)
    published_courses = serializers.IntegerField(read_only=True)
    active_enrollments = serializers.IntegerField(read_only=True)
    open_opportunities = serializers.IntegerField(read_only=True)
    active_events = serializers.IntegerField(read_only=True)


class AdminOversightCountsSerializer(serializers.Serializer):
    pending_verification_requests = serializers.IntegerField(read_only=True)
    pending_financial_accounts = serializers.IntegerField(read_only=True)
    restricted_financial_accounts = serializers.IntegerField(read_only=True)
    events_from_unverified_organizations = serializers.IntegerField(read_only=True)
    reviewed_events = serializers.IntegerField(read_only=True)


class AdminAdaptiveMonitoringSummarySerializer(serializers.Serializer):
    active_consents = serializers.IntegerField(read_only=True)
    revoked_consents = serializers.IntegerField(read_only=True)
    distinct_consented_users = serializers.IntegerField(read_only=True)
    currently_monitored_users = serializers.IntegerField(read_only=True)


class AdminDashboardSerializer(serializers.Serializer):
    summary = AdminPlatformSummarySerializer(read_only=True)
    oversight = AdminOversightCountsSerializer(read_only=True)
    adaptive_monitoring = AdminAdaptiveMonitoringSummarySerializer(read_only=True)
    organization_verification_requests = OrganizationVerificationRequestSerializer(
        many=True,
        read_only=True,
    )
    financial_accounts = AdminFinancialAccountSerializer(many=True, read_only=True)
    events = AdminEventOversightSerializer(many=True, read_only=True)
