from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.generics import GenericAPIView, ListAPIView
from rest_framework.response import Response

from apps.notifications.models import Notification
from apps.notifications.serializers import (
    NotificationReadAllSerializer,
    NotificationSerializer,
    NotificationSummarySerializer,
)
from apps.notifications.services import (
    get_notification_summary_for_user,
    mark_all_notifications_as_read,
    mark_notification_as_read,
)


@extend_schema_view(
    get=extend_schema(
        tags=["notifications"],
        operation_id="notifications_list",
        responses={200: NotificationSerializer(many=True)},
    )
)
class NotificationListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


@extend_schema_view(
    get=extend_schema(
        tags=["notifications"],
        operation_id="notifications_summary",
        responses={200: NotificationSummarySerializer},
    )
)
class NotificationSummaryView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSummarySerializer

    def get(self, request):
        serializer = self.get_serializer(get_notification_summary_for_user(request.user))
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        tags=["notifications"],
        operation_id="notifications_mark_read",
        responses={200: NotificationSerializer},
    )
)
class NotificationMarkReadView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def post(self, request, pk):
        notification = Notification.objects.filter(user=request.user, pk=pk).first()
        if notification is None:
            return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
        mark_notification_as_read(notification)
        return Response(
            self.get_serializer(notification).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(
        tags=["notifications"],
        operation_id="notifications_mark_all_read",
        responses={200: NotificationReadAllSerializer},
    )
)
class NotificationMarkAllReadView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationReadAllSerializer

    def post(self, request):
        updated_count = mark_all_notifications_as_read(request.user)
        serializer = self.get_serializer(
            {
                "updated_count": updated_count,
                "unread_count": get_notification_summary_for_user(request.user)["unread_count"],
            }
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

