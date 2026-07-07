from django.utils.text import slugify
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.common.enums import TaxonomyDomain, TaxonomySuggestionStatus
from apps.common.permissions import normalize_actor_role
from apps.common.enums import Role
from apps.skills.models import FieldInterest, Skill
from apps.taxonomy.models import CategorySuggestion, ManagedCategory
from apps.taxonomy.services import (
    build_catalog_entry_payload,
    create_or_reactivate_catalog_entry,
    get_catalog_queryset,
)


class ActorSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True, allow_blank=True)
    email = serializers.EmailField(read_only=True)


class TaxonomySuggestionOrganizationSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    type = serializers.CharField(read_only=True)


class TaxonomyCatalogEntrySerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    domain = serializers.ChoiceField(choices=TaxonomyDomain.choices, read_only=True)
    name = serializers.CharField(read_only=True)
    slug = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True, allow_blank=True)
    is_active = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True, allow_null=True)
    updated_at = serializers.DateTimeField(read_only=True, allow_null=True)


class TaxonomyCatalogEntryCreateSerializer(serializers.Serializer):
    domain = serializers.ChoiceField(choices=TaxonomyDomain.choices)
    name = serializers.CharField(max_length=120, trim_whitespace=True)
    description = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        domain = attrs["domain"]
        name = attrs["name"].strip()
        slug = slugify(name)
        queryset = get_catalog_queryset(domain)
        if queryset.filter(slug=slug).exists() or queryset.filter(name__iexact=name).exists():
            raise serializers.ValidationError({"name": "This catalog entry already exists."})
        attrs["name"] = name
        return attrs

    def create(self, validated_data):
        entry = create_or_reactivate_catalog_entry(
            domain=validated_data["domain"],
            name=validated_data["name"],
            description=validated_data.get("description", ""),
            approved_by=self.context["request"].user,
            approved_at=self.context["approved_at"],
        )
        if validated_data.get("is_active") is False and entry.is_active:
            entry.is_active = False
            update_fields = ["is_active"]
            if isinstance(entry, ManagedCategory):
                update_fields.append("updated_at")
            entry.save(update_fields=update_fields)
        return entry


class TaxonomyCatalogEntryUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False, trim_whitespace=True)
    description = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    is_active = serializers.BooleanField(required=False)


class TaxonomySuggestionSerializer(serializers.ModelSerializer):
    suggested_by = serializers.SerializerMethodField()
    organization = serializers.SerializerMethodField()

    class Meta:
        model = CategorySuggestion
        fields = [
            "id",
            "domain",
            "name",
            "normalized_slug",
            "description",
            "status",
            "suggested_by",
            "organization",
            "reviewer_notes",
            "resolved_entry_name",
            "resolved_entry_slug",
            "created_at",
            "reviewed_at",
        ]
        read_only_fields = fields

    @extend_schema_field(ActorSummarySerializer(allow_null=True))
    def get_suggested_by(self, obj):
        return {
            "id": obj.suggested_by_id,
            "full_name": obj.suggested_by.full_name,
            "email": obj.suggested_by.email,
        }

    @extend_schema_field(TaxonomySuggestionOrganizationSerializer(allow_null=True))
    def get_organization(self, obj):
        if obj.organization is None:
            return None
        return {
            "id": obj.organization_id,
            "name": obj.organization.name,
            "type": obj.organization.type,
        }


class TaxonomySuggestionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategorySuggestion
        fields = ["domain", "name", "description"]

    def validate(self, attrs):
        request = self.context["request"]
        role = normalize_actor_role(request.user)
        if role not in {Role.REGULAR_USER, Role.ORGANIZATION}:
            raise serializers.ValidationError({"detail": "Only regular users and organizations can submit suggestions."})

        domain = attrs["domain"]
        name = attrs["name"].strip()
        slug = slugify(name)
        attrs["name"] = name

        if domain == TaxonomyDomain.FIELD_INTEREST:
            if FieldInterest.objects.filter(slug=slug, is_active=True).exists():
                raise serializers.ValidationError({"name": "This field interest already exists."})
        elif domain == TaxonomyDomain.SKILL:
            if Skill.objects.filter(slug=slug, is_active=True).exists():
                raise serializers.ValidationError({"name": "This skill already exists."})
        elif get_catalog_queryset(domain).filter(slug=slug, is_active=True).exists():
            raise serializers.ValidationError({"name": "This category already exists."})

        if CategorySuggestion.objects.filter(
            domain=domain,
            normalized_slug=slug,
            status=TaxonomySuggestionStatus.PENDING,
        ).exists():
            raise serializers.ValidationError({"name": "A similar suggestion is already pending review."})
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        organization = getattr(request.user, "organization_profile", None)
        return CategorySuggestion.objects.create(
            suggested_by=request.user,
            organization=organization if normalize_actor_role(request.user) == Role.ORGANIZATION else None,
            **validated_data,
        )


class TaxonomySuggestionDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(
        choices=[
            TaxonomySuggestionStatus.APPROVED,
            TaxonomySuggestionStatus.REJECTED,
        ]
    )
    reviewer_notes = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)


def serialize_catalog_entry(entry, domain):
    return TaxonomyCatalogEntrySerializer(build_catalog_entry_payload(entry, domain)).data
