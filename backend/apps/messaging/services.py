from django.utils import timezone
from asgiref.sync import async_to_sync
from django.db import transaction
from django.db.models import Q

from apps.common.enums import SkillSwapStatus
from apps.messaging.models import MessageThread, MessageThreadReadState, ThreadMessage
from apps.messaging.serializers import ThreadMessageSerializer

try:
    from channels.layers import get_channel_layer
except ModuleNotFoundError:
    def get_channel_layer():
        return None


def get_thread_group_name(thread_id):
    return f"messages.thread.{thread_id}"


def get_user_inbox_group_name(user_id):
    return f"messages.inbox.{user_id}"


def get_thread_unread_count_for_user(*, thread, user):
    read_state = next(
        (state for state in thread.read_states.all() if state.user_id == user.id),
        None,
    )
    last_read_message_id = getattr(read_state, "last_read_message_id", None) or 0
    return thread.messages.exclude(sender=user).filter(id__gt=last_read_message_id).count()


def get_unread_summary_for_user(user):
    threads = list(get_message_threads_for_user(user))
    total_unread_count = 0
    unread_thread_count = 0

    for thread in threads:
        unread_count = get_thread_unread_count_for_user(thread=thread, user=user)
        total_unread_count += unread_count
        if unread_count > 0:
            unread_thread_count += 1

    return {
        "total_unread_count": total_unread_count,
        "unread_thread_count": unread_thread_count,
    }


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
        .prefetch_related("messages__sender", "read_states__last_read_message")
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
        .prefetch_related("messages__sender", "read_states__last_read_message")
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
    for participant in (swap_request.requester, swap_request.recipient):
        MessageThreadReadState.objects.get_or_create(
            thread=thread,
            user=participant,
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
    transaction.on_commit(lambda: broadcast_thread_message_created(message.id))
    return message


@transaction.atomic
def mark_thread_as_read(*, thread, user):
    latest_message = (
        thread.messages.exclude(sender=user)
        .order_by("-created_at", "-id")
        .first()
    )
    read_state, _ = MessageThreadReadState.objects.get_or_create(
        thread=thread,
        user=user,
    )

    if latest_message is None:
        if read_state.last_read_message_id is None and read_state.last_read_at is not None:
            read_state.last_read_at = None
            read_state.save(update_fields=["last_read_at", "updated_at"])
        return read_state

    if read_state.last_read_message_id != latest_message.id:
        read_state.last_read_message_id = latest_message.id
        read_state.last_read_at = timezone.now()
        read_state.save(update_fields=["last_read_message", "last_read_at", "updated_at"])
        transaction.on_commit(lambda: broadcast_unread_summary_for_user(user))

    return read_state


def broadcast_thread_message_created(message_id):
    try:
        message = ThreadMessage.objects.select_related("thread", "sender").get(id=message_id)
    except ThreadMessage.DoesNotExist:
        return

    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    payload = ThreadMessageSerializer(message).data
    async_to_sync(channel_layer.group_send)(
        get_thread_group_name(message.thread_id),
        {
            "type": "thread.message.created",
            "message": payload,
            "thread_id": message.thread_id,
        },
    )
    participants = [message.thread.swap_request.requester, message.thread.swap_request.recipient]
    for participant in participants:
        broadcast_unread_summary_for_user(participant, channel_layer=channel_layer)


def broadcast_unread_summary_for_user(user, *, channel_layer=None):
    active_channel_layer = channel_layer or get_channel_layer()
    if active_channel_layer is None:
        return

    payload = get_unread_summary_for_user(user)
    async_to_sync(active_channel_layer.group_send)(
        get_user_inbox_group_name(user.id),
        {
            "type": "messages.unread.updated",
            "user_id": user.id,
            "summary": payload,
        },
    )
