from django.conf import settings
from django.utils import timezone

from apps.ai.models import CognitiveMonitoringConsentRecord
from apps.audit.services import record_audit_log
from apps.common.enums import (
    AIRolloutState,
    AIFeatureKey,
    CognitiveMonitoringConsentStatus,
    CognitiveMonitoringSignalKey,
)


SIGNAL_METADATA = {
    CognitiveMonitoringSignalKey.LESSON_PROGRESS: {
        "label": "Lesson progress",
        "description": "Course progress and lesson completion timing.",
        "category": "course",
        "sensitivity": "low",
    },
    CognitiveMonitoringSignalKey.ENROLLMENT_ACTIVITY: {
        "label": "Enrollment activity",
        "description": "Enrollment pace, re-entry cadence, and overall study continuity.",
        "category": "course",
        "sensitivity": "low",
    },
    CognitiveMonitoringSignalKey.ASSIGNMENT_ACTIVITY: {
        "label": "Assignment activity",
        "description": "Assignment and quiz submission timing without reading private content.",
        "category": "course",
        "sensitivity": "medium",
    },
    CognitiveMonitoringSignalKey.SESSION_ENGAGEMENT: {
        "label": "Session engagement",
        "description": "Learning-session attendance and schedule follow-through.",
        "category": "session",
        "sensitivity": "low",
    },
    CognitiveMonitoringSignalKey.MESSAGE_RESPONSIVENESS: {
        "label": "Message responsiveness",
        "description": "Reply delay patterns and missed coordination windows, not message meaning.",
        "category": "messaging",
        "sensitivity": "medium",
    },
    CognitiveMonitoringSignalKey.SELF_REPORTED_MOOD: {
        "label": "Self-reported mood",
        "description": "Optional learner check-ins describing mood or learning readiness.",
        "category": "self_report",
        "sensitivity": "medium",
    },
    CognitiveMonitoringSignalKey.REFLECTION_CHECKINS: {
        "label": "Reflection check-ins",
        "description": "Optional learner reflections captured through explicit check-in prompts.",
        "category": "self_report",
        "sensitivity": "medium",
    },
}


def get_cognitive_monitoring_rollout_state():
    if not settings.AI_FEATURES_ENABLED or not settings.AI_COGNITIVE_MONITORING_ENABLED:
        return AIRolloutState.DISABLED
    return AIRolloutState.READY if settings.OPENROUTER_API_KEY else AIRolloutState.FALLBACK_ONLY


def get_cognitive_monitoring_policy():
    allowed_signal_keys = [
        signal_key
        for signal_key in settings.AI_COGNITIVE_ALLOWED_SIGNALS
        if signal_key in SIGNAL_METADATA
    ]
    default_signal_keys = [
        signal_key
        for signal_key in settings.AI_COGNITIVE_DEFAULT_SIGNALS
        if signal_key in allowed_signal_keys
    ]
    return {
        "feature_key": AIFeatureKey.COGNITIVE_MONITORING,
        "policy_version": settings.AI_COGNITIVE_POLICY_VERSION,
        "rollout_state": get_cognitive_monitoring_rollout_state(),
        "consent_required": True,
        "default_active": False,
        "camera_required": False,
        "camera_signals_enabled": settings.AI_COGNITIVE_CAMERA_SIGNALS_ENABLED,
        "biometric_inference_allowed": False,
        "retention_days": settings.AI_COGNITIVE_RETENTION_DAYS,
        "surfaces": ["/dashboard", "/courses/:id", "/messages"],
        "admin_surfaces": ["/admin"],
        "allowed_signals": [
            {
                "key": signal_key,
                **SIGNAL_METADATA[signal_key],
            }
            for signal_key in allowed_signal_keys
        ],
        "default_signal_keys": default_signal_keys,
        "blocked_signal_keys": [
            "camera_feed",
            "facial_emotion_inference",
            "voice_biometrics",
        ],
        "storage_policy": (
            "Store consent, opt-in signal choices, and minimal derived state instead of "
            "raw biometric or camera data."
        ),
    }


def get_active_cognitive_monitoring_consent(user):
    return (
        CognitiveMonitoringConsentRecord.objects.filter(
            user=user,
            feature_key=AIFeatureKey.COGNITIVE_MONITORING,
            status=CognitiveMonitoringConsentStatus.ACTIVE,
        )
        .order_by("-granted_at", "-id")
        .first()
    )


def _serialize_consent_record(record):
    if record is None:
        return None
    return {
        "id": record.id,
        "status": record.status,
        "policy_version": record.policy_version,
        "allowed_signals": record.allowed_signals,
        "surfaces": record.surfaces,
        "source_surface": record.source_surface,
        "disclosure_acknowledged": record.disclosure_acknowledged,
        "granted_at": record.granted_at,
        "revoked_at": record.revoked_at,
        "revoked_reason": record.revoked_reason,
        "metadata": record.metadata,
    }


def build_cognitive_monitoring_consent_payload(*, user):
    policy = get_cognitive_monitoring_policy()
    active_record = get_active_cognitive_monitoring_consent(user)
    history = list(
        CognitiveMonitoringConsentRecord.objects.filter(
            user=user,
            feature_key=AIFeatureKey.COGNITIVE_MONITORING,
        ).order_by("-granted_at", "-id")[:10]
    )
    return {
        "feature_key": AIFeatureKey.COGNITIVE_MONITORING,
        "actor_role": user.role,
        "policy": policy,
        "is_consented": active_record is not None,
        "monitoring_active": active_record is not None
        and policy["rollout_state"] != AIRolloutState.DISABLED,
        "active_consent": _serialize_consent_record(active_record),
        "history": [_serialize_consent_record(item) for item in history],
    }


def grant_cognitive_monitoring_consent(
    *,
    user,
    allowed_signals,
    source_surface="",
    metadata=None,
):
    policy = get_cognitive_monitoring_policy()
    normalized_signals = list(dict.fromkeys(allowed_signals))
    allowed_signal_keys = {item["key"] for item in policy["allowed_signals"]}
    invalid_signals = sorted(set(normalized_signals) - allowed_signal_keys)
    if invalid_signals:
        raise ValueError("Only permitted cognitive-monitoring signals may be consented to.")

    active_record = get_active_cognitive_monitoring_consent(user)
    if active_record is not None:
        active_record.status = CognitiveMonitoringConsentStatus.REVOKED
        active_record.revoked_at = timezone.now()
        active_record.revoked_reason = "Superseded by a newer consent selection."
        active_record.save(update_fields=["status", "revoked_at", "revoked_reason", "updated_at"])

    record = CognitiveMonitoringConsentRecord.objects.create(
        user=user,
        feature_key=AIFeatureKey.COGNITIVE_MONITORING,
        status=CognitiveMonitoringConsentStatus.ACTIVE,
        policy_version=policy["policy_version"],
        allowed_signals=normalized_signals,
        surfaces=policy["surfaces"],
        source_surface=source_surface,
        disclosure_acknowledged=True,
        metadata=metadata or {},
    )
    record_audit_log(
        actor=user,
        action="ai.cognitive_monitoring.consent_granted",
        target_type="cognitive_monitoring_consent",
        target_id=record.id,
        summary="User granted adaptive-monitoring consent.",
        metadata={
            "user_id": user.id,
            "allowed_signals": normalized_signals,
            "source_surface": source_surface,
            "policy_version": policy["policy_version"],
        },
    )
    return record


def revoke_cognitive_monitoring_consent(*, user, reason=""):
    active_record = get_active_cognitive_monitoring_consent(user)
    if active_record is None:
        raise LookupError("No active adaptive-monitoring consent was found.")

    active_record.status = CognitiveMonitoringConsentStatus.REVOKED
    active_record.revoked_at = timezone.now()
    active_record.revoked_reason = reason.strip()
    active_record.save(update_fields=["status", "revoked_at", "revoked_reason", "updated_at"])
    record_audit_log(
        actor=user,
        action="ai.cognitive_monitoring.consent_revoked",
        target_type="cognitive_monitoring_consent",
        target_id=active_record.id,
        summary="User revoked adaptive-monitoring consent.",
        metadata={
            "user_id": user.id,
            "reason": active_record.revoked_reason,
            "policy_version": active_record.policy_version,
        },
    )
    return active_record


def build_admin_cognitive_monitoring_overview():
    policy = get_cognitive_monitoring_policy()
    queryset = CognitiveMonitoringConsentRecord.objects.select_related("user")
    active_records = queryset.filter(
        feature_key=AIFeatureKey.COGNITIVE_MONITORING,
        status=CognitiveMonitoringConsentStatus.ACTIVE,
    )
    revoked_records = queryset.filter(
        feature_key=AIFeatureKey.COGNITIVE_MONITORING,
        status=CognitiveMonitoringConsentStatus.REVOKED,
    )
    signal_counts = (
        active_records.values_list("allowed_signals", flat=True)
    )
    flattened_signal_counts = {}
    for signal_list in signal_counts:
        for signal_key in signal_list or []:
            flattened_signal_counts[signal_key] = flattened_signal_counts.get(signal_key, 0) + 1

    recent_records = []
    for record in queryset.filter(feature_key=AIFeatureKey.COGNITIVE_MONITORING)[:20]:
        recent_records.append(
            {
                **_serialize_consent_record(record),
                "user": {
                    "id": record.user_id,
                    "full_name": record.user.full_name,
                    "email": record.user.email,
                    "role": record.user.role,
                },
            }
        )

    return {
        "policy": policy,
        "summary": {
            "active_consents": active_records.count(),
            "revoked_consents": revoked_records.count(),
            "distinct_consented_users": queryset.filter(
                feature_key=AIFeatureKey.COGNITIVE_MONITORING
            )
            .values("user_id")
            .distinct()
            .count(),
            "currently_monitored_users": active_records.count()
            if policy["rollout_state"] != AIRolloutState.DISABLED
            else 0,
        },
        "signal_counts": [
            {
                "key": signal_key,
                "count": flattened_signal_counts.get(signal_key, 0),
                "label": SIGNAL_METADATA.get(signal_key, {}).get("label", signal_key),
            }
            for signal_key in [item["key"] for item in policy["allowed_signals"]]
        ],
        "recent_records": recent_records,
    }
