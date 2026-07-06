from django.db import transaction
from django.db.models import Q

from apps.common.enums import SkillSwapStatus
from apps.messaging.models import MessageThread, ThreadMessage


def get_message_threads_for_user(user):
    return (
        MessageThread.objects.filter(
            Q(swap_request__requester=user) | Q(swap_request__recipient=user)
        )
        .select_related(
            "swap_request",
            "swap_request__requester",
            "swap_request__requester__regular_profile",
            "swap_request__recipient",
            "swap_request__recipient__regular_profile",
        )
        .prefetch_related("messages__sender")
    )


def get_message_thread_for_user(*, user, thread_id):
    return (
        MessageThread.objects.filter(id=thread_id)
        .filter(
            Q(swap_request__requester=user)
            | Q(swap_request__recipient=user)
        )
        .select_related(
            "swap_request",
            "swap_request__requester",
            "swap_request__requester__regular_profile",
            "swap_request__recipient",
            "swap_request__recipient__regular_profile",
        )
        .prefetch_related("messages__sender")
        .first()
    )


def get_message_thread_messages_for_user(*, user, thread_id):
    return (
        ThreadMessage.objects.filter(
            thread__id=thread_id,
        )
        .filter(
            Q(thread__swap_request__requester=user)
            | Q(thread__swap_request__recipient=user)
        )
        .select_related("thread", "sender")
    )


@transaction.atomic
def ensure_message_thread_for_swap_request(*, swap_request, created_by):
    if swap_request.status != SkillSwapStatus.ACCEPTED:
        raise ValueError("Message threads can only be created for accepted swap requests.")

    thread, _ = MessageThread.objects.get_or_create(
        swap_request=swap_request,
        defaults={"created_by": created_by},
    )
    return thread


@transaction.atomic
def create_thread_message(
    *,
    thread,
    sender,
    content="",
    resource_url="",
    resource_label="",
):
    message_type = (
        ThreadMessage.MessageType.RESOURCE
        if resource_url
        else ThreadMessage.MessageType.TEXT
    )
    message = ThreadMessage.objects.create(
        thread=thread,
        sender=sender,
        message_type=message_type,
        content=content,
        resource_url=resource_url,
        resource_label=resource_label,
    )
    thread.save(update_fields=["updated_at"])
    return message
