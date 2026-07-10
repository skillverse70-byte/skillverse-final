from rest_framework import serializers

from apps.courses.models import CourseInstructorInvitation, CourseProgram
from apps.common.enums import CourseProgramStatus


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


class AdminCourseInstructorInvitationSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course_program.title", read_only=True)
    organization_id = serializers.IntegerField(source="course_program.organization_id", read_only=True)
    organization_name = serializers.CharField(source="course_program.organization.name", read_only=True)
    invited_by_email = serializers.EmailField(source="invited_by.email", read_only=True)
    invited_by_name = serializers.CharField(source="invited_by.full_name", read_only=True)
    invited_user_email = serializers.EmailField(source="user.email", read_only=True, allow_null=True)
    invited_user_name = serializers.CharField(source="user.full_name", read_only=True, allow_blank=True, allow_null=True)

    class Meta:
        model = CourseInstructorInvitation
        fields = [
            "id",
            "course_program",
            "course_title",
            "organization_id",
            "organization_name",
            "invited_email",
            "status",
            "expires_at",
            "last_sent_at",
            "sent_count",
            "accepted_at",
            "declined_at",
            "revoked_at",
            "invited_by_email",
            "invited_by_name",
            "invited_user_email",
            "invited_user_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
