from collections import Counter
from datetime import timedelta

from django.conf import settings
from django.db.models import Avg, Q
from django.utils import timezone

from apps.ai.contracts import AI_FEATURE_CATALOG
from apps.ai.models import AdaptiveMonitoringCheckIn
from apps.ai.monitoring import build_admin_cognitive_monitoring_overview
from apps.ai.services import (
    AIProviderConfigurationError,
    get_ai_feature_rollout_state,
    get_default_ai_provider,
)
from apps.common.enums import (
    AdaptiveCheckInMood,
    CourseProgramStatus,
    EventStatus,
    JobApplicationStatus,
    OpportunityStatus,
    RSVPStatus,
    SkillDirection,
    SkillSwapStatus,
)
from apps.certificates.models import Certificate, ServiceCreditRecord
from apps.courses.models import CourseProgram, Enrollment
from apps.events.models import Event, EventRSVP
from apps.opportunities.models import JobApplication, Opportunity
from apps.sessions.models import LearningSession
from apps.skills.models import UserFieldInterest, UserSkill
from apps.swaps.models import MatchSuggestion, SkillSwapRequest


def _percent(numerator, denominator):
    if not denominator:
        return 0.0
    return round((float(numerator) / float(denominator)) * 100, 1)


def _string_count_items(values, *, top=5):
    counter = Counter(str(value).strip() for value in values if str(value or "").strip())
    return [
        {"key": key, "label": key, "count": count}
        for key, count in sorted(counter.items(), key=lambda item: (-item[1], item[0].lower()))[:top]
    ]


def _choice_count_items(values, choices, *, top=None):
    label_map = dict(choices)
    counter = Counter(value for value in values if value in label_map)
    items = [
        {"key": key, "label": label_map[key], "count": counter.get(key, 0)}
        for key in label_map
        if counter.get(key, 0) > 0
    ]
    items.sort(key=lambda item: (-item["count"], item["label"].lower()))
    return items[:top] if top is not None else items


def _progress_band_items(progress_values):
    bands = [
        ("not_started", "0-24%", lambda value: value < 25),
        ("building", "25-49%", lambda value: 25 <= value < 50),
        ("advancing", "50-74%", lambda value: 50 <= value < 75),
        ("near_completion", "75-99%", lambda value: 75 <= value < 100),
        ("completed", "100%", lambda value: value >= 100),
    ]
    return [
        {
            "key": key,
            "label": label,
            "count": sum(1 for value in progress_values if predicate(int(value or 0))),
        }
        for key, label, predicate in bands
    ]


def _build_heatmap_items(items):
    counter = Counter()
    labels = {}
    for location, source_type in items:
        normalized = str(location or "").strip()
        if not normalized:
            continue
        key = (normalized.lower(), source_type)
        labels[key] = normalized
        counter[key] += 1

    payload = [
        {
            "location": labels[(normalized, source_type)],
            "source_type": source_type,
            "count": count,
        }
        for (normalized, source_type), count in counter.items()
    ]
    payload.sort(key=lambda item: (-item["count"], item["location"].lower(), item["source_type"]))
    return payload[:12]


def _resolve_service_credit_location(record):
    if record.event and record.event.location:
        return record.event.location
    if record.organization and record.organization.location:
        return record.organization.location
    return ""


def _resolve_certificate_location(certificate):
    if certificate.event and certificate.event.location:
        return certificate.event.location
    if certificate.organization and certificate.organization.location:
        return certificate.organization.location
    return ""


def _safe_ai_provider_configuration():
    provider_name = str(getattr(settings, "AI_DEFAULT_PROVIDER", "") or "").strip().lower() or "unknown"
    try:
        provider = get_default_ai_provider()
        configuration = provider.configuration()
    except AIProviderConfigurationError:
        configuration = {
            "provider": provider_name,
            "configured": False,
            "healthy": False,
            "default_model": "",
            "base_url": "",
            "timeout_seconds": 0,
        }
    return {
        "provider": configuration.get("provider", provider_name),
        "configured": bool(configuration.get("configured")),
        "healthy": bool(configuration.get("healthy")),
        "default_model": configuration.get("default_model", ""),
        "base_url": configuration.get("base_url", ""),
        "timeout_seconds": int(configuration.get("timeout_seconds") or 0),
    }


def _build_ai_feature_rollouts():
    configuration = _safe_ai_provider_configuration()
    provider_configured = configuration["configured"]
    global_enabled = bool(settings.AI_FEATURES_ENABLED)
    items = []
    for feature_key, feature_config in AI_FEATURE_CATALOG.items():
        feature_enabled = bool(getattr(settings, feature_config["setting"], False))
        rollout_state = get_ai_feature_rollout_state(
            feature_enabled=feature_enabled,
            provider_configured=provider_configured,
            global_enabled=global_enabled,
        )
        items.append(
            {
                "key": feature_key,
                "label": feature_config["label"],
                "enabled": feature_enabled,
                "rollout_state": rollout_state,
                "actor_roles": list(feature_config["actor_roles"]),
                "surfaces": list(feature_config["surfaces"]),
            }
        )
    return items


def _build_system_health_snapshot():
    recent_since = timezone.now() - timedelta(days=7)
    feature_rollouts = _build_ai_feature_rollouts()
    rollout_state_counts = Counter(item["rollout_state"] for item in feature_rollouts)
    return {
        "provider": _safe_ai_provider_configuration(),
        "feature_rollouts": feature_rollouts,
        "ready_features": rollout_state_counts.get("ready", 0),
        "fallback_only_features": rollout_state_counts.get("fallback_only", 0),
        "disabled_features": rollout_state_counts.get("disabled", 0),
        "recent_match_suggestions_7d": MatchSuggestion.objects.filter(
            updated_at__gte=recent_since
        ).count(),
        "recent_checkins_7d": AdaptiveMonitoringCheckIn.objects.filter(
            created_at__gte=recent_since
        ).count(),
        "recent_enrollments_7d": Enrollment.objects.filter(enrolled_at__gte=recent_since).count(),
        "recent_rsvps_7d": EventRSVP.objects.filter(created_at__gte=recent_since).count(),
        "recent_applications_7d": JobApplication.objects.filter(
            applied_at__gte=recent_since
        ).count(),
    }


def _build_insight_card(*, key, severity, title, description, route):
    return {
        "key": key,
        "severity": severity,
        "title": title,
        "description": description,
        "route": route,
    }


def build_organization_analytics(*, organization, courses, enrollments, events, opportunities, applications):
    event_rsvps = list(
        EventRSVP.objects.filter(event__organization=organization)
        .select_related("user", "event")
        .order_by("-updated_at", "-id")
    )
    service_credits = list(
        ServiceCreditRecord.objects.filter(organization=organization)
        .select_related("organization", "event", "course_program", "user")
    )
    certificates = list(
        Certificate.objects.filter(organization=organization)
        .select_related("organization", "event", "course_program", "user")
    )

    learner_ids = {
        *[item.user_id for item in enrollments],
        *[item.user_id for item in applications],
        *[item.user_id for item in event_rsvps],
    }
    learner_ids.discard(None)

    field_links = list(
        UserFieldInterest.objects.filter(user_id__in=learner_ids)
        .select_related("field_interest")
    )
    user_skills = list(
        UserSkill.objects.filter(user_id__in=learner_ids).select_related("skill")
    )
    learner_with_fields = {item.user_id for item in field_links}
    learner_with_skills = {item.user_id for item in user_skills}

    related_matches = list(
        MatchSuggestion.objects.filter(source_user_id__in=learner_ids)
    )
    related_swaps = list(
        SkillSwapRequest.objects.filter(match_suggestion__source_user_id__in=learner_ids).select_related(
            "match_suggestion"
        )
    )

    opportunity_status_counts = _choice_count_items(
        [item.status for item in applications],
        JobApplicationStatus.choices,
    )
    rsvp_status_counts = _choice_count_items(
        [item.status for item in event_rsvps],
        RSVPStatus.choices,
    )

    heatmap_items = _build_heatmap_items(
        [(item.location, "event") for item in events]
        + [(item.location, "opportunity") for item in opportunities]
        + [(_resolve_service_credit_location(item), "service_credit") for item in service_credits]
        + [(_resolve_certificate_location(item), "certificate") for item in certificates]
    )

    average_match_score = (
        round(
            sum(item.score for item in related_matches) / len(related_matches),
            1,
        )
        if related_matches
        else 0.0
    )
    accepted_swaps = sum(1 for item in related_swaps if item.status == SkillSwapStatus.ACCEPTED)
    readiness_numerator = len(learner_with_fields & learner_with_skills)

    insight_cards = []
    low_progress_count = sum(1 for item in enrollments if int(item.progress_percent or 0) < 25)
    if low_progress_count:
        insight_cards.append(
            _build_insight_card(
                key="low_progress_learners",
                severity="warning",
                title="Learner progress needs attention",
                description=(
                    f"{low_progress_count} enrolled learners are still below 25% progress. "
                    "A learner-support or follow-up review may help."
                ),
                route="/org?tab=learners",
            )
        )
    if applications and not any(item.status == JobApplicationStatus.HIRED for item in applications):
        insight_cards.append(
            _build_insight_card(
                key="open_pipeline_without_hires",
                severity="info",
                title="Applicant pipeline is active but not closed",
                description=(
                    "There are active applications, but none have reached a hired state yet."
                ),
                route="/org?tab=jobs",
            )
        )
    attendance_rate = _percent(
        sum(1 for item in event_rsvps if item.attended_at is not None),
        len(event_rsvps),
    )
    if event_rsvps and attendance_rate < 50:
        insight_cards.append(
            _build_insight_card(
                key="low_event_attendance",
                severity="warning",
                title="Event attendance is lagging behind RSVPs",
                description=(
                    f"Attendance is currently {attendance_rate}% across your event RSVPs."
                ),
                route="/org?tab=events",
            )
        )

    return {
        "summary": {
            "managed_learners": len(learner_ids),
            "active_courses": sum(
                1 for item in courses if item.status == CourseProgramStatus.PUBLISHED
            ),
            "active_events": sum(
                1 for item in events if item.status in [EventStatus.UPCOMING, EventStatus.LIVE]
            ),
            "open_opportunities": sum(
                1 for item in opportunities if item.status == OpportunityStatus.OPEN
            ),
            "issued_certificates": len(certificates),
            "service_credit_records": len(service_credits),
        },
        "course_category_distribution": _string_count_items(
            [item.category for item in courses if item.category]
        ),
        "learner_progress_bands": _progress_band_items(
            [int(item.progress_percent or 0) for item in enrollments]
        ),
        "event_engagement": {
            "rsvp_status_distribution": rsvp_status_counts,
            "format_distribution": [
                {
                    "key": key,
                    "label": label,
                    "count": count,
                }
                for key, label, count in [
                    (
                        "online",
                        "Online",
                        sum(1 for item in events if item.is_online),
                    ),
                    (
                        "in_person",
                        "In person",
                        sum(1 for item in events if not item.is_online),
                    ),
                ]
                if count > 0
            ],
            "attendance_rate_percent": attendance_rate,
        },
        "opportunity_pipeline": {
            "application_status_distribution": opportunity_status_counts,
            "shortlisted_rate_percent": _percent(
                sum(
                    1
                    for item in applications
                    if item.status in [JobApplicationStatus.SHORTLISTED, JobApplicationStatus.INTERVIEW, JobApplicationStatus.HIRED]
                ),
                len(applications),
            ),
            "hired_rate_percent": _percent(
                sum(1 for item in applications if item.status == JobApplicationStatus.HIRED),
                len(applications),
            ),
        },
        "knowledge_trends": {
            "top_fields": _string_count_items(item.field_interest.name for item in field_links),
            "top_offered_skills": _string_count_items(
                item.skill.name
                for item in user_skills
                if item.direction in [SkillDirection.OFFERING, SkillDirection.BOTH]
            ),
            "top_learning_skills": _string_count_items(
                item.skill.name
                for item in user_skills
                if item.direction in [SkillDirection.REQUESTING, SkillDirection.BOTH]
            ),
            "top_course_categories": _string_count_items(
                [item.category for item in courses if item.category]
            ),
            "top_event_categories": _string_count_items(
                [item.category for item in events if item.category]
            ),
            "top_opportunity_categories": _string_count_items(
                [item.category for item in opportunities if item.category]
            ),
        },
        "social_impact_heatmap": heatmap_items,
        "matching_quality": {
            "learners_with_profile_fields": len(learner_with_fields),
            "learners_with_skill_signals": len(learner_with_skills),
            "learners_with_peer_matches": len({item.source_user_id for item in related_matches}),
            "average_peer_match_score": average_match_score,
            "accepted_peer_swaps": accepted_swaps,
            "recommendation_ready_percent": _percent(readiness_numerator, len(learner_ids)),
        },
        "system_health": {
            **_build_system_health_snapshot(),
            "verification_status": organization.verification_status,
            "financial_account_status": getattr(
                getattr(organization, "financial_account", None),
                "status",
                "not_started",
            ),
        },
        "insight_cards": insight_cards,
    }


def build_admin_analytics():
    monitoring_overview = build_admin_cognitive_monitoring_overview()
    checkins = list(AdaptiveMonitoringCheckIn.objects.select_related("user", "course_program"))
    match_suggestions = list(MatchSuggestion.objects.select_related("source_user", "target_user"))
    suggestion_ids = [item.id for item in match_suggestions]
    swaps_from_suggestions = list(
        SkillSwapRequest.objects.filter(match_suggestion_id__in=suggestion_ids).select_related(
            "match_suggestion"
        )
    )
    sessions = list(LearningSession.objects.select_related("swap_request"))
    service_credits = list(
        ServiceCreditRecord.objects.select_related("organization", "event", "course_program", "user")
    )
    certificates = list(
        Certificate.objects.select_related("organization", "event", "course_program", "user")
    )

    insight_cards = []
    system_health = _build_system_health_snapshot()
    if system_health["fallback_only_features"] > 0:
        insight_cards.append(
            _build_insight_card(
                key="ai_fallback_only",
                severity="warning",
                title="Some AI features are in fallback-only mode",
                description=(
                    f"{system_health['fallback_only_features']} AI features are enabled without a fully configured provider."
                ),
                route="/admin?tab=overview",
            )
        )
    pending_verification_count = sum(
        1
        for item in monitoring_overview.get("recent_records", [])
        if item.get("status") == "active"
    )
    if pending_verification_count == 0 and settings.AI_COGNITIVE_MONITORING_ENABLED:
        insight_cards.append(
            _build_insight_card(
                key="no_active_monitoring_consents",
                severity="info",
                title="Adaptive monitoring has no active consents",
                description="The adaptive-monitoring feature is enabled, but no users are currently opted in.",
                route="/admin?tab=overview",
            )
        )

    applied_swap_count = len(swaps_from_suggestions)
    accepted_swap_count = sum(
        1 for item in swaps_from_suggestions if item.status == SkillSwapStatus.ACCEPTED
    )
    average_match_score = (
        round(sum(item.score for item in match_suggestions) / len(match_suggestions), 1)
        if match_suggestions
        else 0.0
    )

    event_locations = list(Event.objects.values_list("location", flat=True))
    opportunity_locations = list(Opportunity.objects.values_list("location", flat=True))

    return {
        "summary": {
            "total_match_suggestions": len(match_suggestions),
            "total_adaptive_checkins": len(checkins),
            "issued_certificates": len(certificates),
            "service_credit_records": len(service_credits),
            "tracked_sessions": len(sessions),
        },
        "matching_quality": {
            "total_match_suggestions": len(match_suggestions),
            "average_match_score": average_match_score,
            "high_confidence_matches": sum(1 for item in match_suggestions if item.score >= 80),
            "suggestions_backed_by_requests": applied_swap_count,
            "accepted_swaps_from_suggestions": accepted_swap_count,
            "accepted_swap_conversion_percent": _percent(
                accepted_swap_count,
                applied_swap_count,
            ),
            "score_distribution": [
                {
                    "key": "under_50",
                    "label": "Under 50",
                    "count": sum(1 for item in match_suggestions if item.score < 50),
                },
                {
                    "key": "50_to_69",
                    "label": "50-69",
                    "count": sum(1 for item in match_suggestions if 50 <= item.score < 70),
                },
                {
                    "key": "70_to_84",
                    "label": "70-84",
                    "count": sum(1 for item in match_suggestions if 70 <= item.score < 85),
                },
                {
                    "key": "85_plus",
                    "label": "85+",
                    "count": sum(1 for item in match_suggestions if item.score >= 85),
                },
            ],
        },
        "adaptive_monitoring": {
            "summary": monitoring_overview["summary"],
            "signal_counts": monitoring_overview["signal_counts"],
            "mood_distribution": _choice_count_items(
                [item.mood_label for item in checkins],
                AdaptiveCheckInMood.choices,
            ),
            "surface_distribution": _string_count_items(item.surface for item in checkins),
            "average_focus_level": round(
                float(
                    AdaptiveMonitoringCheckIn.objects.exclude(focus_level__isnull=True).aggregate(
                        value=Avg("focus_level")
                    )["value"]
                    or 0
                ),
                1,
            ),
            "average_energy_level": round(
                float(
                    AdaptiveMonitoringCheckIn.objects.exclude(energy_level__isnull=True).aggregate(
                        value=Avg("energy_level")
                    )["value"]
                    or 0
                ),
                1,
            ),
            "average_stress_level": round(
                float(
                    AdaptiveMonitoringCheckIn.objects.exclude(stress_level__isnull=True).aggregate(
                        value=Avg("stress_level")
                    )["value"]
                    or 0
                ),
                1,
            ),
            "recent_checkins_7d": system_health["recent_checkins_7d"],
        },
        "system_health": system_health,
        "session_coordination_analytics": {
            "delivery_mode": "external_link_or_manual",
            "total_sessions": len(sessions),
            "planned_sessions": sum(1 for item in sessions if item.status == "planned"),
            "confirmed_sessions": sum(1 for item in sessions if item.status == "confirmed"),
            "completed_sessions": sum(1 for item in sessions if item.status == "completed"),
            "sessions_with_meeting_links": sum(1 for item in sessions if item.meeting_url),
            "meeting_link_usage_percent": _percent(
                sum(1 for item in sessions if item.meeting_url),
                len(sessions),
            ),
        },
        "global_knowledge_trends": {
            "top_fields": _string_count_items(
                UserFieldInterest.objects.select_related("field_interest").values_list(
                    "field_interest__name",
                    flat=True,
                )
            ),
            "top_offered_skills": _string_count_items(
                UserSkill.objects.filter(
                    direction__in=[SkillDirection.OFFERING, SkillDirection.BOTH]
                )
                .select_related("skill")
                .values_list("skill__name", flat=True)
            ),
            "top_learning_skills": _string_count_items(
                UserSkill.objects.filter(
                    direction__in=[SkillDirection.REQUESTING, SkillDirection.BOTH]
                )
                .select_related("skill")
                .values_list("skill__name", flat=True)
            ),
            "top_course_categories": _string_count_items(
                CourseProgram.objects.filter(status=CourseProgramStatus.PUBLISHED).values_list(
                    "category",
                    flat=True,
                )
            ),
            "top_event_categories": _string_count_items(
                Event.objects.values_list("category", flat=True)
            ),
            "top_opportunity_categories": _string_count_items(
                Opportunity.objects.values_list("category", flat=True)
            ),
        },
        "social_impact_heatmap": _build_heatmap_items(
            [(item, "event") for item in event_locations]
            + [(item, "opportunity") for item in opportunity_locations]
            + [(_resolve_service_credit_location(item), "service_credit") for item in service_credits]
            + [(_resolve_certificate_location(item), "certificate") for item in certificates]
        ),
        "insight_cards": insight_cards,
    }
