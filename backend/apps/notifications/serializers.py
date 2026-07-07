from rest_framework import serializers

from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "title",
            "message",
            "action_url",
            "metadata",
            "is_read",
            "read_at",
            "emailed_at",
            "created_at",
        ]
        read_only_fields = fields


class NotificationSummarySerializer(serializers.Serializer):
    unread_count = serializers.IntegerField()


class NotificationReadAllSerializer(serializers.Serializer):
    updated_count = serializers.IntegerField()
    unread_count = serializers.IntegerField()

