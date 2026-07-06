from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.generics import GenericAPIView
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.common.permissions import IsRegularUser
from apps.messaging.serializers import (
    MessageThreadCreateSerializer,
    MessageThreadReadReceiptSerializer,
    MessageThreadSerializer,
    ThreadMessageCreateSerializer,
    ThreadMessageSerializer,
)
from apps.messaging.services import (
    create_thread_message,
    ensure_message_thread_for_swap_request,
    get_message_thread_for_user,
    get_message_thread_messages_for_user,
    get_message_threads_for_user,
    mark_thread_as_read,
)


@extend_schema(
    tags=["messaging"],
    request=MessageThreadCreateSerializer,
    responses={200: MessageThreadSerializer(many=True), 201: MessageThreadSerializer},
)
class MessageThreadListCreateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]
    serializer_class = MessageThreadCreateSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update(
            {
                "ensure_message_thread_for_swap_request": ensure_message_thread_for_swap_request,
            }
        )
        return context

    def get(self, request):
        queryset = get_message_threads_for_user(request.user)
        serializer = MessageThreadSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        thread = serializer.save()
        response_serializer = MessageThreadSerializer(thread, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["messaging"], responses={200: MessageThreadSerializer})
class MessageThreadDetailView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]

    def get(self, request, pk):
        thread = get_message_thread_for_user(user=request.user, thread_id=pk)
        if thread is None:
            raise ValidationError({"detail": "Message thread was not found."})
        serializer = MessageThreadSerializer(thread, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["messaging"],
    request=ThreadMessageCreateSerializer,
    responses={200: ThreadMessageSerializer(many=True), 201: ThreadMessageSerializer},
)
class ThreadMessageListCreateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]
    serializer_class = ThreadMessageCreateSerializer

    def get_thread(self, request, thread_id):
        thread = get_message_thread_for_user(user=request.user, thread_id=thread_id)
        if thread is None:
            raise ValidationError({"detail": "Message thread was not found."})
        return thread

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"create_thread_message": create_thread_message})
        return context

    def get(self, request, thread_id):
        messages = get_message_thread_messages_for_user(user=request.user, thread_id=thread_id)
        serializer = ThreadMessageSerializer(messages, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, thread_id):
        thread = self.get_thread(request, thread_id)
        serializer = self.get_serializer(
            data=request.data,
            context={
                **self.get_serializer_context(),
                "request": request,
                "thread": thread,
            },
        )
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        response_serializer = ThreadMessageSerializer(message)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["messaging"],
    request=None,
    responses={200: MessageThreadReadReceiptSerializer},
)
class MessageThreadReadReceiptView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]

    def post(self, request, thread_id):
        thread = get_message_thread_for_user(user=request.user, thread_id=thread_id)
        if thread is None:
            raise ValidationError({"detail": "Message thread was not found."})

        read_state = mark_thread_as_read(thread=thread, user=request.user)
        latest_message_id = getattr(read_state, "last_read_message_id", None)
        unread_count = thread.messages.exclude(sender=request.user).filter(
            id__gt=latest_message_id or 0,
        ).count()
        serializer = MessageThreadReadReceiptSerializer(
            {
                "thread_id": thread.id,
                "unread_count": unread_count,
                "has_unread": unread_count > 0,
                "last_read_message_id": latest_message_id,
                "last_read_at": read_state.last_read_at,
            }
        )
        return Response(serializer.data, status=status.HTTP_200_OK)
