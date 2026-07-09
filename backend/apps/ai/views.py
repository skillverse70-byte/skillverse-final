from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from apps.ai.access import resolve_regular_user_target
from apps.ai.adaptive import build_adaptive_monitoring_state
from apps.ai.guidance import build_regular_user_learning_guidance
from apps.ai.models import AdaptiveMonitoringCheckIn
from apps.ai.monitoring import (
    build_admin_cognitive_monitoring_overview,
    build_cognitive_monitoring_consent_payload,
    get_active_cognitive_monitoring_consent,
    grant_cognitive_monitoring_consent,
    revoke_cognitive_monitoring_consent,
)
from apps.ai.recommendations import build_regular_user_recommendation_feed
from apps.ai.serializers import (
    AICapabilitySnapshotSerializer,
    AICognitiveMonitoringAdminOverviewSerializer,
    AICognitiveMonitoringConsentRevokeSerializer,
    AICognitiveMonitoringConsentUpdateSerializer,
    AICognitiveMonitoringConsentViewSerializer,
    AIAdaptiveMonitoringCheckInSerializer,
    AIAdaptiveMonitoringStateQuerySerializer,
    AIAdaptiveMonitoringStateSerializer,
    AILearningGuidanceQuerySerializer,
    AILearningGuidanceSerializer,
    AIRecommendationFeedSerializer,
    AIRecommendationQuerySerializer,
    AIProviderHealthQuerySerializer,
    AIProviderHealthResponseSerializer,
)
from apps.ai.services import (
    AIProviderConfigurationError,
    AIProviderError,
    build_ai_capability_snapshot,
    get_default_ai_provider,
)
from apps.common.permissions import IsAdminActor
from apps.common.permissions import IsRegularUser, normalize_actor_role
from apps.common.enums import CognitiveMonitoringSignalKey, Role
from apps.courses.models import CourseProgram, Enrollment
from apps.audit.services import record_audit_log


@extend_schema_view(
    get=extend_schema(
        tags=["ai"],
        operation_id="ai_capability_snapshot",
        responses={200: AICapabilitySnapshotSerializer},
    )
)
class AICapabilitySnapshotView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AICapabilitySnapshotSerializer

    def get(self, request):
        payload = build_ai_capability_snapshot(user=request.user)
        return Response(payload, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["ai"],
        operation_id="ai_recommendation_feed",
        parameters=[AIRecommendationQuerySerializer],
        responses={200: AIRecommendationFeedSerializer},
    )
)
class AIRecommendationFeedView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AIRecommendationQuerySerializer

    def get(self, request):
        serializer = self.get_serializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        actor_role = normalize_actor_role(request.user)
        target_user = resolve_regular_user_target(
            request_user=request.user,
            actor_role=actor_role,
            user_id=serializer.validated_data.get("user_id"),
        )
        payload = build_regular_user_recommendation_feed(
            target_user=target_user,
            actor_role=actor_role,
            request=request,
            limit_per_type=serializer.validated_data.get("limit_per_type", 5),
        )
        return Response(payload, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["ai"],
        operation_id="ai_learning_guidance",
        parameters=[AILearningGuidanceQuerySerializer],
        responses={200: AILearningGuidanceSerializer},
    )
)
class AILearningGuidanceView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AILearningGuidanceQuerySerializer

    def get(self, request):
        serializer = self.get_serializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        actor_role = normalize_actor_role(request.user)
        target_user = resolve_regular_user_target(
            request_user=request.user,
            actor_role=actor_role,
            user_id=serializer.validated_data.get("user_id"),
        )
        payload = build_regular_user_learning_guidance(
            target_user=target_user,
            actor_role=actor_role,
            inspector_user=request.user,
            request=request,
            course_id=serializer.validated_data.get("course_id"),
            lesson_id=serializer.validated_data.get("lesson_id"),
        )
        return Response(payload, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["ai", "admin"],
        operation_id="admin_ai_provider_health",
        parameters=[AIProviderHealthQuerySerializer],
        responses={200: AIProviderHealthResponseSerializer},
    )
)
class AdminAIProviderHealthView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = AIProviderHealthQuerySerializer

    def get(self, request):
        serializer = self.get_serializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        mode = serializer.validated_data.get("mode", "config")

        provider = get_default_ai_provider()
        try:
            payload = provider.verify(mode=mode)
            return Response(payload, status=status.HTTP_200_OK)
        except AIProviderConfigurationError as exc:
            return Response(
                {
                    **provider.configuration(),
                    "mode": mode,
                    "healthy": False,
                    "details": {
                        "status": "configuration_error",
                        "message": str(exc),
                    },
                },
                status=status.HTTP_200_OK,
            )
        except AIProviderError as exc:
            return Response(
                {
                    **provider.configuration(),
                    "mode": mode,
                    "healthy": False,
                    "details": {
                        "status": "provider_error",
                        "message": str(exc),
                    },
                },
                status=status.HTTP_200_OK,
            )


@extend_schema_view(
    get=extend_schema(
        tags=["ai"],
        operation_id="ai_cognitive_monitoring_consent_detail",
        responses={200: AICognitiveMonitoringConsentViewSerializer},
    ),
    post=extend_schema(
        tags=["ai"],
        operation_id="ai_cognitive_monitoring_consent_update",
        request=AICognitiveMonitoringConsentUpdateSerializer,
        responses={200: AICognitiveMonitoringConsentViewSerializer},
    ),
)
class AICognitiveMonitoringConsentView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]

    def get(self, request):
        payload = build_cognitive_monitoring_consent_payload(user=request.user)
        serializer = AICognitiveMonitoringConsentViewSerializer(payload)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AICognitiveMonitoringConsentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            grant_cognitive_monitoring_consent(
                user=request.user,
                allowed_signals=serializer.validated_data["allowed_signals"],
                source_surface=serializer.validated_data.get("source_surface", ""),
                metadata={"acknowledged_disclosure": True},
            )
        except ValueError as exc:
            raise ValidationError({"allowed_signals": [str(exc)]}) from exc

        payload = build_cognitive_monitoring_consent_payload(user=request.user)
        response_serializer = AICognitiveMonitoringConsentViewSerializer(payload)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        tags=["ai"],
        operation_id="ai_cognitive_monitoring_consent_revoke",
        request=AICognitiveMonitoringConsentRevokeSerializer,
        responses={200: AICognitiveMonitoringConsentViewSerializer},
    )
)
class AICognitiveMonitoringConsentRevokeView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]

    def post(self, request):
        serializer = AICognitiveMonitoringConsentRevokeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            revoke_cognitive_monitoring_consent(
                user=request.user,
                reason=serializer.validated_data.get("reason", ""),
            )
        except LookupError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        payload = build_cognitive_monitoring_consent_payload(user=request.user)
        response_serializer = AICognitiveMonitoringConsentViewSerializer(payload)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["ai", "admin"],
        operation_id="admin_ai_cognitive_monitoring_overview",
        responses={200: AICognitiveMonitoringAdminOverviewSerializer},
    )
)
class AdminAICognitiveMonitoringOverviewView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]

    def get(self, request):
        payload = build_admin_cognitive_monitoring_overview()
        serializer = AICognitiveMonitoringAdminOverviewSerializer(payload)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["ai"],
        operation_id="ai_adaptive_monitoring_state",
        parameters=[AIAdaptiveMonitoringStateQuerySerializer],
        responses={200: AIAdaptiveMonitoringStateSerializer},
    )
)
class AIAdaptiveMonitoringStateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AIAdaptiveMonitoringStateQuerySerializer

    def get(self, request):
        serializer = self.get_serializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        actor_role = normalize_actor_role(request.user)
        if actor_role not in [Role.REGULAR_USER, Role.ADMIN]:
            raise PermissionDenied("Adaptive monitoring is available to regular users and admins.")

        target_user = resolve_regular_user_target(
            request_user=request.user,
            actor_role=actor_role,
            user_id=serializer.validated_data.get("user_id"),
        )
        payload = build_adaptive_monitoring_state(
            target_user=target_user,
            actor_role=actor_role,
            course_id=serializer.validated_data.get("course_id"),
            surface=serializer.validated_data.get("surface", ""),
        )
        response_serializer = AIAdaptiveMonitoringStateSerializer(payload)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        tags=["ai"],
        operation_id="ai_adaptive_monitoring_check_in",
        request=AIAdaptiveMonitoringCheckInSerializer,
        responses={201: AIAdaptiveMonitoringStateSerializer},
    )
)
class AIAdaptiveMonitoringCheckInView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]
    serializer_class = AIAdaptiveMonitoringCheckInSerializer

    def post(self, request):
        consent = get_active_cognitive_monitoring_consent(request.user)
        if consent is None:
            raise PermissionDenied("Adaptive monitoring check-ins require active consent.")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        consented_signals = set(consent.allowed_signals or [])
        if CognitiveMonitoringSignalKey.SELF_REPORTED_MOOD not in consented_signals:
            raise PermissionDenied("Self-reported mood check-ins are not enabled in active consent.")
        if (
            serializer.validated_data.get("reflection_note")
            and CognitiveMonitoringSignalKey.REFLECTION_CHECKINS not in consented_signals
        ):
            raise PermissionDenied("Reflection check-ins are not enabled in active consent.")

        course = None
        course_id = serializer.validated_data.get("course_id")
        if course_id:
            course = CourseProgram.objects.filter(id=course_id).first()
            if course is None:
                raise NotFound("Course not found.")
            enrolled = Enrollment.objects.filter(
                user=request.user,
                course_program=course,
            ).exists()
            if not enrolled:
                raise PermissionDenied("Course check-ins require an active learner relationship.")

        checkin = AdaptiveMonitoringCheckIn.objects.create(
            user=request.user,
            course_program=course,
            surface=serializer.validated_data.get("surface", ""),
            mood_label=serializer.validated_data["mood_label"],
            focus_level=serializer.validated_data.get("focus_level"),
            energy_level=serializer.validated_data.get("energy_level"),
            stress_level=serializer.validated_data.get("stress_level"),
            reflection_note=serializer.validated_data.get("reflection_note", ""),
            metadata={
                "policy_version": consent.policy_version,
                "allowed_signals_at_submission": consent.allowed_signals,
            },
        )
        record_audit_log(
            actor=request.user,
            action="ai.adaptive_monitoring.check_in_created",
            target_type="adaptive_monitoring_check_in",
            target_id=checkin.id,
            summary="User submitted an adaptive-monitoring check-in.",
            metadata={
                "user_id": request.user.id,
                "course_id": course.id if course else None,
                "surface": checkin.surface,
                "mood_label": checkin.mood_label,
            },
        )
        payload = build_adaptive_monitoring_state(
            target_user=request.user,
            actor_role=Role.REGULAR_USER,
            course_id=course.id if course else None,
            surface=checkin.surface,
        )
        response_serializer = AIAdaptiveMonitoringStateSerializer(payload)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
