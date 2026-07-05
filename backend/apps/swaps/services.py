import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Prefetch, Q
from django.utils import timezone

from apps.accounts.models import RegularUserProfile
from apps.common.email import render_email_html, send_platform_email
from apps.common.enums import MatchSuggestionType, Role, SkillDirection, SkillSwapStatus
from apps.skills.models import UserFieldInterest, UserSkill
from apps.swaps.models import MatchSuggestion, SkillSwapRequest, SkillSwapStatusHistory

User = get_user_model()
logger = logging.getLogger(__name__)


def _serialize_skill(skill):
    return {
        "id": skill.id,
        "name": skill.name,
        "slug": skill.slug,
    }


def _serialize_field(field_interest):
    return {
        "id": field_interest.id,
        "name": field_interest.name,
        "slug": field_interest.slug,
    }


def _sorted_snapshot_values(values_by_id):
    return sorted(values_by_id.values(), key=lambda item: (item["name"], item["id"]))


def _build_skill_buckets(user):
    offered = {}
    requested = {}
    all_skills = {}

    for user_skill in user.user_skills.all():
        skill_data = _serialize_skill(user_skill.skill)
        all_skills[user_skill.skill_id] = skill_data
        if user_skill.direction in (SkillDirection.OFFERING, SkillDirection.BOTH):
            offered[user_skill.skill_id] = skill_data
        if user_skill.direction in (SkillDirection.REQUESTING, SkillDirection.BOTH):
            requested[user_skill.skill_id] = skill_data

    return {
        "offered": offered,
        "requested": requested,
        "all": all_skills,
    }


def _build_field_bucket(user):
    fields = {}
    for user_field in user.field_interest_links.all():
        fields[user_field.field_interest_id] = _serialize_field(user_field.field_interest)
    return fields


def _build_target_profile_summary(user):
    profile = getattr(user, "regular_profile", None)
    return {
        "id": user.id,
        "full_name": user.full_name,
        "bio": getattr(profile, "bio", ""),
        "interests_summary": getattr(profile, "interests_summary", ""),
        "experience_level": getattr(profile, "experience_level", ""),
    }


def _get_frontend_app_url():
    frontend_url = getattr(settings, "FRONTEND_APP_URL", "") or ""
    if frontend_url:
        return frontend_url.rstrip("/")

    cors_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", [])
    if cors_origins:
        return cors_origins[0].rstrip("/")

    return "http://localhost:5173"


def _intersection(primary_bucket, secondary_bucket):
    return {
        item_id: primary_bucket[item_id]
        for item_id in set(primary_bucket).intersection(secondary_bucket)
    }


def _build_rationale(target_user, suggestion_type, can_learn, can_teach, shared_fields, shared_skills):
    target_name = target_user.full_name or "this user"

    if suggestion_type == MatchSuggestionType.DIRECT_SWAP:
        learn_names = ", ".join(item["name"] for item in can_learn.values())
        teach_names = ", ".join(item["name"] for item in can_teach.values())
        return (
            f"You can learn {learn_names} from {target_name} and teach "
            f"{teach_names} in return."
        )

    if suggestion_type == MatchSuggestionType.PARTIAL_OVERLAP:
        overlap_parts = []
        if can_learn:
            overlap_parts.append(
                "they can teach you " + ", ".join(item["name"] for item in can_learn.values())
            )
        if can_teach:
            overlap_parts.append(
                "you can teach them " + ", ".join(item["name"] for item in can_teach.values())
            )
        if shared_fields:
            overlap_parts.append(
                "you share fields like " + ", ".join(item["name"] for item in shared_fields.values())
            )
        return f"{target_name} is a promising partial match because " + " and ".join(overlap_parts) + "."

    shared_field_names = ", ".join(item["name"] for item in shared_fields.values())
    shared_skill_names = ", ".join(item["name"] for item in shared_skills.values())
    return (
        f"{target_name} shares field interests in {shared_field_names} and overlapping skill "
        f"signals like {shared_skill_names}, making them a relevant discovery candidate."
    )


def _build_suggestion_record(source_user, target_user, source_skill_buckets, source_fields):
    target_skill_buckets = _build_skill_buckets(target_user)
    target_fields = _build_field_bucket(target_user)

    can_learn_from_match = _intersection(
        source_skill_buckets["requested"],
        target_skill_buckets["offered"],
    )
    can_teach_match = _intersection(
        source_skill_buckets["offered"],
        target_skill_buckets["requested"],
    )
    shared_skill_interests = _intersection(
        source_skill_buckets["all"],
        target_skill_buckets["all"],
    )
    shared_fields = _intersection(source_fields, target_fields)

    suggestion_type = None
    score = 0

    if can_learn_from_match and can_teach_match:
        suggestion_type = MatchSuggestionType.DIRECT_SWAP
        score = (
            100
            + (len(can_learn_from_match) * 15)
            + (len(can_teach_match) * 15)
            + (len(shared_fields) * 4)
        )
    elif can_learn_from_match or can_teach_match:
        suggestion_type = MatchSuggestionType.PARTIAL_OVERLAP
        score = (
            70
            + (len(can_learn_from_match) * 12)
            + (len(can_teach_match) * 12)
            + (len(shared_fields) * 4)
            + (len(shared_skill_interests) * 2)
        )
    elif shared_fields and shared_skill_interests:
        suggestion_type = MatchSuggestionType.FIELD_RELEVANT
        score = 40 + (len(shared_fields) * 8) + (len(shared_skill_interests) * 4)

    if suggestion_type is None:
        return None

    rationale = _build_rationale(
        target_user=target_user,
        suggestion_type=suggestion_type,
        can_learn=can_learn_from_match,
        can_teach=can_teach_match,
        shared_fields=shared_fields,
        shared_skills=shared_skill_interests,
    )

    return MatchSuggestion(
        source_user=source_user,
        target_user=target_user,
        suggestion_type=suggestion_type,
        score=score,
        rationale=rationale,
        context_snapshot={
            "target_user": _build_target_profile_summary(target_user),
            "can_learn_from_match": _sorted_snapshot_values(can_learn_from_match),
            "can_teach_match": _sorted_snapshot_values(can_teach_match),
            "shared_fields": _sorted_snapshot_values(shared_fields),
            "shared_skill_interests": _sorted_snapshot_values(shared_skill_interests),
            "target_offered_skills": _sorted_snapshot_values(target_skill_buckets["offered"]),
            "target_requested_skills": _sorted_snapshot_values(target_skill_buckets["requested"]),
            "target_field_interests": _sorted_snapshot_values(target_fields),
        },
    )


def refresh_match_suggestions_for_user(user):
    source_user = (
        User.objects.filter(id=user.id, role=Role.REGULAR_USER)
        .prefetch_related(
            Prefetch(
                "user_skills",
                queryset=UserSkill.objects.select_related("skill"),
            ),
            Prefetch(
                "field_interest_links",
                queryset=UserFieldInterest.objects.select_related("field_interest"),
            ),
            "regular_profile",
        )
        .first()
    )
    if source_user is None:
        return MatchSuggestion.objects.none()

    source_skill_buckets = _build_skill_buckets(source_user)
    source_fields = _build_field_bucket(source_user)

    candidates = (
        User.objects.filter(role=Role.REGULAR_USER)
        .exclude(id=source_user.id)
        .filter(user_skills__isnull=False)
        .distinct()
        .prefetch_related(
            Prefetch(
                "user_skills",
                queryset=UserSkill.objects.select_related("skill"),
            ),
            Prefetch(
                "field_interest_links",
                queryset=UserFieldInterest.objects.select_related("field_interest"),
            ),
            "regular_profile",
        )
    )

    suggestions = []
    for candidate in candidates:
        suggestion = _build_suggestion_record(
            source_user=source_user,
            target_user=candidate,
            source_skill_buckets=source_skill_buckets,
            source_fields=source_fields,
        )
        if suggestion is not None:
            suggestions.append(suggestion)

    with transaction.atomic():
        MatchSuggestion.objects.filter(source_user=source_user).delete()
        if suggestions:
            MatchSuggestion.objects.bulk_create(suggestions)

    return MatchSuggestion.objects.filter(source_user=source_user).select_related(
        "target_user",
        "target_user__regular_profile",
    )


def create_swap_status_history(*, swap_request, changed_by, to_status, note="", from_status=""):
    return SkillSwapStatusHistory.objects.create(
        swap_request=swap_request,
        changed_by=changed_by,
        from_status=from_status,
        to_status=to_status,
        note=note,
    )


def send_swap_request_notification_email(swap_request):
    dashboard_url = f"{_get_frontend_app_url()}/dashboard?tab=swaps"
    requester_name = swap_request.requester.full_name or swap_request.requester.email
    recipient_name = swap_request.recipient.full_name or swap_request.recipient.email
    message_preview = (swap_request.message or "").strip()
    html_context = {
        "subject": "New SkillVerse swap request",
        "greeting_name": recipient_name,
        "requester_name": requester_name,
        "message_preview": message_preview,
        "dashboard_url": dashboard_url,
        "free_only_text": "Skill swaps on SkillVerse stay fully free.",
    }

    plain_text_lines = [
        f"Hello {recipient_name},",
        "",
        f"{requester_name} sent you a new skill swap request on SkillVerse.",
    ]
    if message_preview:
        plain_text_lines.extend(["", f'Message: "{message_preview}"'])
    plain_text_lines.extend(
        [
            "",
            "Review it and respond here:",
            dashboard_url,
            "",
            "Skill swaps on SkillVerse stay fully free.",
        ]
    )

    send_platform_email(
        subject=html_context["subject"],
        message="\n".join(plain_text_lines),
        html_message=render_email_html("emails/swap_request_email.html", html_context),
        recipient_list=[swap_request.recipient.email],
        fail_silently=False,
    )


def send_swap_response_notification_email(swap_request):
    dashboard_url = f"{_get_frontend_app_url()}/dashboard?tab=swaps"
    requester_name = swap_request.requester.full_name or swap_request.requester.email
    recipient_name = swap_request.recipient.full_name or swap_request.recipient.email
    response_note = (swap_request.recipient_note or "").strip()

    if swap_request.status == SkillSwapStatus.ACCEPTED:
        subject = "Your SkillVerse swap request was accepted"
        headline = f"{recipient_name} accepted your skill swap request."
    elif swap_request.status == SkillSwapStatus.REJECTED:
        subject = "Your SkillVerse swap request was declined"
        headline = f"{recipient_name} declined your skill swap request."
    else:
        return

    html_context = {
        "subject": subject,
        "greeting_name": requester_name,
        "headline": headline,
        "response_note": response_note,
        "dashboard_url": dashboard_url,
        "free_only_text": "Skill swaps on SkillVerse stay fully free.",
    }

    plain_text_lines = [
        f"Hello {requester_name},",
        "",
        headline,
    ]
    if response_note:
        plain_text_lines.extend(["", f'Response note: "{response_note}"'])
    plain_text_lines.extend(
        [
            "",
            "Review the latest status here:",
            dashboard_url,
            "",
            "Skill swaps on SkillVerse stay fully free.",
        ]
    )

    send_platform_email(
        subject=subject,
        message="\n".join(plain_text_lines),
        html_message=render_email_html("emails/swap_response_email.html", html_context),
        recipient_list=[swap_request.requester.email],
        fail_silently=False,
    )


def notify_swap_request_created(swap_request_id):
    try:
        swap_request = (
            SkillSwapRequest.objects.select_related("requester", "recipient")
            .get(id=swap_request_id)
        )
        send_swap_request_notification_email(swap_request)
    except Exception:
        logger.exception(
            "Failed to send swap request notification email for swap_request_id=%s",
            swap_request_id,
        )


def notify_swap_request_transition(swap_request_id):
    try:
        swap_request = (
            SkillSwapRequest.objects.select_related("requester", "recipient")
            .get(id=swap_request_id)
        )
        send_swap_response_notification_email(swap_request)
    except Exception:
        logger.exception(
            "Failed to send swap response notification email for swap_request_id=%s",
            swap_request_id,
        )


def get_swap_requests_for_user(user):
    return (
        SkillSwapRequest.objects.filter(
            Q(requester=user) | Q(recipient=user)
        )
        .select_related(
            "requester",
            "requester__regular_profile",
            "recipient",
            "recipient__regular_profile",
            "match_suggestion",
        )
        .prefetch_related("status_history__changed_by")
        .order_by("-updated_at", "-id")
    )


def get_active_swap_between_users(user_a, user_b):
    return SkillSwapRequest.objects.filter(
        Q(requester=user_a, recipient=user_b) | Q(requester=user_b, recipient=user_a),
        status__in=[SkillSwapStatus.PENDING, SkillSwapStatus.ACCEPTED],
    ).first()


@transaction.atomic
def create_swap_request(
    *,
    requester,
    recipient,
    message="",
    requester_note="",
    match_suggestion=None,
):
    swap_request = SkillSwapRequest.objects.create(
        requester=requester,
        recipient=recipient,
        match_suggestion=match_suggestion,
        status=SkillSwapStatus.PENDING,
        message=message,
        requester_note=requester_note,
    )
    create_swap_status_history(
        swap_request=swap_request,
        changed_by=requester,
        from_status="",
        to_status=SkillSwapStatus.PENDING,
        note=requester_note or "Swap request created.",
    )
    transaction.on_commit(lambda: notify_swap_request_created(swap_request.id))
    return swap_request


@transaction.atomic
def transition_swap_request(*, swap_request, changed_by, to_status, note=""):
    previous_status = swap_request.status
    swap_request.status = to_status

    if to_status in (SkillSwapStatus.ACCEPTED, SkillSwapStatus.REJECTED):
        swap_request.responded_at = timezone.now()
        swap_request.recipient_note = note
    elif to_status == SkillSwapStatus.CANCELLED:
        swap_request.cancelled_reason = note

    swap_request.save(
        update_fields=[
            "status",
            "responded_at",
            "recipient_note",
            "cancelled_reason",
            "updated_at",
        ]
    )
    create_swap_status_history(
        swap_request=swap_request,
        changed_by=changed_by,
        from_status=previous_status,
        to_status=to_status,
        note=note,
    )
    if to_status in (SkillSwapStatus.ACCEPTED, SkillSwapStatus.REJECTED):
        transaction.on_commit(lambda: notify_swap_request_transition(swap_request.id))
    return swap_request
