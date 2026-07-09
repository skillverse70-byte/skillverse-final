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


class AnalyticsCountItemSerializer(serializers.Serializer):
    key = serializers.CharField(read_only=True)
    label = serializers.CharField(read_only=True)
    count = serializers.IntegerField(read_only=True)


class AnalyticsHeatmapItemSerializer(serializers.Serializer):
    location = serializers.CharField(read_only=True)
    source_type = serializers.CharField(read_only=True)
    count = serializers.IntegerField(read_only=True)


class AnalyticsInsightCardSerializer(serializers.Serializer):
    key = serializers.CharField(read_only=True)
    severity = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    route = serializers.CharField(read_only=True)


class AnalyticsAIProviderSerializer(serializers.Serializer):
    provider = serializers.CharField(read_only=True)
    configured = serializers.BooleanField(read_only=True)
    healthy = serializers.BooleanField(read_only=True)
    default_model = serializers.CharField(read_only=True)
    base_url = serializers.CharField(read_only=True)
    timeout_seconds = serializers.IntegerField(read_only=True)


class AnalyticsAIFeatureRolloutSerializer(serializers.Serializer):
    key = serializers.CharField(read_only=True)
    label = serializers.CharField(read_only=True)
    enabled = serializers.BooleanField(read_only=True)
    rollout_state = serializers.CharField(read_only=True)
    actor_roles = serializers.ListField(child=serializers.CharField(), read_only=True)
    surfaces = serializers.ListField(child=serializers.CharField(), read_only=True)


class AnalyticsSystemHealthSerializer(serializers.Serializer):
    provider = AnalyticsAIProviderSerializer(read_only=True)
    feature_rollouts = AnalyticsAIFeatureRolloutSerializer(many=True, read_only=True)
    ready_features = serializers.IntegerField(read_only=True)
    fallback_only_features = serializers.IntegerField(read_only=True)
    disabled_features = serializers.IntegerField(read_only=True)
    recent_match_suggestions_7d = serializers.IntegerField(read_only=True)
    recent_checkins_7d = serializers.IntegerField(read_only=True)
    recent_enrollments_7d = serializers.IntegerField(read_only=True)
    recent_rsvps_7d = serializers.IntegerField(read_only=True)
    recent_applications_7d = serializers.IntegerField(read_only=True)


class OrganizationAnalyticsSummarySerializer(serializers.Serializer):
    managed_learners = serializers.IntegerField(read_only=True)
    active_courses = serializers.IntegerField(read_only=True)
    active_events = serializers.IntegerField(read_only=True)
    open_opportunities = serializers.IntegerField(read_only=True)
    issued_certificates = serializers.IntegerField(read_only=True)
    service_credit_records = serializers.IntegerField(read_only=True)


class OrganizationEventEngagementAnalyticsSerializer(serializers.Serializer):
    rsvp_status_distribution = AnalyticsCountItemSerializer(many=True, read_only=True)
    format_distribution = AnalyticsCountItemSerializer(many=True, read_only=True)
    attendance_rate_percent = serializers.FloatField(read_only=True)


class OrganizationOpportunityPipelineAnalyticsSerializer(serializers.Serializer):
    application_status_distribution = AnalyticsCountItemSerializer(many=True, read_only=True)
    shortlisted_rate_percent = serializers.FloatField(read_only=True)
    hired_rate_percent = serializers.FloatField(read_only=True)


class KnowledgeTrendAnalyticsSerializer(serializers.Serializer):
    top_fields = AnalyticsCountItemSerializer(many=True, read_only=True)
    top_offered_skills = AnalyticsCountItemSerializer(many=True, read_only=True)
    top_learning_skills = AnalyticsCountItemSerializer(many=True, read_only=True)
    top_course_categories = AnalyticsCountItemSerializer(many=True, read_only=True)
    top_event_categories = AnalyticsCountItemSerializer(many=True, read_only=True)
    top_opportunity_categories = AnalyticsCountItemSerializer(many=True, read_only=True)


class OrganizationMatchingQualityAnalyticsSerializer(serializers.Serializer):
    learners_with_profile_fields = serializers.IntegerField(read_only=True)
    learners_with_skill_signals = serializers.IntegerField(read_only=True)
    learners_with_peer_matches = serializers.IntegerField(read_only=True)
    average_peer_match_score = serializers.FloatField(read_only=True)
    accepted_peer_swaps = serializers.IntegerField(read_only=True)
    recommendation_ready_percent = serializers.FloatField(read_only=True)


class OrganizationAnalyticsSystemHealthSerializer(AnalyticsSystemHealthSerializer):
    verification_status = serializers.CharField(read_only=True)
    financial_account_status = serializers.CharField(read_only=True)


class OrganizationAnalyticsSerializer(serializers.Serializer):
    summary = OrganizationAnalyticsSummarySerializer(read_only=True)
    course_category_distribution = AnalyticsCountItemSerializer(many=True, read_only=True)
    learner_progress_bands = AnalyticsCountItemSerializer(many=True, read_only=True)
    event_engagement = OrganizationEventEngagementAnalyticsSerializer(read_only=True)
    opportunity_pipeline = OrganizationOpportunityPipelineAnalyticsSerializer(read_only=True)
    knowledge_trends = KnowledgeTrendAnalyticsSerializer(read_only=True)
    social_impact_heatmap = AnalyticsHeatmapItemSerializer(many=True, read_only=True)
    matching_quality = OrganizationMatchingQualityAnalyticsSerializer(read_only=True)
    system_health = OrganizationAnalyticsSystemHealthSerializer(read_only=True)
    insight_cards = AnalyticsInsightCardSerializer(many=True, read_only=True)


class AdminAnalyticsSummarySerializer(serializers.Serializer):
    total_match_suggestions = serializers.IntegerField(read_only=True)
    total_adaptive_checkins = serializers.IntegerField(read_only=True)
    issued_certificates = serializers.IntegerField(read_only=True)
    service_credit_records = serializers.IntegerField(read_only=True)
    tracked_sessions = serializers.IntegerField(read_only=True)


class AdminMatchingQualityAnalyticsSerializer(serializers.Serializer):
    total_match_suggestions = serializers.IntegerField(read_only=True)
    average_match_score = serializers.FloatField(read_only=True)
    high_confidence_matches = serializers.IntegerField(read_only=True)
    suggestions_backed_by_requests = serializers.IntegerField(read_only=True)
    accepted_swaps_from_suggestions = serializers.IntegerField(read_only=True)
    accepted_swap_conversion_percent = serializers.FloatField(read_only=True)
    score_distribution = AnalyticsCountItemSerializer(many=True, read_only=True)


class AdminAdaptiveMonitoringAnalyticsSerializer(serializers.Serializer):
    summary = AdminAdaptiveMonitoringSummarySerializer(read_only=True)
    signal_counts = AnalyticsCountItemSerializer(many=True, read_only=True)
    mood_distribution = AnalyticsCountItemSerializer(many=True, read_only=True)
    surface_distribution = AnalyticsCountItemSerializer(many=True, read_only=True)
    average_focus_level = serializers.FloatField(read_only=True)
    average_energy_level = serializers.FloatField(read_only=True)
    average_stress_level = serializers.FloatField(read_only=True)
    recent_checkins_7d = serializers.IntegerField(read_only=True)


class AdminSessionCoordinationAnalyticsSerializer(serializers.Serializer):
    delivery_mode = serializers.CharField(read_only=True)
    total_sessions = serializers.IntegerField(read_only=True)
    planned_sessions = serializers.IntegerField(read_only=True)
    confirmed_sessions = serializers.IntegerField(read_only=True)
    completed_sessions = serializers.IntegerField(read_only=True)
    sessions_with_meeting_links = serializers.IntegerField(read_only=True)
    meeting_link_usage_percent = serializers.FloatField(read_only=True)


class AdminAnalyticsSerializer(serializers.Serializer):
    summary = AdminAnalyticsSummarySerializer(read_only=True)
    matching_quality = AdminMatchingQualityAnalyticsSerializer(read_only=True)
    adaptive_monitoring = AdminAdaptiveMonitoringAnalyticsSerializer(read_only=True)
    system_health = AnalyticsSystemHealthSerializer(read_only=True)
    session_coordination_analytics = AdminSessionCoordinationAnalyticsSerializer(read_only=True)
    global_knowledge_trends = KnowledgeTrendAnalyticsSerializer(read_only=True)
    social_impact_heatmap = AnalyticsHeatmapItemSerializer(many=True, read_only=True)
    insight_cards = AnalyticsInsightCardSerializer(many=True, read_only=True)
