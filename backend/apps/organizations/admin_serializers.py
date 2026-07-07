from rest_framework import serializers

from apps.organizations.models import Organization


class AdminOrganizationModerationSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    owner_full_name = serializers.CharField(source="owner.full_name", read_only=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "type",
            "verification_status",
            "contact_email",
            "country",
            "location",
            "owner_email",
            "owner_full_name",
            "is_suspended",
            "suspension_reason",
            "moderated_at",
            "updated_at",
        ]
        read_only_fields = fields


class AdminOrganizationModerationDecisionSerializer(serializers.Serializer):
    is_suspended = serializers.BooleanField()
    suspension_reason = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
