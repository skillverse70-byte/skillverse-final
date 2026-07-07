from rest_framework import serializers

from apps.common.enums import OpportunityStatus
from apps.opportunities.models import Opportunity


class AdminOpportunityModerationSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    organization_verification_status = serializers.CharField(
        source="organization.verification_status",
        read_only=True,
    )
    application_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Opportunity
        fields = [
            "id",
            "organization",
            "organization_name",
            "organization_verification_status",
            "title",
            "type",
            "category",
            "status",
            "deadline",
            "application_count",
            "admin_review_notes",
            "admin_reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AdminOpportunityModerationDecisionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OpportunityStatus.choices, required=False)
    review_notes = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
