from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from apps.ai.models import AdaptiveMonitoringCheckIn
from apps.ai.monitoring import (
    SIGNAL_METADATA,
    get_active_cognitive_monitoring_consent,
    get_cognitive_monitoring_policy,
)
from apps.common.enums import (
    AIRolloutState,
    AdaptiveCheckInMood,
    AdaptiveFocusDriftLevel,
    CognitiveMonitoringSignalKey,
    EnrollmentStatus,
    LessonItemType,
    Role,
)
from apps.courses.models import CourseProgram, Enrollment, EnrollmentLessonProgress, LessonItem
from apps.messaging.models import ThreadMessage
from apps.sessions.models import LearningSession


def _days_since(value, *, now):
    if value is None:
        return None
    return max((now - value).days, 0)


def _signal_allowed(signal_key, allowed_signals):
    return signal_key in allowed_signals


def _signal_summary(signal_key, value, explanation, confidence="medium"):
    metadata = SIGNAL_METADATA.get(signal_key, {})
    return {
        "key": signal_key,
        "label": metadata.get("label", signal_key),
        "value": value,
        "explanation": explanation,
        "confidence": confidence,
    }


def _resolve_course_context(target_user, course_id):
    if not course_id:
        enrollment = (
            Enrollment.objects.filter(
                user=target_user,
                status__in=[EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING],
            )
            .select_related("course_program", "course_program__organization")
            .order_by("-updated_at", "-id")
            .first()
        )
        return enrollment.course_program if enrollment else None, enrollment

    course = CourseProgram.objects.filter(id=course_id).select_related("organization").first()
    if course is None:
        return None, None
    enrollment = Enrollment.objects.filter(user=target_user, course_program=course).first()
    return course, enrollment


def _collect_lesson_progress_signal(*, target_user, enrollment, course, allowed_signals, now):
    if not _signal_allowed(CognitiveMonitoringSignalKey.LESSON_PROGRESS, allowed_signals):
        return None
    if enrollment is None:
        return _signal_summary(
            CognitiveMonitoringSignalKey.LESSON_PROGRESS,
            {"progress_percent": 0, "completed_lessons": 0, "total_lessons": 0},
            "No active enrollment is available for lesson-progress analysis.",
            confidence="low",
        )

    lesson_queryset = LessonItem.objects.filter(module__course_program=enrollment.course_program)
    total_lessons = lesson_queryset.count()
    completed_progresses = EnrollmentLessonProgress.objects.filter(
        enrollment=enrollment,
        is_completed=True,
    )
    completed_lessons = completed_progresses.count()
    latest_completion = completed_progresses.order_by("-completed_at", "-updated_at").first()
    days_since_lesson = _days_since(
        latest_completion.completed_at or latest_completion.updated_at
        if latest_completion
        else enrollment.updated_at,
        now=now,
    )
    return _signal_summary(
        CognitiveMonitoringSignalKey.LESSON_PROGRESS,
        {
            "progress_percent": int(enrollment.progress_percent or 0),
            "completed_lessons": completed_lessons,
            "total_lessons": total_lessons,
            "days_since_lesson_activity": days_since_lesson,
        },
        "Lesson completion and course-progress timing were used.",
    )


def _collect_enrollment_signal(*, target_user, enrollment, allowed_signals, now):
    if not _signal_allowed(CognitiveMonitoringSignalKey.ENROLLMENT_ACTIVITY, allowed_signals):
        return None
    active_enrollments = Enrollment.objects.filter(
        user=target_user,
        status=EnrollmentStatus.ACTIVE,
    )
    days_since_update = _days_since(enrollment.updated_at if enrollment else None, now=now)
    return _signal_summary(
        CognitiveMonitoringSignalKey.ENROLLMENT_ACTIVITY,
        {
            "active_enrollments": active_enrollments.count(),
            "current_enrollment_status": enrollment.status if enrollment else "",
            "days_since_current_enrollment_update": days_since_update,
        },
        "Enrollment status and update cadence were used.",
    )


def _collect_assignment_signal(*, enrollment, allowed_signals):
    if not _signal_allowed(CognitiveMonitoringSignalKey.ASSIGNMENT_ACTIVITY, allowed_signals):
        return None
    if enrollment is None:
        return _signal_summary(
            CognitiveMonitoringSignalKey.ASSIGNMENT_ACTIVITY,
            {"open_practice_items": 0, "completed_practice_items": 0},
            "No enrollment is available for assignment or quiz analysis.",
            confidence="low",
        )

    practice_lessons = LessonItem.objects.filter(
        module__course_program=enrollment.course_program,
        item_type__in=[
            LessonItemType.ASSIGNMENT,
            LessonItemType.QUIZ,
            LessonItemType.ASSESSMENT,
            LessonItemType.CHECKLIST,
        ],
    )
    completed_practice_items = EnrollmentLessonProgress.objects.filter(
        enrollment=enrollment,
        lesson_item__in=practice_lessons,
        is_completed=True,
    ).count()
    total_practice_items = practice_lessons.count()
    return _signal_summary(
        CognitiveMonitoringSignalKey.ASSIGNMENT_ACTIVITY,
        {
            "open_practice_items": max(total_practice_items - completed_practice_items, 0),
            "completed_practice_items": completed_practice_items,
            "total_practice_items": total_practice_items,
        },
        "Practice, quiz, assignment, assessment, and checklist completion were used.",
    )


def _collect_session_signal(*, target_user, allowed_signals, now):
    if not _signal_allowed(CognitiveMonitoringSignalKey.SESSION_ENGAGEMENT, allowed_signals):
        return None
    since = now - timedelta(days=14)
    user_session_filter = Q(swap_request__requester=target_user) | Q(swap_request__recipient=target_user)
    sessions = LearningSession.objects.filter(user_session_filter, scheduled_start_at__gte=since)
    return _signal_summary(
        CognitiveMonitoringSignalKey.SESSION_ENGAGEMENT,
        {
            "recent_sessions": sessions.count(),
            "completed_sessions": sessions.filter(status="completed").count(),
            "upcoming_sessions": sessions.filter(status__in=["planned", "confirmed"]).count(),
        },
        "Recent swap-session scheduling and completion were used.",
    )


def _collect_message_signal(*, target_user, allowed_signals, now):
    if not _signal_allowed(CognitiveMonitoringSignalKey.MESSAGE_RESPONSIVENESS, allowed_signals):
        return None
    since = now - timedelta(days=7)
    sent_count = ThreadMessage.objects.filter(sender=target_user, created_at__gte=since).count()
    thread_filter = Q(thread__swap_request__requester=target_user) | Q(
        thread__swap_request__recipient=target_user
    )
    inbound_count = ThreadMessage.objects.filter(thread_filter, created_at__gte=since).exclude(
        sender=target_user
    ).count()
    return _signal_summary(
        CognitiveMonitoringSignalKey.MESSAGE_RESPONSIVENESS,
        {
            "sent_messages_7d": sent_count,
            "inbound_messages_7d": inbound_count,
        },
        "Only messaging cadence was used; message content was not inspected.",
    )


def _serialize_checkin(checkin):
    if checkin is None:
        return None
    return {
        "id": checkin.id,
        "mood_label": checkin.mood_label,
        "focus_level": checkin.focus_level,
        "energy_level": checkin.energy_level,
        "stress_level": checkin.stress_level,
        "reflection_note": checkin.reflection_note,
        "surface": checkin.surface,
        "course_id": checkin.course_program_id,
        "created_at": checkin.created_at,
    }


def _collect_checkin_signals(*, target_user, course, allowed_signals):
    uses_mood = _signal_allowed(CognitiveMonitoringSignalKey.SELF_REPORTED_MOOD, allowed_signals)
    uses_reflection = _signal_allowed(CognitiveMonitoringSignalKey.REFLECTION_CHECKINS, allowed_signals)
    if not uses_mood and not uses_reflection:
        return [], None

    queryset = AdaptiveMonitoringCheckIn.objects.filter(user=target_user)
    if course is not None:
        queryset = queryset.filter(Q(course_program=course) | Q(course_program__isnull=True))
    latest_checkin = queryset.order_by("-created_at", "-id").first()
    signals = []
    if uses_mood:
        signals.append(
            _signal_summary(
                CognitiveMonitoringSignalKey.SELF_REPORTED_MOOD,
                {
                    "mood_label": latest_checkin.mood_label if latest_checkin else "",
                    "focus_level": latest_checkin.focus_level if latest_checkin else None,
                    "energy_level": latest_checkin.energy_level if latest_checkin else None,
                    "stress_level": latest_checkin.stress_level if latest_checkin else None,
                },
                "Optional self-reported mood, focus, energy, and stress check-ins were used.",
                confidence="high" if latest_checkin else "low",
            )
        )
    if uses_reflection:
        signals.append(
            _signal_summary(
                CognitiveMonitoringSignalKey.REFLECTION_CHECKINS,
                {
                    "has_recent_reflection": bool(latest_checkin and latest_checkin.reflection_note),
                    "reflection_preview": (
                        latest_checkin.reflection_note[:120]
                        if latest_checkin and latest_checkin.reflection_note
                        else ""
                    ),
                },
                "Only explicit learner reflection text was used.",
                confidence="high" if latest_checkin and latest_checkin.reflection_note else "low",
            )
        )
    return signals, latest_checkin


def _signal_value(signals, signal_key):
    for signal in signals:
        if signal["key"] == signal_key:
            return signal["value"]
    return {}


def _build_focus_drift(signals, latest_checkin):
    lesson = _signal_value(signals, CognitiveMonitoringSignalKey.LESSON_PROGRESS)
    enrollment = _signal_value(signals, CognitiveMonitoringSignalKey.ENROLLMENT_ACTIVITY)
    assignment = _signal_value(signals, CognitiveMonitoringSignalKey.ASSIGNMENT_ACTIVITY)
    messages = _signal_value(signals, CognitiveMonitoringSignalKey.MESSAGE_RESPONSIVENESS)
    sessions = _signal_value(signals, CognitiveMonitoringSignalKey.SESSION_ENGAGEMENT)

    score = 15
    rationale = []
    progress = int(lesson.get("progress_percent") or 0)
    days_since_lesson = lesson.get("days_since_lesson_activity")
    days_since_enrollment = enrollment.get("days_since_current_enrollment_update")

    if days_since_lesson is not None and days_since_lesson >= 14:
        score += 28
        rationale.append("lesson activity has been quiet for two weeks")
    elif days_since_lesson is not None and days_since_lesson >= 7:
        score += 16
        rationale.append("lesson activity has slowed this week")

    if days_since_enrollment is not None and days_since_enrollment >= 10:
        score += 14
        rationale.append("course activity has not changed recently")

    if progress < 35 and (days_since_lesson or 0) >= 5:
        score += 12
        rationale.append("progress is still early and recent movement is limited")

    if int(assignment.get("open_practice_items") or 0) >= 2:
        score += 10
        rationale.append("multiple practice checkpoints remain open")

    if int(messages.get("inbound_messages_7d") or 0) > int(messages.get("sent_messages_7d") or 0):
        score += 6
        rationale.append("recent coordination activity may need a response")

    if int(sessions.get("upcoming_sessions") or 0) == 0 and int(sessions.get("recent_sessions") or 0) == 0:
        score += 5
        rationale.append("no recent or upcoming peer session signal is present")

    if latest_checkin:
        if latest_checkin.focus_level is not None and latest_checkin.focus_level <= 2:
            score += 18
            rationale.append("self-reported focus is low")
        if latest_checkin.mood_label in [AdaptiveCheckInMood.DISTRACTED, AdaptiveCheckInMood.STUCK]:
            score += 12
            rationale.append(f"latest check-in says {latest_checkin.mood_label}")
        if latest_checkin.mood_label == AdaptiveCheckInMood.OVERWHELMED:
            score += 18
            rationale.append("latest check-in says overwhelmed")

    score = min(max(score, 0), 100)
    if score >= 70:
        level = AdaptiveFocusDriftLevel.HIGH
    elif score >= 40:
        level = AdaptiveFocusDriftLevel.MEDIUM
    else:
        level = AdaptiveFocusDriftLevel.LOW

    return {
        "level": level,
        "score": score,
        "rationale": "; ".join(rationale) or "current learning signals look steady",
        "source_signal_keys": [signal["key"] for signal in signals],
    }


def _build_mood_mirror(signals, latest_checkin, focus_drift):
    if latest_checkin is None:
        return {
            "state": "not_enough_self_report",
            "label": "No mood check-in yet",
            "confidence": "low",
            "rationale": "Mood mirror output waits for explicit self-reported check-ins.",
            "self_report": None,
            "source_signal_keys": [
                signal["key"]
                for signal in signals
                if signal["key"]
                in [
                    CognitiveMonitoringSignalKey.SELF_REPORTED_MOOD,
                    CognitiveMonitoringSignalKey.REFLECTION_CHECKINS,
                ]
            ],
        }

    if latest_checkin.mood_label in [AdaptiveCheckInMood.ENERGIZED] and (
        latest_checkin.energy_level or 0
    ) >= 4:
        state = "energized"
        label = "High readiness"
    elif latest_checkin.mood_label in [AdaptiveCheckInMood.OVERWHELMED] or (
        latest_checkin.stress_level or 0
    ) >= 4:
        state = "strained"
        label = "High load"
    elif latest_checkin.mood_label in [AdaptiveCheckInMood.STUCK, AdaptiveCheckInMood.DISTRACTED]:
        state = "stuck"
        label = "Needs a reset"
    elif focus_drift["level"] == AdaptiveFocusDriftLevel.HIGH:
        state = "drifting"
        label = "Focus needs support"
    else:
        state = "steady"
        label = "Steady"

    return {
        "state": state,
        "label": label,
        "confidence": "medium",
        "rationale": "This mirror is based on explicit learner check-in values and current focus drift.",
        "self_report": _serialize_checkin(latest_checkin),
        "source_signal_keys": [
            signal["key"]
            for signal in signals
            if signal["key"]
            in [
                CognitiveMonitoringSignalKey.SELF_REPORTED_MOOD,
                CognitiveMonitoringSignalKey.REFLECTION_CHECKINS,
            ]
        ],
    }


def _build_adaptive_responses(*, focus_drift, mood_mirror, course, enrollment):
    route = f"/courses/{course.id}" if course else "/dashboard"
    responses = []

    if focus_drift["level"] == AdaptiveFocusDriftLevel.HIGH:
        responses.append(
            {
                "key": "reset_to_small_step",
                "priority": "high",
                "title": "Restart with one small step",
                "detail": "Return to the next available lesson or practice item and finish a short checkpoint before switching contexts.",
                "action_type": "course_focus",
                "route": route,
                "source_signal_keys": focus_drift["source_signal_keys"],
            }
        )
    elif focus_drift["level"] == AdaptiveFocusDriftLevel.MEDIUM:
        responses.append(
            {
                "key": "continue_learning_block",
                "priority": "medium",
                "title": "Protect a short learning block",
                "detail": "Use the current course context for a focused session and avoid opening unrelated work until one item is complete.",
                "action_type": "timebox",
                "route": route,
                "source_signal_keys": focus_drift["source_signal_keys"],
            }
        )
    else:
        responses.append(
            {
                "key": "maintain_pace",
                "priority": "low",
                "title": "Keep the current pace",
                "detail": "Signals look stable, so the best next action is continuing the current learning path.",
                "action_type": "maintain",
                "route": route,
                "source_signal_keys": focus_drift["source_signal_keys"],
            }
        )

    if mood_mirror["state"] in ["strained", "stuck", "drifting"]:
        responses.append(
            {
                "key": "reflection_or_peer_support",
                "priority": "medium",
                "title": "Add a reflection or ask for support",
                "detail": "Use a short check-in or message a swap partner before forcing more progress.",
                "action_type": "reflection",
                "route": "/messages",
                "source_signal_keys": mood_mirror["source_signal_keys"],
            }
        )

    if enrollment and int(enrollment.progress_percent or 0) >= 80:
        responses.append(
            {
                "key": "finish_course",
                "priority": "medium",
                "title": "Close the course loop",
                "detail": "Progress is near completion, so prioritize final required lessons and certificate readiness.",
                "action_type": "completion",
                "route": route,
                "source_signal_keys": [CognitiveMonitoringSignalKey.LESSON_PROGRESS],
            }
        )

    return responses


def build_adaptive_monitoring_state(*, target_user, actor_role, course_id=None, surface=""):
    policy = get_cognitive_monitoring_policy()
    consent = get_active_cognitive_monitoring_consent(target_user)
    monitoring_active = consent is not None and policy["rollout_state"] != AIRolloutState.DISABLED

    if consent is None:
        return {
            "actor_role": actor_role,
            "target_user": {
                "id": target_user.id,
                "full_name": target_user.full_name,
                "role": target_user.role,
            },
            "policy": policy,
            "monitoring_active": False,
            "fallback_active": True,
            "used_ai": False,
            "surface": surface,
            "active_signal_keys": [],
            "signals": [],
            "focus_drift": {
                "level": AdaptiveFocusDriftLevel.INACTIVE,
                "score": 0,
                "rationale": "Adaptive monitoring requires active consent before signal analysis runs.",
                "source_signal_keys": [],
            },
            "mood_mirror": {
                "state": "inactive",
                "label": "Consent required",
                "confidence": "low",
                "rationale": "Mood mirror output is disabled until consent is granted.",
                "self_report": None,
                "source_signal_keys": [],
            },
            "adaptive_responses": [
                {
                    "key": "review_monitoring_consent",
                    "priority": "low",
                    "title": "Review adaptive monitoring consent",
                    "detail": "Turn on disclosed signals before focus or mood-aware support is generated.",
                    "action_type": "consent",
                    "route": "/dashboard",
                    "source_signal_keys": [],
                }
            ],
            "generated_at": timezone.now(),
        }

    course, enrollment = _resolve_course_context(target_user, course_id)
    now = timezone.now()
    allowed_signals = list(consent.allowed_signals or [])
    signals = [
        _collect_lesson_progress_signal(
            target_user=target_user,
            enrollment=enrollment,
            course=course,
            allowed_signals=allowed_signals,
            now=now,
        ),
        _collect_enrollment_signal(
            target_user=target_user,
            enrollment=enrollment,
            allowed_signals=allowed_signals,
            now=now,
        ),
        _collect_assignment_signal(
            enrollment=enrollment,
            allowed_signals=allowed_signals,
        ),
        _collect_session_signal(
            target_user=target_user,
            allowed_signals=allowed_signals,
            now=now,
        ),
        _collect_message_signal(
            target_user=target_user,
            allowed_signals=allowed_signals,
            now=now,
        ),
    ]
    checkin_signals, latest_checkin = _collect_checkin_signals(
        target_user=target_user,
        course=course,
        allowed_signals=allowed_signals,
    )
    signals = [signal for signal in signals if signal is not None] + checkin_signals
    focus_drift = _build_focus_drift(signals, latest_checkin)
    mood_mirror = _build_mood_mirror(signals, latest_checkin, focus_drift)

    return {
        "actor_role": actor_role,
        "target_user": {
            "id": target_user.id,
            "full_name": target_user.full_name,
            "role": target_user.role,
        },
        "policy": policy,
        "monitoring_active": monitoring_active,
        "fallback_active": policy["rollout_state"] != AIRolloutState.READY,
        "used_ai": False,
        "surface": surface,
        "active_signal_keys": allowed_signals,
        "signals": signals,
        "focus_drift": focus_drift,
        "mood_mirror": mood_mirror,
        "adaptive_responses": _build_adaptive_responses(
            focus_drift=focus_drift,
            mood_mirror=mood_mirror,
            course=course,
            enrollment=enrollment,
        ),
        "generated_at": now,
    }
