from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class AdminUserModerationSerializer(serializers.ModelSerializer):
    is_email_verified = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
            "is_email_verified",
            "date_joined",
            "last_login",
        ]
        read_only_fields = fields


class AdminUserModerationDecisionSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()
    reason = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
