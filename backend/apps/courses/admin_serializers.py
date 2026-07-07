from rest_framework import serializers

from apps.common.enums import CourseProgramStatus
from apps.courses.models import CourseProgram


class AdminCourseModerationSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    organization_verification_status = serializers.CharField(
        source="organization.verification_status",
        read_only=True,
    )

    class Meta:
        model = CourseProgram
        fields = [
            "id",
            "organization",
            "organization_name",
            "organization_verification_status",
            "title",
            "category",
            "status",
            "is_free",
            "price_amount",
            "enrollment_open",
            "admin_review_notes",
            "admin_reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AdminCourseModerationDecisionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=CourseProgramStatus.choices, required=False)
    enrollment_open = serializers.BooleanField(required=False)
    review_notes = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
