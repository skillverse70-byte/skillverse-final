import json
import re
from collections import defaultdict

from django.conf import settings
from django.db.models import Q
from django.utils.text import slugify

from apps.ai.services import (
    AIProviderConfigurationError,
    AIProviderError,
    get_ai_feature_rollout_state,
    get_default_ai_provider,
)
from apps.ai.signals import build_recommendation_signals, unique_strings
from apps.common.enums import AIRolloutState, CourseProgramStatus, EventStatus, OpportunityStatus
from apps.courses.models import CourseProgram, Enrollment
from apps.courses.serializers import CourseProgramSummarySerializer
from apps.events.models import Event, EventRSVP
from apps.events.serializers import EventSummarySerializer, annotate_event_queryset
from apps.opportunities.models import JobApplication, Opportunity
from apps.opportunities.serializers import OpportunitySummarySerializer, annotate_opportunity_queryset
from apps.sessions.models import LearningSession
from apps.swaps.serializers import MatchSuggestionSerializer
from apps.swaps.services import refresh_match_suggestions_for_user


def _normalized_key(value):
    return str(value or "").strip().lower()


def _normalized_set(values):
    return {_normalized_key(value) for value in values if str(value or "").strip()}


def _ensure_list(values):
    if not isinstance(values, list):
        return []
    return unique_strings(values)


def _match_values(candidate_values, signal_values):
    candidate_map = {_normalized_key(value): value for value in candidate_values if str(value or "").strip()}
    return [candidate_map[key] for key in candidate_map if key in signal_values]


def _match_int_values(candidate_values, signal_values):
    matched = []
    for value in candidate_values:
        try:
            normalized = int(value)
        except (TypeError, ValueError):
            continue
        if normalized in signal_values and normalized not in matched:
            matched.append(normalized)
    return matched


def _safe_provider_configuration():
    provider_name = str(getattr(settings, "AI_DEFAULT_PROVIDER", "") or "").strip().lower() or "unknown"
    try:
        provider = get_default_ai_provider()
        configuration = provider.configuration()
        return provider, configuration
    except AIProviderConfigurationError:
        return None, {"provider": provider_name, "configured": False}


def _build_base_context(user):
    enrollments = list(
        Enrollment.objects.filter(user=user)
        .select_related("course_program", "course_program__organization")
        .order_by("-updated_at", "-id")
    )
    applications = list(
        JobApplication.objects.filter(user=user)
        .select_related("opportunity", "opportunity__organization")
        .order_by("-updated_at", "-id")
    )
    rsvps = list(
        EventRSVP.objects.filter(user=user)
        .select_related("event", "event__organization")
        .order_by("-updated_at", "-id")
    )
    sessions = list(
        LearningSession.objects.filter(
            Q(swap_request__requester=user) | Q(swap_request__recipient=user)
        )
        .select_related("swap_request")
        .order_by("scheduled_start_at", "id")
    )
    signals = build_recommendation_signals(
        user=user,
        enrollments=enrollments,
        applications=applications,
        rsvps=rsvps,
        sessions=sessions,
    )
    return {
        "enrollments": enrollments,
        "applications": applications,
        "rsvps": rsvps,
        "sessions": sessions,
        "signals": signals,
    }


def _build_peer_recommendations(*, user, request, limit):
    queryset = refresh_match_suggestions_for_user(user).order_by("-score", "-updated_at", "-id")[:limit]
    serialized = MatchSuggestionSerializer(queryset, many=True, context={"request": request}).data
    return [
        {
            "used_ai": False,
            "score": item["score"],
            "rationale": item["rationale"],
            "source_signals": {
                "can_learn_from_match": [skill["name"] for skill in item.get("can_learn_from_match", [])],
                "can_teach_match": [skill["name"] for skill in item.get("can_teach_match", [])],
                "shared_fields": [field["name"] for field in item.get("shared_fields", [])],
                "shared_skill_interests": [
                    skill["name"] for skill in item.get("shared_skill_interests", [])
                ],
            },
            "match": item,
        }
        for item in serialized
    ]


def _score_course(course, *, signals, enrolled_course_ids):
    if course.id in enrolled_course_ids:
        return None

    field_signal_set = _normalized_set(
        signals["profile_fields"] + signals["event_fields"] + signals["application_fields"]
    )
    skill_signal_set = _normalized_set(signals["offered_skills"] + signals["learning_skills"])
    category_signal_set = _normalized_set(signals["course_categories"] + signals["profile_fields"])

    matched_categories = _match_values([course.category], category_signal_set) if course.category else []
    matched_tags_as_fields = _match_values(_ensure_list(course.tags), field_signal_set)
    matched_tags_as_skills = _match_values(_ensure_list(course.tags), skill_signal_set)

    score = 0
    score += len(matched_categories) * 24
    score += len(matched_tags_as_fields) * 12
    score += len(matched_tags_as_skills) * 16
    if not score:
        return None

    source_signals = {
        "matched_categories": matched_categories,
        "matched_fields": matched_tags_as_fields,
        "matched_skills": matched_tags_as_skills,
    }
    rationale_parts = []
    if matched_categories:
        rationale_parts.append("it lines up with your current learning categories")
    if matched_tags_as_fields:
        rationale_parts.append(
            "its topics match your field signals: " + ", ".join(matched_tags_as_fields[:3])
        )
    if matched_tags_as_skills:
        rationale_parts.append(
            "it reinforces skills you already track: " + ", ".join(matched_tags_as_skills[:3])
        )

    return {
        "used_ai": False,
        "score": score,
        "rationale": "Suggested because " + " and ".join(rationale_parts) + ".",
        "source_signals": source_signals,
        "course_instance": course,
    }


def _score_event(event, *, signals, enrolled_course_ids, existing_event_ids):
    if event.id in existing_event_ids:
        return None

    field_matches = _match_values(
        _ensure_list(event.field_signals),
        _normalized_set(signals["profile_fields"] + signals["event_fields"] + signals["application_fields"]),
    )
    skill_matches = _match_values(
        _ensure_list(event.related_skills),
        _normalized_set(signals["offered_skills"] + signals["learning_skills"]),
    )
    course_matches = _match_int_values(_ensure_list(event.related_course_ids), set(enrolled_course_ids))
    activity_matches = _match_values(
        _ensure_list(event.participation_signals),
        _normalized_set(signals["activity_signals"]),
    )

    score = 0
    score += len(field_matches) * 20
    score += len(skill_matches) * 16
    score += len(course_matches) * 12
    score += len(activity_matches) * 10
    if not score:
        return None

    source_signals = {
        "matched_fields": field_matches,
        "matched_skills": skill_matches,
        "matched_course_ids": course_matches,
        "matched_activity_signals": activity_matches,
    }
    rationale_parts = []
    if field_matches:
        rationale_parts.append("it matches your field interests")
    if skill_matches:
        rationale_parts.append("it is tied to skills you are learning or offering")
    if course_matches:
        rationale_parts.append("it connects to courses you already joined")
    if activity_matches:
        rationale_parts.append("it reflects your recent activity patterns")

    return {
        "used_ai": False,
        "score": score,
        "rationale": "Suggested because " + " and ".join(rationale_parts) + ".",
        "source_signals": source_signals,
        "event_instance": event,
    }


def _score_opportunity(opportunity, *, signals, enrolled_course_ids, applied_opportunity_ids):
    if opportunity.id in applied_opportunity_ids:
        return None

    field_matches = _match_values(
        _ensure_list(opportunity.field_signals),
        _normalized_set(signals["profile_fields"] + signals["event_fields"] + signals["application_fields"]),
    )
    skill_matches = _match_values(
        _ensure_list(opportunity.required_skills),
        _normalized_set(signals["offered_skills"] + signals["learning_skills"]),
    )
    course_matches = _match_int_values(_ensure_list(opportunity.related_course_ids), set(enrolled_course_ids))
    activity_matches = _match_values(
        _ensure_list(opportunity.verified_activity_signals),
        _normalized_set(signals["activity_signals"]),
    )

    score = 0
    score += len(field_matches) * 18
    score += len(skill_matches) * 18
    score += len(course_matches) * 12
    score += len(activity_matches) * 14
    if not score:
        return None

    source_signals = {
        "matched_fields": field_matches,
        "matched_skills": skill_matches,
        "matched_course_ids": course_matches,
        "matched_activity_signals": activity_matches,
    }
    rationale_parts = []
    if field_matches:
        rationale_parts.append("its field signals overlap with your profile and participation")
    if skill_matches:
        rationale_parts.append("it asks for skills you are already building")
    if course_matches:
        rationale_parts.append("it connects to courses you already completed or enrolled in")
    if activity_matches:
        rationale_parts.append("it rewards signals you already showed on the platform")

    return {
        "used_ai": False,
        "score": score,
        "rationale": "Suggested because " + " and ".join(rationale_parts) + ".",
        "source_signals": source_signals,
        "opportunity_instance": opportunity,
    }


def _build_skill_recommendations(*, peer_matches, course_recommendations, event_recommendations, opportunity_recommendations, known_skills, limit):
    scores = defaultdict(int)
    sources = {}

    def add_skill(name, *, weight, source_type, source_value):
        text = str(name or "").strip()
        if not text:
            return
        key = _normalized_key(text)
        if key in known_skills:
            return
        scores[key] += weight
        sources.setdefault(
            key,
            {
                "name": text,
                "source_signals": {
                    "peer_matches": [],
                    "courses": [],
                    "events": [],
                    "opportunities": [],
                },
            },
        )
        bucket = sources[key]["source_signals"].setdefault(source_type, [])
        if source_value not in bucket:
            bucket.append(source_value)

    for peer_item in peer_matches:
        for skill_name in peer_item["source_signals"].get("can_learn_from_match", []):
            add_skill(
                skill_name,
                weight=28,
                source_type="peer_matches",
                source_value=peer_item["match"]["target_user"]["full_name"],
            )

    for course_item in course_recommendations:
        course = course_item["course_instance"]
        for tag in _ensure_list(course.tags):
            add_skill(tag, weight=10, source_type="courses", source_value=course.title)

    for event_item in event_recommendations:
        event = event_item["event_instance"]
        for skill_name in _ensure_list(event.related_skills):
            add_skill(skill_name, weight=16, source_type="events", source_value=event.title)

    for opportunity_item in opportunity_recommendations:
        opportunity = opportunity_item["opportunity_instance"]
        for skill_name in _ensure_list(opportunity.required_skills):
            add_skill(skill_name, weight=20, source_type="opportunities", source_value=opportunity.title)

    recommendations = []
    for key, score in sorted(scores.items(), key=lambda item: (-item[1], sources[item[0]]["name"].lower()))[:limit]:
        source_signals = sources[key]["source_signals"]
        rationale_parts = []
        if source_signals["peer_matches"]:
            rationale_parts.append("people you match with can teach it")
        if source_signals["opportunities"]:
            rationale_parts.append("relevant opportunities request it")
        if source_signals["events"]:
            rationale_parts.append("related events reference it")
        if source_signals["courses"]:
            rationale_parts.append("recommended courses cover it")

        recommendations.append(
            {
                "used_ai": False,
                "score": score,
                "rationale": "Suggested because " + " and ".join(rationale_parts) + ".",
                "source_signals": source_signals,
                "skill": {
                    "name": sources[key]["name"],
                    "slug": slugify(sources[key]["name"]),
                },
            }
        )

    return recommendations


def _serialize_recommendation_items(items, *, serializer_class, instance_key, response_key, request):
    serialized = []
    for item in items:
        instance = item.pop(instance_key)
        item[response_key] = serializer_class(instance, context={"request": request}).data
        serialized.append(item)
    return serialized


def _strip_markdown_fences(text):
    candidate = str(text or "").strip()
    if candidate.startswith("```"):
        candidate = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", candidate)
        candidate = re.sub(r"\s*```$", "", candidate)
    return candidate.strip()


def _extract_json_object(text):
    cleaned = _strip_markdown_fences(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


def _extract_completion_text(payload):
    message = ((payload.get("choices") or [{}])[0]).get("message") or {}
    content = message.get("content", "")
    if isinstance(content, list):
        text_parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                text_parts.append(str(item.get("text") or ""))
        return "\n".join(part for part in text_parts if part).strip()
    return str(content or "").strip()


def _build_ai_rationale_request(payload):
    candidates = {
        "signals": payload["signals"],
        "peer_matches": [
            {
                "id": item["match"]["id"],
                "target_user": item["match"]["target_user"]["full_name"],
                "suggestion_type": item["match"]["suggestion_type"],
                "current_rationale": item["rationale"],
                "source_signals": item["source_signals"],
            }
            for item in payload["peer_matches"]
        ],
        "skill_recommendations": [
            {
                "slug": item["skill"]["slug"],
                "name": item["skill"]["name"],
                "current_rationale": item["rationale"],
                "source_signals": item["source_signals"],
            }
            for item in payload["skill_recommendations"]
        ],
        "course_recommendations": [
            {
                "id": item["course"]["id"],
                "title": item["course"]["title"],
                "current_rationale": item["rationale"],
                "source_signals": item["source_signals"],
            }
            for item in payload["course_recommendations"]
        ],
        "event_recommendations": [
            {
                "id": item["event"]["id"],
                "title": item["event"]["title"],
                "current_rationale": item["rationale"],
                "source_signals": item["source_signals"],
            }
            for item in payload["event_recommendations"]
        ],
        "opportunity_recommendations": [
            {
                "id": item["opportunity"]["id"],
                "title": item["opportunity"]["title"],
                "current_rationale": item["rationale"],
                "source_signals": item["source_signals"],
            }
            for item in payload["opportunity_recommendations"]
        ],
    }
    return json.dumps(candidates, separators=(",", ":"))


def _apply_ai_rationale_overrides(payload, overrides):
    used_ai = False

    def apply_to_collection(collection_name, key_name, value_getter):
        nonlocal used_ai
        category_overrides = overrides.get(collection_name) or {}
        for item in payload[collection_name]:
            key = str(value_getter(item))
            replacement = str(category_overrides.get(key) or "").strip()
            if replacement:
                item["rationale"] = replacement
                item["used_ai"] = True
                used_ai = True

    apply_to_collection("peer_matches", "id", lambda item: item["match"]["id"])
    apply_to_collection("skill_recommendations", "slug", lambda item: item["skill"]["slug"])
    apply_to_collection("course_recommendations", "id", lambda item: item["course"]["id"])
    apply_to_collection("event_recommendations", "id", lambda item: item["event"]["id"])
    apply_to_collection(
        "opportunity_recommendations",
        "id",
        lambda item: item["opportunity"]["id"],
    )
    return used_ai


def _maybe_enhance_with_ai(payload, *, provider, rollout_state):
    if provider is None or rollout_state != AIRolloutState.READY:
        return False
    if not any(
        payload[key]
        for key in (
            "peer_matches",
            "skill_recommendations",
            "course_recommendations",
            "event_recommendations",
            "opportunity_recommendations",
        )
    ):
        return False

    request_payload = _build_ai_rationale_request(payload)
    try:
        completion = provider.create_chat_completion(
            model=settings.OPENROUTER_DEFAULT_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You rewrite recommendation rationales for a learning platform. "
                        "Keep each rationale to one sentence, grounded only in the supplied "
                        "signals, and respond with JSON only."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Return a JSON object with keys peer_matches, skill_recommendations, "
                        "course_recommendations, event_recommendations, and opportunity_recommendations. "
                        "Each value must be an object keyed by the provided id or slug, with a short "
                        "replacement rationale string.\n"
                        + request_payload
                    ),
                },
            ],
            max_tokens=900,
        )
        overrides = _extract_json_object(_extract_completion_text(completion))
    except (AIProviderError, AIProviderConfigurationError, json.JSONDecodeError, KeyError, TypeError, ValueError):
        return False

    return _apply_ai_rationale_overrides(payload, overrides)


def build_regular_user_recommendation_feed(*, target_user, actor_role, request, limit_per_type=5):
    provider, configuration = _safe_provider_configuration()
    context = _build_base_context(target_user)
    signals = context["signals"]
    rollout_state = get_ai_feature_rollout_state(
        feature_enabled=bool(settings.AI_RECOMMENDATIONS_ENABLED),
        provider_configured=bool(configuration.get("configured")),
        global_enabled=bool(settings.AI_FEATURES_ENABLED),
    )

    enrolled_course_ids = [enrollment.course_program_id for enrollment in context["enrollments"]]
    applied_opportunity_ids = [application.opportunity_id for application in context["applications"]]
    existing_event_ids = [rsvp.event_id for rsvp in context["rsvps"]]

    peer_matches = _build_peer_recommendations(
        user=target_user,
        request=request,
        limit=limit_per_type,
    )

    course_candidates = []
    for course in CourseProgram.objects.select_related(
        "organization",
        "organization__financial_account",
    ).filter(
        status=CourseProgramStatus.PUBLISHED,
        organization__is_suspended=False,
    ):
        candidate = _score_course(
            course,
            signals=signals,
            enrolled_course_ids=enrolled_course_ids,
        )
        if candidate is not None:
            course_candidates.append(candidate)
    course_candidates.sort(key=lambda item: (-item["score"], item["course_instance"].title.lower(), item["course_instance"].id))
    course_candidates = course_candidates[:limit_per_type]

    event_candidates = []
    for event in annotate_event_queryset(
        Event.objects.filter(
            status__in=[EventStatus.UPCOMING, EventStatus.LIVE],
            organization__is_suspended=False,
        )
    ):
        candidate = _score_event(
            event,
            signals=signals,
            enrolled_course_ids=enrolled_course_ids,
            existing_event_ids=existing_event_ids,
        )
        if candidate is not None:
            event_candidates.append(candidate)
    event_candidates.sort(key=lambda item: (-item["score"], item["event_instance"].starts_at, item["event_instance"].id))
    event_candidates = event_candidates[:limit_per_type]

    opportunity_candidates = []
    for opportunity in annotate_opportunity_queryset(
        Opportunity.objects.filter(
            status=OpportunityStatus.OPEN,
            organization__is_suspended=False,
        )
    ):
        candidate = _score_opportunity(
            opportunity,
            signals=signals,
            enrolled_course_ids=enrolled_course_ids,
            applied_opportunity_ids=applied_opportunity_ids,
        )
        if candidate is not None:
            opportunity_candidates.append(candidate)
    opportunity_candidates.sort(
        key=lambda item: (-item["score"], item["opportunity_instance"].title.lower(), item["opportunity_instance"].id)
    )
    opportunity_candidates = opportunity_candidates[:limit_per_type]

    skill_recommendations = _build_skill_recommendations(
        peer_matches=peer_matches,
        course_recommendations=course_candidates,
        event_recommendations=event_candidates,
        opportunity_recommendations=opportunity_candidates,
        known_skills=_normalized_set(signals["offered_skills"] + signals["learning_skills"]),
        limit=limit_per_type,
    )

    payload = {
        "provider": configuration.get("provider", "unknown"),
        "actor_role": actor_role,
        "target_user": {
            "id": target_user.id,
            "full_name": target_user.full_name,
            "role": target_user.role,
        },
        "feature_enabled": bool(settings.AI_FEATURES_ENABLED and settings.AI_RECOMMENDATIONS_ENABLED),
        "rollout_state": rollout_state,
        "used_ai": False,
        "fallback_active": True,
        "signals": signals,
        "peer_matches": peer_matches,
        "skill_recommendations": skill_recommendations,
        "course_recommendations": _serialize_recommendation_items(
            course_candidates,
            serializer_class=CourseProgramSummarySerializer,
            instance_key="course_instance",
            response_key="course",
            request=request,
        ),
        "event_recommendations": _serialize_recommendation_items(
            event_candidates,
            serializer_class=EventSummarySerializer,
            instance_key="event_instance",
            response_key="event",
            request=request,
        ),
        "opportunity_recommendations": _serialize_recommendation_items(
            opportunity_candidates,
            serializer_class=OpportunitySummarySerializer,
            instance_key="opportunity_instance",
            response_key="opportunity",
            request=request,
        ),
    }

    payload["used_ai"] = _maybe_enhance_with_ai(
        payload,
        provider=provider,
        rollout_state=rollout_state,
    )
    payload["fallback_active"] = not payload["used_ai"]
    return payload
