from django.contrib.auth import get_user_model, password_validation
from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.accounts.services import issue_verification_token
from apps.common.enums import OrganizationType, OrganizationVerificationStatus, Role
from apps.organizations.models import Organization

User = get_user_model()


class OrganizationSummarySerializer(serializers.ModelSerializer):
    has_business_license = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "type",
            "description",
            "contact_email",
            "country",
            "location",
            "website_url",
            "contact_phone",
            "offerings_summary",
            "verification_status",
            "has_business_license",
        )
        read_only_fields = fields

    @extend_schema_field(bool)
    def get_has_business_license(self, obj):
        return bool(obj.business_license)


class OrganizationRegisterSerializer(serializers.Serializer):
    organization_name = serializers.CharField(max_length=255)
    organization_type = serializers.ChoiceField(choices=OrganizationType.choices)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    description = serializers.CharField()
    country = serializers.CharField(max_length=120, required=False, allow_blank=True)
    location = serializers.CharField(max_length=255, required=False, allow_blank=True)
    business_license = serializers.FileField(required=False, allow_null=True)

    def validate_email(self, value):
        email = value.lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def validate(self, attrs):
        country = (attrs.get("country") or "").strip()
        location = (attrs.get("location") or "").strip()
        if not country and not location:
            raise serializers.ValidationError(
                {"location": "Provide at least a country or location for the organization."}
            )

        attrs["organization_name"] = attrs["organization_name"].strip()
        attrs["description"] = attrs["description"].strip()
        attrs["country"] = country
        attrs["location"] = location
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        business_license = validated_data.pop("business_license", None)
        organization_name = validated_data.pop("organization_name")
        organization_type = validated_data.pop("organization_type")

        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            full_name=organization_name,
            role=Role.ORGANIZATION,
        )
        organization = Organization.objects.create(
            owner=user,
            name=organization_name,
            type=organization_type,
            contact_email=user.email,
            description=validated_data["description"],
            country=validated_data.get("country", ""),
            location=validated_data.get("location", ""),
            verification_status=OrganizationVerificationStatus.UNVERIFIED,
            business_license=business_license,
        )
        issue_verification_token(user)
        return organization


class OrganizationRegisterResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    email = serializers.EmailField()
    verification_required = serializers.BooleanField()
    organization = OrganizationSummarySerializer()


class OrganizationProfileSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    has_business_license = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "type",
            "description",
            "contact_email",
            "country",
            "location",
            "website_url",
            "contact_phone",
            "offerings_summary",
            "verification_status",
            "has_business_license",
            "business_license",
            "owner_email",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "verification_status",
            "has_business_license",
            "owner_email",
            "created_at",
            "updated_at",
        )

    @extend_schema_field(bool)
    def get_has_business_license(self, obj):
        return bool(obj.business_license)


class OrganizationProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = (
            "name",
            "type",
            "description",
            "contact_email",
            "country",
            "location",
            "website_url",
            "contact_phone",
            "offerings_summary",
            "business_license",
        )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        country = (attrs.get("country") or getattr(self.instance, "country", "")).strip()
        location = (attrs.get("location") or getattr(self.instance, "location", "")).strip()
        if not country and not location:
            raise serializers.ValidationError(
                {"location": "Provide at least a country or location for the organization."}
            )

        if "name" in attrs:
            attrs["name"] = attrs["name"].strip()
        if "description" in attrs:
            attrs["description"] = attrs["description"].strip()
        if "contact_email" in attrs:
            attrs["contact_email"] = attrs["contact_email"].lower()
        if "country" in attrs:
            attrs["country"] = attrs["country"].strip()
        if "location" in attrs:
            attrs["location"] = attrs["location"].strip()
        if "website_url" in attrs:
            attrs["website_url"] = attrs["website_url"].strip()
        if "contact_phone" in attrs:
            attrs["contact_phone"] = attrs["contact_phone"].strip()
        if "offerings_summary" in attrs:
            attrs["offerings_summary"] = attrs["offerings_summary"].strip()
        return attrs


class OrganizationPublicProfileSerializer(serializers.ModelSerializer):
    has_business_license = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "type",
            "description",
            "country",
            "location",
            "website_url",
            "contact_phone",
            "offerings_summary",
            "verification_status",
            "has_business_license",
        )
        read_only_fields = fields

    @extend_schema_field(bool)
    def get_has_business_license(self, obj):
        return bool(obj.business_license)
