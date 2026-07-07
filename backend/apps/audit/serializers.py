from rest_framework import serializers

from apps.audit.models import AuditLog


class AdminAuditLogFilterSerializer(serializers.Serializer):
    action = serializers.CharField(required=False, allow_blank=False, trim_whitespace=True)
    target_type = serializers.CharField(required=False, allow_blank=False, trim_whitespace=True)
    target_id = serializers.IntegerField(required=False, min_value=1)
    actor_id = serializers.IntegerField(required=False, min_value=1)
    search = serializers.CharField(required=False, allow_blank=False, trim_whitespace=True)
    created_after = serializers.DateTimeField(required=False)
    created_before = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        created_after = attrs.get("created_after")
        created_before = attrs.get("created_before")
        if created_after and created_before and created_after > created_before:
            raise serializers.ValidationError(
                {"created_before": "created_before must be greater than created_after."}
            )
        return attrs


class AuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True, allow_null=True)
    actor_full_name = serializers.CharField(
        source="actor.full_name",
        read_only=True,
        allow_null=True,
    )
    actor_role = serializers.CharField(source="actor.role", read_only=True, allow_null=True)

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor",
            "actor_email",
            "actor_full_name",
            "actor_role",
            "action",
            "target_type",
            "target_id",
            "summary",
            "metadata",
            "created_at",
        )
        read_only_fields = fields
