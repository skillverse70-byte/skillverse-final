import json

from django.conf import settings
from django.db.models import Prefetch, Q
from rest_framework.exceptions import NotFound, PermissionDenied

from apps.ai.signals import build_recommendation_signals, unique_strings
from apps.ai.services import (
    AIProviderConfigurationError,
    AIProviderError,
    get_ai_feature_rollout_state,
    get_default_ai_provider,
)
from apps.common.enums import (
    AIRolloutState,
    CourseProgramStatus,
    EnrollmentStatus,
    LessonItemType,
    Role,
)
from apps.courses.models import CourseModule, CourseProgram, Enrollment, LessonItem
from apps.courses.serializers import CourseProgramSummarySerializer
from apps.courses.services import calculate_progression_state
from apps.events.models import EventRSVP
from apps.opportunities.models import JobApplication
from apps.sessions.models import LearningSession

ASSIGNMENT_LIKE_TYPES = {
    LessonItemType.ASSIGNMENT,
    LessonItemType.ASSESSMENT,
    LessonItemType.CHECKLIST,
    LessonItemType.QUIZ,
}


def _learner_enrollment_queryset(user):
    return (
        Enrollment.objects.filter(user=user)
        .select_related("course_program", "course_program__organization")
        .prefetch_related(
            "lesson_progresses",
            Prefetch(
                "course_program__modules",
                queryset=CourseModule.objects.prefetch_related("lesson_items"),
            ),
        )
        .order_by("-updated_at", "-id")
    )


def _build_target_user_payload(user):
    return {
        "id": user.id,
        "full_name": user.full_name,
        "role": user.role,
    }


def _build_course_context_payload(course, request):
    if course is None:
        return None
    return CourseProgramSummarySerializer(course, context={"request": request}).data


def _resolve_course_context(*, actor_role, inspector_user, target_user, course_id, selected_enrollment):
    if not course_id:
        return selected_enrollment.course_program if selected_enrollment else None

    if selected_enrollment and selected_enrollment.course_program_id == course_id:
        return selected_enrollment.course_program

    queryset = CourseProgram.objects.select_related("organization", "organization__financial_account").prefetch_related(
        Prefetch("modules", queryset=CourseModule.objects.prefetch_related("lesson_items"))
    )
    course = queryset.filter(id=course_id).first()
    if course is None:
        raise NotFound(detail="Course not found.")

    if actor_role == Role.REGULAR_USER:
        has_enrollment = Enrollment.objects.filter(user=target_user, course_program=course).exists()
        if course.status != CourseProgramStatus.PUBLISHED and not has_enrollment:
            raise NotFound(detail="Course not found.")
        return course

    if actor_role == Role.ORGANIZATION:
        organization = getattr(inspector_user, "organization_profile", None)
        if organization is None:
            raise PermissionDenied(detail="Organization profile is required.")
        if course.organization_id != organization.id:
            raise PermissionDenied(detail="Organizations can only inspect guidance for their own courses.")
        return course

    if actor_role == Role.ADMIN:
        return course

    raise PermissionDenied(detail="This actor cannot access learning guidance.")


def _flatten_course_lessons(course):
    lessons = []
    if course is None:
        return lessons
    for module in course.modules.all():
        module_title = module.title
        for lesson in module.lesson_items.all():
            lesson._ai_module_title = module_title
            lessons.append(lesson)
    return lessons


def _serialize_enrollment_payload(enrollment):
    if enrollment is None:
        return None

    progression_state = calculate_progression_state(enrollment)
    return {
        "id": enrollment.id,
        "status": enrollment.status,
        "progress_percent": int(enrollment.progress_percent or 0),
        "completed_lessons": progression_state["completed_lessons"],
        "total_lessons": progression_state["total_lessons"],
        "next_lesson_id": progression_state["next_lesson_id"],
    }


def _resolve_lesson_focus(*, course, enrollment, lesson_id):
    if course is None:
        return None, {}

    lessons = _flatten_course_lessons(course)
    progress_map = {}
    next_lesson_id = None
    if enrollment is not None:
        progress_map = {
            progress.lesson_item_id: progress
            for progress in enrollment.lesson_progresses.all()
        }
        next_lesson_id = calculate_progression_state(enrollment)["next_lesson_id"]

    selected_lesson = None
    if lesson_id:
        selected_lesson = next((lesson for lesson in lessons if lesson.id == lesson_id), None)
        if selected_lesson is None:
            raise NotFound(detail="Lesson not found for this course.")
    elif next_lesson_id:
        selected_lesson = next((lesson for lesson in lessons if lesson.id == next_lesson_id), None)
    elif lessons:
        selected_lesson = next(
            (lesson for lesson in lessons if not progress_map.get(lesson.id, None) or not progress_map[lesson.id].is_completed),
            lessons[0],
        )

    if selected_lesson is None:
        return None, progress_map

    progress_entry = progress_map.get(selected_lesson.id)
    return (
        {
            "id": selected_lesson.id,
            "title": selected_lesson.title,
            "item_type": selected_lesson.item_type,
            "module_title": getattr(selected_lesson, "_ai_module_title", ""),
            "description": selected_lesson.description,
            "duration_minutes": selected_lesson.duration_minutes,
            "is_completed": bool(progress_entry.is_completed) if progress_entry else False,
        },
        progress_map,
    )


def _build_guidance_summary(*, target_user, course, enrollment, lesson_focus, skill_gaps):
    if course is None:
        if skill_gaps:
            return (
                f"{target_user.full_name or target_user.email} has a few clear growth areas. "
                "Sharpen the top skill gap and enroll in a course to unlock lesson-by-lesson coaching."
            )
        return (
            "Build your learning profile and enroll in a course to unlock personalized guidance, "
            "skill-gap analysis, and assignment prep."
        )

    if enrollment is None:
        return (
            f"{course.title} is a strong match for the learner's current goals. "
            "Enroll to unlock course-specific lesson guidance and assignment prep."
        )

    progress = int(enrollment.progress_percent or 0)
    if enrollment.status == EnrollmentStatus.COMPLETED or progress >= 100:
        return (
            f"{target_user.full_name or target_user.email} has completed {course.title}. "
            "Use the next actions below to reinforce strengths and move into the next challenge."
        )
    if progress < 30:
        return (
            f"{course.title} is still in the foundation-building stage. "
            "Focus on the next lesson, then close the highest-priority gap before jumping ahead."
        )
    if progress < 75:
        return (
            f"Progress in {course.title} is moving well. "
            "Keep momentum by pairing the next lesson with one concrete practice action from the gap analysis."
        )
    if lesson_focus:
        return (
            f"{target_user.full_name or target_user.email} is close to finishing {course.title}. "
            f"Use {lesson_focus['title']} as the final push and tighten up any remaining feedback items."
        )
    return (
        f"{target_user.full_name or target_user.email} is making steady progress in {course.title}. "
        "Stay consistent and turn the current signals into a finished outcome."
    )


def _build_skill_gaps(*, signals, course, lesson_focus):
    offered = {item.lower(): item for item in signals.get("offered_skills", [])}
    learning = unique_strings(signals.get("learning_skills", []))
    course_tags = unique_strings((course.tags if course else []) or [])
    course_category = [course.category] if course and course.category else []
    candidates = unique_strings(learning + course_tags + course_category)

    gaps = []
    for candidate in candidates:
        lowered = candidate.lower()
        if lowered in offered:
            continue

        source_signals = {
            "profile_learning_skill": candidate in learning,
            "course_tag": candidate in course_tags,
            "course_category": candidate in course_category,
            "lesson_focus": lesson_focus["title"] if lesson_focus else "",
        }
        if candidate in learning and candidate in course_tags:
            priority = "high"
            rationale = (
                f"{candidate} appears both in the learner profile and in this course, so closing it should improve confidence quickly."
            )
        elif candidate in learning:
            priority = "high"
            rationale = (
                f"The learner explicitly wants to grow in {candidate}, making it the clearest skill gap to address next."
            )
        elif candidate in course_tags:
            priority = "medium"
            rationale = (
                f"{course.title if course else 'The current course'} leans on {candidate}, so strengthening it will make later lessons easier."
            )
        else:
            priority = "medium"
            rationale = (
                f"{candidate} is part of the current learning path and should be reinforced before the learner moves too far ahead."
            )

        gaps.append(
            {
                "skill": candidate,
                "priority": priority,
                "rationale": rationale,
                "suggested_actions": [
                    f"Review the next lesson in {course.title} with a focus on {candidate}." if course else f"Choose a course or peer activity that practices {candidate}.",
                    f"Add one small practice example that demonstrates {candidate}.",
                ],
                "source_signals": source_signals,
                "used_ai": False,
            }
        )

    if gaps:
        return gaps[:3]

    reinforcement_label = ""
    if course_tags:
        reinforcement_label = course_tags[0]
    elif learning:
        reinforcement_label = learning[0]
    elif signals.get("offered_skills"):
        reinforcement_label = signals["offered_skills"][0]
    elif course and course.category:
        reinforcement_label = course.category
    else:
        reinforcement_label = "your current learning path"

    return [
        {
            "skill": reinforcement_label,
            "priority": "low",
            "rationale": (
                "No major gap stands out from the current signals, so the best next move is to deepen one visible strength and apply it consistently."
            ),
            "suggested_actions": [
                f"Use the next lesson to practice {reinforcement_label}.",
                "Turn one completed activity into a reusable example or note.",
            ],
            "source_signals": {
                "reinforcement_mode": True,
                "course_title": course.title if course else "",
            },
            "used_ai": False,
        }
    ]


def _build_next_actions(*, course, enrollment, lesson_focus, skill_gaps, signals):
    actions = []

    if course and enrollment is None:
        actions.append(
            {
                "key": "enroll-course",
                "title": f"Enroll in {course.title}",
                "detail": "Personalized lesson guidance becomes richer once course progress signals start coming in.",
                "route": f"/courses/{course.id}",
                "action_type": "enroll",
                "source_signals": {"course_id": course.id},
                "used_ai": False,
            }
        )

    if course and lesson_focus:
        actions.append(
            {
                "key": "continue-lesson",
                "title": f"Continue with {lesson_focus['title']}",
                "detail": "Use the current lesson as the main checkpoint before opening a new learning branch.",
                "route": f"/courses/{course.id}",
                "action_type": "lesson",
                "source_signals": {
                    "course_id": course.id,
                    "lesson_id": lesson_focus["id"],
                    "item_type": lesson_focus["item_type"],
                },
                "used_ai": False,
            }
        )

    if skill_gaps:
        primary_gap = skill_gaps[0]
        actions.append(
            {
                "key": "close-gap",
                "title": f"Practice {primary_gap['skill']}",
                "detail": primary_gap["rationale"],
                "route": "/discover",
                "action_type": "skill_gap",
                "source_signals": primary_gap["source_signals"],
                "used_ai": False,
            }
        )

    if not signals.get("learning_skills"):
        actions.append(
            {
                "key": "update-goals",
                "title": "Update your skill portfolio",
                "detail": "Adding specific learning goals will sharpen the next round of guidance and recommendations.",
                "route": "/skill-portfolio",
                "action_type": "profile",
                "source_signals": {"missing_learning_skills": True},
                "used_ai": False,
            }
        )

    if not actions:
        actions.append(
            {
                "key": "browse-courses",
                "title": "Browse another course",
                "detail": "Fresh learning activity will create stronger guidance signals.",
                "route": "/courses",
                "action_type": "browse",
                "source_signals": {"activity_gap": True},
                "used_ai": False,
            }
        )

    return actions[:4]


def _build_assignment_feedback(*, course, lesson_focus, progress_map, signals):
    if course is None:
        return []

    lessons = _flatten_course_lessons(course)
    feedback_items = []
    focus_skills = unique_strings(signals.get("learning_skills", []) + (course.tags or []))

    for lesson in lessons:
        if lesson.item_type not in ASSIGNMENT_LIKE_TYPES:
            continue

        progress_entry = progress_map.get(lesson.id)
        if progress_entry and progress_entry.is_completed:
            readiness = "completed"
            feedback = (
                f"{lesson.title} is already completed. Revisit it only if you want to strengthen clarity, examples, or evidence."
            )
        elif lesson_focus and lesson.id == lesson_focus["id"]:
            readiness = "ready"
            feedback = (
                f"{lesson.title} is the best immediate practice point. Keep the response grounded in one concrete example and one clear takeaway."
            )
        else:
            readiness = "upcoming"
            feedback = (
                f"{lesson.title} is coming up soon. Build context first so the submission feels easier when you reach it."
            )

        checklist = [
            "Show one concrete example instead of only broad claims.",
            "Use the lesson vocabulary or process from the course.",
        ]
        if focus_skills:
            checklist.append(f"Tie the response back to {focus_skills[0]}.")
        if lesson.item_type == LessonItemType.CHECKLIST:
            checklist[0] = "Mark checklist items only after you can point to the actual work completed."
        elif lesson.item_type == LessonItemType.QUIZ:
            checklist[1] = "Answer with the exact concept the quiz is testing before adding extra detail."
        elif lesson.item_type == LessonItemType.ASSESSMENT:
            checklist[1] = "Support each answer with evidence from the course material."

        feedback_items.append(
            {
                "lesson_id": lesson.id,
                "lesson_title": lesson.title,
                "item_type": lesson.item_type,
                "readiness": readiness,
                "feedback": feedback,
                "checklist": checklist[:3],
                "source_signals": {
                    "course_id": course.id,
                    "lesson_type": lesson.item_type,
                    "focus_skill": focus_skills[0] if focus_skills else "",
                },
                "used_ai": False,
            }
        )

    return feedback_items[:3]


def _extract_json_object(text):
    if not text:
        return None

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None


def _apply_ai_guidance_overrides(*, payload, provider):
    skill_gaps = payload.get("skill_gaps", [])
    assignment_feedback = payload.get("assignment_feedback", [])

    completion = provider.create_chat_completion(
        model=settings.OPENROUTER_DEFAULT_MODEL,
        max_tokens=700,
        messages=[
            {
                "role": "system",
                "content": (
                    "You rewrite learning guidance for a skills platform. Keep output concise, supportive, "
                    "actionable, and safe. Return JSON only with keys guidance_summary, skill_gaps, and assignment_feedback."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "guidance_summary": payload.get("guidance_summary", ""),
                        "skill_gaps": [
                            {
                                "skill": item["skill"],
                                "priority": item["priority"],
                                "rationale": item["rationale"],
                                "suggested_actions": item["suggested_actions"],
                            }
                            for item in skill_gaps
                        ],
                        "assignment_feedback": [
                            {
                                "lesson_id": item["lesson_id"],
                                "lesson_title": item["lesson_title"],
                                "item_type": item["item_type"],
                                "readiness": item["readiness"],
                                "feedback": item["feedback"],
                                "checklist": item["checklist"],
                            }
                            for item in assignment_feedback
                        ],
                    },
                    separators=(",", ":"),
                ),
            },
        ],
    )
    choice = ((completion.get("choices") or [{}])[0]).get("message") or {}
    parsed = _extract_json_object(choice.get("content") or "")
    if not isinstance(parsed, dict):
        return False

    used_ai = False
    summary = str(parsed.get("guidance_summary") or "").strip()
    if summary:
        payload["guidance_summary"] = summary
        used_ai = True

    gap_overrides = parsed.get("skill_gaps")
    if isinstance(gap_overrides, list):
        overrides_by_skill = {
            str(item.get("skill") or "").strip().lower(): item
            for item in gap_overrides
            if str(item.get("skill") or "").strip()
        }
        for item in payload["skill_gaps"]:
            override = overrides_by_skill.get(item["skill"].lower())
            if not override:
                continue
            rationale = str(override.get("rationale") or "").strip()
            actions = override.get("suggested_actions")
            priority = str(override.get("priority") or "").strip().lower()
            if rationale:
                item["rationale"] = rationale
                item["used_ai"] = True
                used_ai = True
            if isinstance(actions, list) and actions:
                item["suggested_actions"] = [str(action).strip() for action in actions if str(action).strip()][:3]
                item["used_ai"] = True
                used_ai = True
            if priority in {"high", "medium", "low"}:
                item["priority"] = priority
                item["used_ai"] = True
                used_ai = True

    feedback_overrides = parsed.get("assignment_feedback")
    if isinstance(feedback_overrides, list):
        overrides_by_lesson = {
            int(item["lesson_id"]): item
            for item in feedback_overrides
            if str(item.get("lesson_id") or "").isdigit()
        }
        for item in payload["assignment_feedback"]:
            override = overrides_by_lesson.get(item["lesson_id"])
            if not override:
                continue
            feedback = str(override.get("feedback") or "").strip()
            checklist = override.get("checklist")
            readiness = str(override.get("readiness") or "").strip().lower()
            if feedback:
                item["feedback"] = feedback
                item["used_ai"] = True
                used_ai = True
            if isinstance(checklist, list) and checklist:
                item["checklist"] = [str(entry).strip() for entry in checklist if str(entry).strip()][:3]
                item["used_ai"] = True
                used_ai = True
            if readiness in {"ready", "upcoming", "completed"}:
                item["readiness"] = readiness
                item["used_ai"] = True
                used_ai = True

    return used_ai


def build_regular_user_learning_guidance(
    *,
    target_user,
    actor_role,
    inspector_user,
    request,
    course_id=None,
    lesson_id=None,
):
    provider = get_default_ai_provider()
    configuration = provider.configuration()
    provider_configured = bool(configuration["configured"])
    global_enabled = bool(settings.AI_FEATURES_ENABLED)
    guidance_enabled = bool(settings.AI_LEARNING_GUIDANCE_ENABLED)
    assignment_enabled = bool(settings.AI_ASSIGNMENT_FEEDBACK_ENABLED)

    guidance_rollout_state = get_ai_feature_rollout_state(
        feature_enabled=guidance_enabled,
        provider_configured=provider_configured,
        global_enabled=global_enabled,
    )
    assignment_rollout_state = get_ai_feature_rollout_state(
        feature_enabled=assignment_enabled,
        provider_configured=provider_configured,
        global_enabled=global_enabled,
    )

    enrollments = list(_learner_enrollment_queryset(target_user))
    selected_enrollment = None
    if course_id:
        selected_enrollment = next(
            (item for item in enrollments if item.course_program_id == course_id),
            None,
        )
    else:
        selected_enrollment = next(
            (
                item
                for item in enrollments
                if item.status in {EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING}
            ),
            enrollments[0] if enrollments else None,
        )

    course_context = _resolve_course_context(
        actor_role=actor_role,
        inspector_user=inspector_user,
        target_user=target_user,
        course_id=course_id,
        selected_enrollment=selected_enrollment,
    )
    lesson_focus, progress_map = _resolve_lesson_focus(
        course=course_context,
        enrollment=selected_enrollment,
        lesson_id=lesson_id,
    )

    applications = list(
        JobApplication.objects.filter(user=target_user).select_related("opportunity", "opportunity__organization")
    )
    rsvps = list(EventRSVP.objects.filter(user=target_user).select_related("event", "event__organization"))
    sessions = list(
        LearningSession.objects.filter(
            Q(swap_request__requester=target_user) | Q(swap_request__recipient=target_user)
        ).select_related("swap_request")
    )
    signals = build_recommendation_signals(
        user=target_user,
        enrollments=enrollments,
        applications=applications,
        rsvps=rsvps,
        sessions=sessions,
    )
    skill_gaps = _build_skill_gaps(
        signals=signals,
        course=course_context,
        lesson_focus=lesson_focus,
    )
    guidance_summary = _build_guidance_summary(
        target_user=target_user,
        course=course_context,
        enrollment=selected_enrollment,
        lesson_focus=lesson_focus,
        skill_gaps=skill_gaps,
    )
    next_actions = _build_next_actions(
        course=course_context,
        enrollment=selected_enrollment,
        lesson_focus=lesson_focus,
        skill_gaps=skill_gaps,
        signals=signals,
    )
    assignment_feedback = _build_assignment_feedback(
        course=course_context,
        lesson_focus=lesson_focus,
        progress_map=progress_map,
        signals=signals,
    )

    payload = {
        "provider": configuration["provider"],
        "actor_role": actor_role,
        "target_user": _build_target_user_payload(target_user),
        "guidance_feature_enabled": bool(global_enabled and guidance_enabled),
        "assignment_feedback_enabled": bool(global_enabled and assignment_enabled),
        "guidance_rollout_state": guidance_rollout_state,
        "assignment_feedback_rollout_state": assignment_rollout_state,
        "used_ai": False,
        "fallback_active": True,
        "course_context": _build_course_context_payload(course_context, request),
        "enrollment": _serialize_enrollment_payload(selected_enrollment),
        "lesson_focus": lesson_focus,
        "signals": signals,
        "guidance_summary": guidance_summary,
        "skill_gaps": skill_gaps,
        "next_actions": next_actions,
        "assignment_feedback": assignment_feedback,
    }

    ai_ready = (
        guidance_rollout_state == AIRolloutState.READY
        or assignment_rollout_state == AIRolloutState.READY
    )
    if ai_ready:
        try:
            payload["used_ai"] = _apply_ai_guidance_overrides(
                payload=payload,
                provider=provider,
            )
            payload["fallback_active"] = not payload["used_ai"]
        except (AIProviderConfigurationError, AIProviderError):
            payload["used_ai"] = False
            payload["fallback_active"] = True

    return payload
