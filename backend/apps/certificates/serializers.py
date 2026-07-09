from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.certificates.models import Certificate, ServiceCreditRecord
from apps.common.enums import (
    CertificateSourceType,
    CertificateStatus,
    Role,
    ServiceCreditStatus,
)
from apps.common.trust import is_verified_organization
from apps.communities.models import CommunityGroup
from apps.communities.serializers import CommunityGroupSummarySerializer
from apps.courses.models import CourseProgram, Enrollment
from apps.courses.serializers import CourseProgramSummarySerializer
from apps.events.models import Event, EventRSVP
from apps.events.serializers import EventSummarySerializer
from apps.organizations.models import Organization


class CertificateUserSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField(allow_blank=True)
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=Role.choices)


class ServiceCreditRecordSerializer(serializers.ModelSerializer):
    organization = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    community_group = CommunityGroupSummarySerializer(read_only=True)
    event = EventSummarySerializer(read_only=True)
    course_program = CourseProgramSummarySerializer(read_only=True)

    class Meta:
        model = ServiceCreditRecord
        fields = [
            "id",
            "title",
            "description",
            "credit_hours",
            "status",
            "evidence_note",
            "issued_at",
            "organization",
            "user",
            "community_group",
            "event",
            "course_program",
        ]

    @extend_schema_field(serializers.JSONField())
    def get_organization(self, obj):
        return {
            "id": obj.organization_id,
            "name": obj.organization.name,
            "verification_status": obj.organization.verification_status,
        }

    @extend_schema_field(CertificateUserSummarySerializer)
    def get_user(self, obj):
        return {
            "id": obj.user_id,
            "full_name": obj.user.full_name,
            "email": obj.user.email,
            "role": obj.user.role,
        }


class CertificateSerializer(serializers.ModelSerializer):
    organization = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    service_credit = ServiceCreditRecordSerializer(read_only=True)
    course_program = CourseProgramSummarySerializer(read_only=True)
    event = EventSummarySerializer(read_only=True)

    class Meta:
        model = Certificate
        fields = [
            "id",
            "certificate_id",
            "source_type",
            "title",
            "summary",
            "signature_label",
            "status",
            "issued_at",
            "organization",
            "user",
            "service_credit",
            "course_program",
            "event",
        ]

    @extend_schema_field(serializers.JSONField())
    def get_organization(self, obj):
        return {
            "id": obj.organization_id,
            "name": obj.organization.name,
            "verification_status": obj.organization.verification_status,
        }

    @extend_schema_field(CertificateUserSummarySerializer)
    def get_user(self, obj):
        return {
            "id": obj.user_id,
            "full_name": obj.user.full_name,
            "email": obj.user.email,
            "role": obj.user.role,
        }


class CertificatePortfolioSerializer(serializers.Serializer):
    certificates = CertificateSerializer(many=True)
    service_credits = ServiceCreditRecordSerializer(many=True)


class ServiceCreditIssueSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(min_value=1)
    event_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    course_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    community_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    credit_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    evidence_note = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        user = self.context["request"].user
        organization = getattr(user, "organization_profile", None)
        if organization is None:
            raise serializers.ValidationError({"detail": "Organization profile is required."})
        if not is_verified_organization(organization):
            raise serializers.ValidationError(
                {"detail": "Only verified organizations can issue service-credit records."}
            )

        target_user = self.context["user_model"].objects.filter(id=attrs["user_id"], role=Role.REGULAR_USER).first()
        if target_user is None:
            raise serializers.ValidationError({"user_id": "Choose a regular user."})
        attrs["target_user"] = target_user

        event_id = attrs.get("event_id")
        course_id = attrs.get("course_id")
        community_id = attrs.get("community_id")
        evidence_count = sum(bool(value) for value in [event_id, course_id, community_id])

        if evidence_count != 1:
            raise serializers.ValidationError(
                {"detail": "Choose exactly one evidence source: event, course, or community."}
            )

        if event_id:
            event = Event.objects.filter(id=event_id, organization=organization).first()
            if event is None:
                raise serializers.ValidationError({"event_id": "Choose one of your organization events."})
            attended = EventRSVP.objects.filter(user=target_user, event=event, attended_at__isnull=False).exists()
            if not attended:
                raise serializers.ValidationError(
                    {"event_id": "Service credit from an event requires recorded attendance."}
                )
            attrs["event"] = event

        if course_id:
            course = CourseProgram.objects.filter(id=course_id, organization=organization).first()
            if course is None:
                raise serializers.ValidationError({"course_id": "Choose one of your organization courses."})
            completed = Enrollment.objects.filter(
                user=target_user,
                course_program=course,
                status="completed",
            ).exists()
            if not completed:
                raise serializers.ValidationError(
                    {"course_id": "Course-based service credit requires a completed enrollment."}
                )
            attrs["course_program"] = course

        if community_id:
            community = CommunityGroup.objects.filter(id=community_id, organization=organization).first()
            if community is None:
                raise serializers.ValidationError({"community_id": "Choose one of your organization communities."})
            is_member = community.memberships.filter(user=target_user).exists()
            if not is_member:
                raise serializers.ValidationError(
                    {"community_id": "Community-based service credit requires group membership."}
                )
            attrs["community_group"] = community
        return attrs

    def create(self, validated_data):
        request_user = self.context["request"].user
        organization = request_user.organization_profile
        return ServiceCreditRecord.objects.create(
            organization=organization,
            user=validated_data["target_user"],
            event=validated_data.get("event"),
            course_program=validated_data.get("course_program"),
            community_group=validated_data.get("community_group"),
            title=validated_data["title"],
            description=validated_data.get("description", ""),
            credit_hours=validated_data["credit_hours"],
            evidence_note=validated_data.get("evidence_note", ""),
            status=ServiceCreditStatus.ISSUED,
            issued_by=request_user,
        )


class CertificateIssueSerializer(serializers.Serializer):
    source_type = serializers.ChoiceField(choices=CertificateSourceType.choices)
    user_id = serializers.IntegerField(min_value=1)
    course_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    event_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    service_credit_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    title = serializers.CharField(required=False, allow_blank=True, max_length=255)
    summary = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        user = self.context["request"].user
        organization = getattr(user, "organization_profile", None)
        if organization is None:
            raise serializers.ValidationError({"detail": "Organization profile is required."})
        if not is_verified_organization(organization):
            raise serializers.ValidationError(
                {"detail": "Only verified organizations can issue certificates."}
            )

        target_user = self.context["user_model"].objects.filter(id=attrs["user_id"], role=Role.REGULAR_USER).first()
        if target_user is None:
            raise serializers.ValidationError({"user_id": "Choose a regular user."})
        attrs["target_user"] = target_user

        source_type = attrs["source_type"]
        if source_type == CertificateSourceType.COURSE_COMPLETION:
            course = CourseProgram.objects.filter(
                id=attrs.get("course_id"),
                organization=organization,
            ).first()
            if course is None:
                raise serializers.ValidationError({"course_id": "Choose one of your organization courses."})
            completed = Enrollment.objects.filter(
                user=target_user,
                course_program=course,
                status="completed",
            ).exists()
            if not completed:
                raise serializers.ValidationError({"course_id": "Certificate issuance requires completed enrollment."})
            attrs["course_program"] = course
            attrs["resolved_title"] = attrs.get("title") or f"{course.title} Completion Certificate"
            attrs["resolved_summary"] = attrs.get("summary") or f"Verified completion of {course.title}."
            existing_certificate = Certificate.objects.filter(
                organization=organization,
                user=target_user,
                course_program=course,
                source_type=CertificateSourceType.COURSE_COMPLETION,
                status=CertificateStatus.ACTIVE,
            ).first()
            if existing_certificate is not None:
                raise serializers.ValidationError(
                    {
                        "course_id": (
                            "An active certificate has already been issued for this "
                            "course completion."
                        )
                    }
                )

        elif source_type == CertificateSourceType.EVENT_PARTICIPATION:
            event = Event.objects.filter(
                id=attrs.get("event_id"),
                organization=organization,
            ).first()
            if event is None:
                raise serializers.ValidationError({"event_id": "Choose one of your organization events."})
            attended = EventRSVP.objects.filter(
                user=target_user,
                event=event,
                attended_at__isnull=False,
            ).exists()
            if not attended:
                raise serializers.ValidationError({"event_id": "Certificate issuance requires recorded attendance."})
            attrs["event"] = event
            attrs["resolved_title"] = attrs.get("title") or f"{event.title} Participation Certificate"
            attrs["resolved_summary"] = attrs.get("summary") or f"Verified participation in {event.title}."
            existing_certificate = Certificate.objects.filter(
                organization=organization,
                user=target_user,
                event=event,
                source_type=CertificateSourceType.EVENT_PARTICIPATION,
                status=CertificateStatus.ACTIVE,
            ).first()
            if existing_certificate is not None:
                raise serializers.ValidationError(
                    {
                        "event_id": (
                            "An active certificate has already been issued for this "
                            "event participation."
                        )
                    }
                )

        else:
            service_credit = ServiceCreditRecord.objects.filter(
                id=attrs.get("service_credit_id"),
                organization=organization,
                user=target_user,
                status=ServiceCreditStatus.ISSUED,
            ).first()
            if service_credit is None:
                raise serializers.ValidationError(
                    {"service_credit_id": "Choose one of your issued service-credit records."}
                )
            attrs["service_credit"] = service_credit
            attrs["resolved_title"] = attrs.get("title") or f"{service_credit.title} Recognition Certificate"
            attrs["resolved_summary"] = attrs.get("summary") or f"Verified recognition for {service_credit.title}."
            existing_certificate = Certificate.objects.filter(
                organization=organization,
                user=target_user,
                service_credit=service_credit,
                source_type=CertificateSourceType.SERVICE_CREDIT,
                status=CertificateStatus.ACTIVE,
            ).first()
            if existing_certificate is not None:
                raise serializers.ValidationError(
                    {
                        "service_credit_id": (
                            "An active certificate has already been issued for this "
                            "service-credit record."
                        )
                    }
                )

        return attrs

    def create(self, validated_data):
        request_user = self.context["request"].user
        organization = request_user.organization_profile
        return Certificate.objects.create(
            organization=organization,
            user=validated_data["target_user"],
            source_type=validated_data["source_type"],
            course_program=validated_data.get("course_program"),
            event=validated_data.get("event"),
            service_credit=validated_data.get("service_credit"),
            title=validated_data["resolved_title"],
            summary=validated_data["resolved_summary"],
            issued_by=request_user,
            status=CertificateStatus.ACTIVE,
        )


class CertificateEligibilitySerializer(serializers.Serializer):
    user = CertificateUserSummarySerializer()
    course = CourseProgramSummarySerializer(allow_null=True)
    event = EventSummarySerializer(allow_null=True)
    service_credit = ServiceCreditRecordSerializer(allow_null=True)
    source_type = serializers.ChoiceField(choices=CertificateSourceType.choices)
    certificate_already_issued = serializers.BooleanField()


class OrganizationTrustOverviewSerializer(serializers.Serializer):
    communities = CommunityGroupSummarySerializer(many=True)
    service_credits = ServiceCreditRecordSerializer(many=True)
    certificates = CertificateSerializer(many=True)
    eligible_course_completions = CertificateEligibilitySerializer(many=True)
    eligible_event_attendances = CertificateEligibilitySerializer(many=True)
    eligible_service_credit_certificates = CertificateEligibilitySerializer(many=True)


class AdminTrustOverviewSerializer(serializers.Serializer):
    communities = CommunityGroupSummarySerializer(many=True)
    service_credits = ServiceCreditRecordSerializer(many=True)
    certificates = CertificateSerializer(many=True)


class TrustRevokeSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


def annotate_service_credit_queryset(queryset):
    return queryset.select_related(
        "organization",
        "user",
        "community_group",
        "community_group__organization",
        "event",
        "event__organization",
        "course_program",
        "course_program__organization",
    )


def annotate_certificate_queryset(queryset):
    return queryset.select_related(
        "organization",
        "user",
        "service_credit",
        "service_credit__organization",
        "service_credit__user",
        "course_program",
        "course_program__organization",
        "event",
        "event__organization",
    )
