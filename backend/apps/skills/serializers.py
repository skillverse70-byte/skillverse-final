from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils.text import slugify
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.accounts.models import RegularUserProfile
from apps.common.enums import ExperienceLevel, SkillDirection
from apps.skills.models import FieldInterest, Skill, UserFieldInterest, UserSkill

User = get_user_model()


class FieldInterestSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldInterest
        fields = ("id", "name", "slug")
        read_only_fields = fields


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ("id", "name", "slug", "description")
        read_only_fields = fields


class UserFieldInterestSerializer(serializers.ModelSerializer):
    field_interest = FieldInterestSerializer(read_only=True)

    class Meta:
        model = UserFieldInterest
        fields = ("id", "field_interest", "created_at")
        read_only_fields = fields


class UserSkillSerializer(serializers.ModelSerializer):
    skill = SkillSerializer(read_only=True)

    class Meta:
        model = UserSkill
        fields = (
            "id",
            "skill",
            "direction",
            "experience_note",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "skill", "created_at", "updated_at")


class ProfileUserSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    full_name = serializers.CharField()
    role = serializers.CharField()


class RegularUserProfileSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    field_interests = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()

    class Meta:
        model = RegularUserProfile
        fields = (
            "user",
            "bio",
            "interests_summary",
            "experience_level",
            "field_interests",
            "skills",
            "updated_at",
        )
        read_only_fields = ("field_interests", "skills", "updated_at")

    @extend_schema_field(ProfileUserSummarySerializer)
    def get_user(self, obj):
        return {
            "id": obj.user_id,
            "email": obj.user.email,
            "full_name": obj.user.full_name,
            "role": obj.user.role,
        }

    @extend_schema_field(UserFieldInterestSerializer(many=True))
    def get_field_interests(self, obj):
        queryset = obj.user.field_interest_links.select_related("field_interest")
        return UserFieldInterestSerializer(queryset, many=True).data

    @extend_schema_field(UserSkillSerializer(many=True))
    def get_skills(self, obj):
        queryset = obj.user.user_skills.select_related("skill")
        return UserSkillSerializer(queryset, many=True).data

    def update(self, instance, validated_data):
        full_name = validated_data.pop("full_name", None)
        if full_name is not None:
            instance.user.full_name = full_name
            instance.user.save(update_fields=["full_name"])
        return super().update(instance, validated_data)


class RegularUserProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    interests_summary = serializers.CharField(required=False, allow_blank=True)
    experience_level = serializers.ChoiceField(
        choices=ExperienceLevel.choices,
        required=False,
        allow_blank=True,
    )

    def update(self, instance, validated_data):
        full_name = validated_data.pop("full_name", None)
        if full_name is not None:
            instance.user.full_name = full_name
            instance.user.save(update_fields=["full_name"])
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class UserFieldInterestCreateSerializer(serializers.Serializer):
    field_interest_id = serializers.IntegerField(required=False)
    name = serializers.CharField(required=False, allow_blank=False, max_length=120)

    def validate(self, attrs):
        if not attrs.get("field_interest_id") and not attrs.get("name"):
            raise serializers.ValidationError(
                "Provide either field_interest_id or name."
            )
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        field_interest = None

        field_interest_id = validated_data.get("field_interest_id")
        if field_interest_id:
            try:
                field_interest = FieldInterest.objects.get(id=field_interest_id, is_active=True)
            except FieldInterest.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {"field_interest_id": "Field interest was not found."}
                ) from exc
        else:
            name = validated_data["name"].strip()
            field_interest, _ = FieldInterest.objects.get_or_create(
                slug=slugify(name),
                defaults={"name": name},
            )

        try:
            return UserFieldInterest.objects.create(user=user, field_interest=field_interest)
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"field_interest": "This field interest is already on your profile."}
            ) from exc


class UserSkillCreateSerializer(serializers.Serializer):
    skill_id = serializers.IntegerField(required=False)
    name = serializers.CharField(required=False, allow_blank=False, max_length=120)
    direction = serializers.ChoiceField(choices=SkillDirection.choices)
    experience_note = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate(self, attrs):
        if not attrs.get("skill_id") and not attrs.get("name"):
            raise serializers.ValidationError("Provide either skill_id or name.")
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        skill = None
        skill_id = validated_data.get("skill_id")

        if skill_id:
            try:
                skill = Skill.objects.get(id=skill_id, is_active=True)
            except Skill.DoesNotExist as exc:
                raise serializers.ValidationError({"skill_id": "Skill was not found."}) from exc
        else:
            name = validated_data["name"].strip()
            skill, _ = Skill.objects.get_or_create(
                slug=slugify(name),
                defaults={"name": name},
            )

        try:
            return UserSkill.objects.create(
                user=user,
                skill=skill,
                direction=validated_data["direction"],
                experience_note=validated_data.get("experience_note", ""),
            )
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"skill": "This skill is already on your profile."}
            ) from exc


class UserSkillUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSkill
        fields = ("direction", "experience_note")
