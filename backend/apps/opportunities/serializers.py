from datetime import date
from typing import Optional

from django.db.models import Count
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.common.enums import JobApplicationStatus, OpportunityStatus, OpportunityType
from apps.opportunities.models import JobApplication, Opportunity
from apps.organizations.models import Organization


def _clean_string_list(values):
    if not isinstance(values, list):
        return []

    cleaned = []
    seen = set()
    for value in values:
        text = str(value).strip()
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(text)
    return cleaned


def _clean_int_list(values):
    if not isinstance(values, list):
        return []

    cleaned = []
    seen = set()
    for value in values:
        try:
            normalized = int(value)
        except (TypeError, ValueError):
            continue
        if normalized in seen:
            continue
        seen.add(normalized)
        cleaned.append(normalized)
    return cleaned


def build_opportunity_relevance_signals(opportunity):
    return {
        "fields": _clean_string_list(getattr(opportunity, "field_signals", [])),
        "skills": _clean_string_list(getattr(opportunity, "required_skills", [])),
        "courses": _clean_int_list(getattr(opportunity, "related_course_ids", [])),
        "participation": {
            "signals": _clean_string_list(getattr(opportunity, "verified_activity_signals", [])),
            "application_count": int(getattr(opportunity, "application_count", 0) or 0),
        },
        "organization_verification_status": getattr(
            getattr(opportunity, "organization", None),
            "verification_status",
            "unverified",
        ),
    }


class OpportunityOrganizationSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "type", "verification_status"]


class OpportunitySummarySerializer(serializers.ModelSerializer):
    organization = OpportunityOrganizationSummarySerializer(read_only=True)
    company_name = serializers.CharField(source="organization.name", read_only=True)
    application_count = serializers.IntegerField(read_only=True)
    viewer_application_status = serializers.SerializerMethodField()
    relevance_signals = serializers.SerializerMethodField()

    class Meta:
        model = Opportunity
        fields = [
            "id",
            "organization",
            "company_name",
            "title",
            "description",
            "type",
            "status",
            "category",
            "location",
            "is_remote",
            "experience_level",
            "salary_range",
            "deadline",
            "required_skills",
            "field_signals",
            "related_course_ids",
            "verified_activity_signals",
            "application_count",
            "viewer_application_status",
            "relevance_signals",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_viewer_application_status(self, obj) -> Optional[str]:
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return None

        viewer_application = getattr(obj, "_viewer_application", None)
        if viewer_application is None:
            viewer_application = JobApplication.objects.filter(
                opportunity=obj,
                user=request.user,
            ).first()
        return viewer_application.status if viewer_application else None

    @extend_schema_field(serializers.JSONField())
    def get_relevance_signals(self, obj):
        return build_opportunity_relevance_signals(obj)


class OpportunityDetailSerializer(OpportunitySummarySerializer):
    pass


class OpportunityWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Opportunity
        fields = [
            "id",
            "title",
            "description",
            "type",
            "status",
            "category",
            "location",
            "is_remote",
            "experience_level",
            "salary_range",
            "deadline",
            "required_skills",
            "field_signals",
            "related_course_ids",
            "verified_activity_signals",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        deadline = attrs.get("deadline", getattr(self.instance, "deadline", None))
        is_remote = attrs.get("is_remote", getattr(self.instance, "is_remote", False))
        location = attrs.get("location", getattr(self.instance, "location", ""))

        if deadline is not None and deadline < date.today():
            raise serializers.ValidationError({"deadline": "Deadline cannot be in the past."})
        if not is_remote and not location:
            raise serializers.ValidationError({"location": "Location is required unless the role is remote."})

        for list_field in ["required_skills", "field_signals", "verified_activity_signals"]:
            if list_field in attrs:
                attrs[list_field] = _clean_string_list(attrs.get(list_field))
        if "related_course_ids" in attrs:
            attrs["related_course_ids"] = _clean_int_list(attrs.get("related_course_ids"))
        return attrs

    def create(self, validated_data):
        organization = self.context["organization"]
        return Opportunity.objects.create(organization=organization, **validated_data)


class JobApplicationSummarySerializer(serializers.ModelSerializer):
    opportunity_id = serializers.IntegerField(source="opportunity.id", read_only=True)
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True)
    opportunity_type = serializers.ChoiceField(
        source="opportunity.type",
        choices=OpportunityType.choices,
        read_only=True,
    )
    company_name = serializers.CharField(source="opportunity.organization.name", read_only=True)
    deadline = serializers.DateField(source="opportunity.deadline", read_only=True)
    relevance_signals = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = [
            "id",
            "opportunity_id",
            "opportunity_title",
            "opportunity_type",
            "company_name",
            "status",
            "cover_letter",
            "reviewer_notes",
            "deadline",
            "relevance_signals",
            "applied_at",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.JSONField())
    def get_relevance_signals(self, obj):
        return build_opportunity_relevance_signals(obj.opportunity)


class JobApplicationCreateSerializer(serializers.Serializer):
    cover_letter = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)


class ApplicantInfoSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class ApplicantOpportunitySerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(read_only=True)
    type = serializers.ChoiceField(choices=OpportunityType.choices, read_only=True)


class ApplicantSummarySerializer(serializers.ModelSerializer):
    applicant = serializers.SerializerMethodField()
    opportunity = serializers.SerializerMethodField()
    relevance_signals = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = [
            "id",
            "status",
            "cover_letter",
            "reviewer_notes",
            "applied_at",
            "reviewed_at",
            "applicant",
            "opportunity",
            "relevance_signals",
        ]
        read_only_fields = fields

    @extend_schema_field(ApplicantInfoSerializer)
    def get_applicant(self, obj):
        return {
            "id": obj.user_id,
            "full_name": obj.user.full_name,
            "email": obj.user.email,
        }

    @extend_schema_field(ApplicantOpportunitySerializer)
    def get_opportunity(self, obj):
        return {
            "id": obj.opportunity_id,
            "title": obj.opportunity.title,
            "type": obj.opportunity.type,
        }

    @extend_schema_field(serializers.JSONField())
    def get_relevance_signals(self, obj):
        return build_opportunity_relevance_signals(obj.opportunity)


class ApplicantStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            JobApplicationStatus.APPLIED,
            JobApplicationStatus.SHORTLISTED,
            JobApplicationStatus.INTERVIEW,
            JobApplicationStatus.HIRED,
            JobApplicationStatus.REJECTED,
        ]
    )
    reviewer_notes = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)


def annotate_opportunity_queryset(queryset):
    return queryset.select_related("organization").annotate(
        application_count=Count("applications", distinct=True)
    )
