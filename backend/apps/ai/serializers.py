from rest_framework import serializers

from apps.common.enums import (
    AIFeatureKey,
    AIRolloutState,
    AdaptiveCheckInMood,
    AdaptiveFocusDriftLevel,
    CognitiveMonitoringConsentStatus,
    LessonItemType,
    Role,
)
from apps.courses.serializers import CourseProgramSummarySerializer
from apps.dashboards.serializers import RecommendationSignalsSerializer
from apps.events.serializers import EventSummarySerializer
from apps.opportunities.serializers import OpportunitySummarySerializer
from apps.swaps.serializers import MatchSuggestionSerializer


class AIProviderHealthQuerySerializer(serializers.Serializer):
    mode = serializers.ChoiceField(
        choices=("config", "live", "completion"),
        required=False,
        default="config",
    )


class AIProviderHealthResponseSerializer(serializers.Serializer):
    provider = serializers.CharField()
    configured = serializers.BooleanField()
    healthy = serializers.BooleanField()
    mode = serializers.CharField()
    default_model = serializers.CharField(allow_blank=True)
    base_url = serializers.CharField()
    timeout_seconds = serializers.IntegerField()
    has_api_key = serializers.BooleanField()
    using_legacy_env_key = serializers.BooleanField()
    feature_flags = serializers.JSONField()
    details = serializers.JSONField()


class AIFeatureCapabilitySerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    rollout_state = serializers.CharField()
    enabled = serializers.BooleanField()
    available = serializers.BooleanField()
    actor_enabled = serializers.BooleanField()
    actor_roles = serializers.ListField(child=serializers.CharField())
    surfaces = serializers.ListField(child=serializers.CharField())
    fallback_behavior = serializers.CharField()
    explainability_required = serializers.BooleanField()


class AICapabilitySnapshotSerializer(serializers.Serializer):
    provider = serializers.CharField()
    actor_role = serializers.CharField()
    global_enabled = serializers.BooleanField()
    provider_configured = serializers.BooleanField()
    fallback_contract = serializers.JSONField()
    integration_rules = serializers.JSONField()
    features = AIFeatureCapabilitySerializer(many=True)


class AIRecommendationQuerySerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False, min_value=1)
    limit_per_type = serializers.IntegerField(required=False, default=5, min_value=1, max_value=10)


class AILearningGuidanceQuerySerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False, min_value=1)
    course_id = serializers.IntegerField(required=False, min_value=1)
    lesson_id = serializers.IntegerField(required=False, min_value=1)


class AIRecommendationTargetUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    role = serializers.ChoiceField(choices=Role.choices)


class AIPeerRecommendationItemSerializer(serializers.Serializer):
    used_ai = serializers.BooleanField()
    score = serializers.IntegerField()
    rationale = serializers.CharField()
    source_signals = serializers.JSONField()
    match = MatchSuggestionSerializer()


class AISkillReferenceSerializer(serializers.Serializer):
    name = serializers.CharField()
    slug = serializers.CharField()


class AISkillRecommendationItemSerializer(serializers.Serializer):
    used_ai = serializers.BooleanField()
    score = serializers.IntegerField()
    rationale = serializers.CharField()
    source_signals = serializers.JSONField()
    skill = AISkillReferenceSerializer()


class AICourseRecommendationItemSerializer(serializers.Serializer):
    used_ai = serializers.BooleanField()
    score = serializers.IntegerField()
    rationale = serializers.CharField()
    source_signals = serializers.JSONField()
    course = CourseProgramSummarySerializer()


class AIEventRecommendationItemSerializer(serializers.Serializer):
    used_ai = serializers.BooleanField()
    score = serializers.IntegerField()
    rationale = serializers.CharField()
    source_signals = serializers.JSONField()
    event = EventSummarySerializer()


class AIOpportunityRecommendationItemSerializer(serializers.Serializer):
    used_ai = serializers.BooleanField()
    score = serializers.IntegerField()
    rationale = serializers.CharField()
    source_signals = serializers.JSONField()
    opportunity = OpportunitySummarySerializer()


class AIRecommendationFeedSerializer(serializers.Serializer):
    provider = serializers.CharField()
    actor_role = serializers.ChoiceField(choices=Role.choices)
    target_user = AIRecommendationTargetUserSerializer()
    feature_enabled = serializers.BooleanField()
    rollout_state = serializers.ChoiceField(choices=AIRolloutState.choices)
    used_ai = serializers.BooleanField()
    fallback_active = serializers.BooleanField()
    signals = RecommendationSignalsSerializer()
    peer_matches = AIPeerRecommendationItemSerializer(many=True)
    skill_recommendations = AISkillRecommendationItemSerializer(many=True)
    course_recommendations = AICourseRecommendationItemSerializer(many=True)
    event_recommendations = AIEventRecommendationItemSerializer(many=True)
    opportunity_recommendations = AIOpportunityRecommendationItemSerializer(many=True)


class AILearningGuidanceEnrollmentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    status = serializers.CharField()
    progress_percent = serializers.IntegerField()
    completed_lessons = serializers.IntegerField()
    total_lessons = serializers.IntegerField()
    next_lesson_id = serializers.IntegerField(allow_null=True)


class AILearningGuidanceLessonSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    item_type = serializers.ChoiceField(choices=LessonItemType.choices)
    module_title = serializers.CharField(allow_blank=True)
    description = serializers.CharField(allow_blank=True)
    duration_minutes = serializers.IntegerField(allow_null=True)
    is_completed = serializers.BooleanField()


class AISkillGapSerializer(serializers.Serializer):
    skill = serializers.CharField()
    priority = serializers.CharField()
    rationale = serializers.CharField()
    suggested_actions = serializers.ListField(child=serializers.CharField())
    source_signals = serializers.JSONField()
    used_ai = serializers.BooleanField()


class AILearningNextActionSerializer(serializers.Serializer):
    key = serializers.CharField()
    title = serializers.CharField()
    detail = serializers.CharField()
    route = serializers.CharField()
    action_type = serializers.CharField()
    source_signals = serializers.JSONField()
    used_ai = serializers.BooleanField()


class AIAssignmentFeedbackSerializer(serializers.Serializer):
    lesson_id = serializers.IntegerField()
    lesson_title = serializers.CharField()
    item_type = serializers.ChoiceField(choices=LessonItemType.choices)
    readiness = serializers.CharField()
    feedback = serializers.CharField()
    checklist = serializers.ListField(child=serializers.CharField())
    source_signals = serializers.JSONField()
    used_ai = serializers.BooleanField()


class AILearningGuidanceSerializer(serializers.Serializer):
    provider = serializers.CharField()
    actor_role = serializers.ChoiceField(choices=Role.choices)
    target_user = AIRecommendationTargetUserSerializer()
    guidance_feature_enabled = serializers.BooleanField()
    assignment_feedback_enabled = serializers.BooleanField()
    guidance_rollout_state = serializers.ChoiceField(choices=AIRolloutState.choices)
    assignment_feedback_rollout_state = serializers.ChoiceField(choices=AIRolloutState.choices)
    used_ai = serializers.BooleanField()
    fallback_active = serializers.BooleanField()
    course_context = CourseProgramSummarySerializer(allow_null=True)
    enrollment = AILearningGuidanceEnrollmentSerializer(allow_null=True)
    lesson_focus = AILearningGuidanceLessonSerializer(allow_null=True)
    signals = RecommendationSignalsSerializer()
    guidance_summary = serializers.CharField()
    skill_gaps = AISkillGapSerializer(many=True)
    next_actions = AILearningNextActionSerializer(many=True)
    assignment_feedback = AIAssignmentFeedbackSerializer(many=True)


class AICognitiveMonitoringSignalSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    description = serializers.CharField()
    category = serializers.CharField()
    sensitivity = serializers.CharField()


class AICognitiveMonitoringPolicySerializer(serializers.Serializer):
    feature_key = serializers.ChoiceField(choices=AIFeatureKey.choices)
    policy_version = serializers.CharField()
    rollout_state = serializers.ChoiceField(choices=AIRolloutState.choices)
    consent_required = serializers.BooleanField()
    default_active = serializers.BooleanField()
    camera_required = serializers.BooleanField()
    camera_signals_enabled = serializers.BooleanField()
    biometric_inference_allowed = serializers.BooleanField()
    retention_days = serializers.IntegerField()
    surfaces = serializers.ListField(child=serializers.CharField())
    admin_surfaces = serializers.ListField(child=serializers.CharField())
    allowed_signals = AICognitiveMonitoringSignalSerializer(many=True)
    default_signal_keys = serializers.ListField(child=serializers.CharField())
    blocked_signal_keys = serializers.ListField(child=serializers.CharField())
    storage_policy = serializers.CharField()


class AICognitiveMonitoringConsentRecordSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=CognitiveMonitoringConsentStatus.choices)
    policy_version = serializers.CharField()
    allowed_signals = serializers.ListField(child=serializers.CharField())
    surfaces = serializers.ListField(child=serializers.CharField())
    source_surface = serializers.CharField(allow_blank=True)
    disclosure_acknowledged = serializers.BooleanField()
    granted_at = serializers.DateTimeField()
    revoked_at = serializers.DateTimeField(allow_null=True)
    revoked_reason = serializers.CharField(allow_blank=True)
    metadata = serializers.JSONField()


class AICognitiveMonitoringConsentViewSerializer(serializers.Serializer):
    feature_key = serializers.ChoiceField(choices=AIFeatureKey.choices)
    actor_role = serializers.ChoiceField(choices=Role.choices)
    policy = AICognitiveMonitoringPolicySerializer()
    is_consented = serializers.BooleanField()
    monitoring_active = serializers.BooleanField()
    active_consent = AICognitiveMonitoringConsentRecordSerializer(allow_null=True)
    history = AICognitiveMonitoringConsentRecordSerializer(many=True)


class AICognitiveMonitoringConsentUpdateSerializer(serializers.Serializer):
    allowed_signals = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=False,
        max_length=7,
    )
    acknowledged_disclosure = serializers.BooleanField()
    source_surface = serializers.CharField(required=False, allow_blank=True, max_length=64)

    def validate_acknowledged_disclosure(self, value):
        if value is not True:
            raise serializers.ValidationError(
                "Disclosure must be acknowledged before adaptive monitoring is enabled."
            )
        return value


class AICognitiveMonitoringConsentRevokeSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255)


class AICognitiveMonitoringAdminRecordSerializer(
    AICognitiveMonitoringConsentRecordSerializer
):
    user = serializers.JSONField()


class AICognitiveMonitoringAdminSignalCountSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    count = serializers.IntegerField()


class AICognitiveMonitoringAdminSummarySerializer(serializers.Serializer):
    active_consents = serializers.IntegerField()
    revoked_consents = serializers.IntegerField()
    distinct_consented_users = serializers.IntegerField()
    currently_monitored_users = serializers.IntegerField()


class AICognitiveMonitoringAdminOverviewSerializer(serializers.Serializer):
    policy = AICognitiveMonitoringPolicySerializer()
    summary = AICognitiveMonitoringAdminSummarySerializer()
    signal_counts = AICognitiveMonitoringAdminSignalCountSerializer(many=True)
    recent_records = AICognitiveMonitoringAdminRecordSerializer(many=True)


class AIAdaptiveMonitoringStateQuerySerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False, min_value=1)
    course_id = serializers.IntegerField(required=False, min_value=1)
    surface = serializers.CharField(required=False, allow_blank=True, max_length=64)


class AIAdaptiveMonitoringCheckInSerializer(serializers.Serializer):
    course_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    surface = serializers.CharField(required=False, allow_blank=True, max_length=64)
    mood_label = serializers.ChoiceField(
        choices=AdaptiveCheckInMood.choices,
        default=AdaptiveCheckInMood.STEADY,
    )
    focus_level = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=5)
    energy_level = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=5)
    stress_level = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=5)
    reflection_note = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class AIAdaptiveMonitoringTargetUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    role = serializers.ChoiceField(choices=Role.choices)


class AIAdaptiveMonitoringSignalSummarySerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    value = serializers.JSONField()
    explanation = serializers.CharField()
    confidence = serializers.CharField()


class AIAdaptiveFocusDriftSerializer(serializers.Serializer):
    level = serializers.ChoiceField(choices=AdaptiveFocusDriftLevel.choices)
    score = serializers.IntegerField()
    rationale = serializers.CharField()
    source_signal_keys = serializers.ListField(child=serializers.CharField())


class AIAdaptiveMoodMirrorSelfReportSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    mood_label = serializers.ChoiceField(choices=AdaptiveCheckInMood.choices)
    focus_level = serializers.IntegerField(allow_null=True)
    energy_level = serializers.IntegerField(allow_null=True)
    stress_level = serializers.IntegerField(allow_null=True)
    reflection_note = serializers.CharField(allow_blank=True)
    surface = serializers.CharField(allow_blank=True)
    course_id = serializers.IntegerField(allow_null=True)
    created_at = serializers.DateTimeField()


class AIAdaptiveMoodMirrorSerializer(serializers.Serializer):
    state = serializers.CharField()
    label = serializers.CharField()
    confidence = serializers.CharField()
    rationale = serializers.CharField()
    self_report = AIAdaptiveMoodMirrorSelfReportSerializer(allow_null=True)
    source_signal_keys = serializers.ListField(child=serializers.CharField())


class AIAdaptiveResponseSerializer(serializers.Serializer):
    key = serializers.CharField()
    priority = serializers.CharField()
    title = serializers.CharField()
    detail = serializers.CharField()
    action_type = serializers.CharField()
    route = serializers.CharField()
    source_signal_keys = serializers.ListField(child=serializers.CharField())


class AIAdaptiveMonitoringStateSerializer(serializers.Serializer):
    actor_role = serializers.ChoiceField(choices=Role.choices)
    target_user = AIAdaptiveMonitoringTargetUserSerializer()
    policy = AICognitiveMonitoringPolicySerializer()
    monitoring_active = serializers.BooleanField()
    fallback_active = serializers.BooleanField()
    used_ai = serializers.BooleanField()
    surface = serializers.CharField(allow_blank=True)
    active_signal_keys = serializers.ListField(child=serializers.CharField())
    signals = AIAdaptiveMonitoringSignalSummarySerializer(many=True)
    focus_drift = AIAdaptiveFocusDriftSerializer()
    mood_mirror = AIAdaptiveMoodMirrorSerializer()
    adaptive_responses = AIAdaptiveResponseSerializer(many=True)
    generated_at = serializers.DateTimeField()
