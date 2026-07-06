from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.common.enums import LearningSessionStatus, SkillSwapStatus
from apps.sessions.models import LearningSession


def get_learning_sessions_for_user(user):
    return (
        LearningSession.objects.filter(
            Q(swap_request__requester=user) | Q(swap_request__recipient=user)
        )
        .select_related(
            "swap_request",
            "swap_request__requester",
            "swap_request__recipient",
            "swap_request__match_suggestion",
            "created_by",
        )
        .order_by("scheduled_start_at", "id")
    )


def get_learning_session_for_user(*, user, session_id):
    return get_learning_sessions_for_user(user).filter(id=session_id).first()


@transaction.atomic
def create_learning_session(
    *,
    swap_request,
    created_by,
    title,
    description="",
    scheduled_start_at=None,
    scheduled_end_at=None,
    timezone="",
    meeting_url="",
    meeting_notes="",
    location_note="",
    metadata=None,
):
    if swap_request.status != SkillSwapStatus.ACCEPTED:
        raise ValueError("Learning sessions can only be created for accepted swap requests.")

    return LearningSession.objects.create(
        swap_request=swap_request,
        created_by=created_by,
        title=title.strip(),
        description=description,
        scheduled_start_at=scheduled_start_at,
        scheduled_end_at=scheduled_end_at,
        timezone=timezone,
        meeting_url=meeting_url,
        meeting_notes=meeting_notes,
        location_note=location_note,
        metadata=metadata or {},
    )


@transaction.atomic
def update_learning_session(session, updated_by, **changes):
    del updated_by

    for field_name, value in changes.items():
        setattr(session, field_name, value)

    status_value = changes.get("status", session.status)
    update_fields = set(changes.keys())

    if status_value == LearningSessionStatus.COMPLETED:
        if session.completed_at is None:
            session.completed_at = timezone.now()
        session.cancelled_at = None
        update_fields.update({"completed_at", "cancelled_at"})
    elif status_value == LearningSessionStatus.CANCELLED:
        if session.cancelled_at is None:
            session.cancelled_at = timezone.now()
        update_fields.add("cancelled_at")
    else:
        if "status" in changes and status_value != LearningSessionStatus.COMPLETED:
            session.completed_at = None
            update_fields.add("completed_at")
        if "status" in changes and status_value != LearningSessionStatus.CANCELLED:
            session.cancelled_at = None
            update_fields.add("cancelled_at")

    update_fields.add("updated_at")
    session.save(update_fields=list(update_fields))
    return session

