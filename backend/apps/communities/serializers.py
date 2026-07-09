from django.db.models import Count
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.common.enums import CommunityMembershipRole, CommunityVisibility, Role
from apps.common.permissions import normalize_actor_role
from apps.common.trust import is_verified_organization
from apps.communities.models import CommunityGroup, CommunityMembership, CommunityPost
from apps.courses.models import CourseProgram
from apps.courses.serializers import CourseProgramSummarySerializer
from apps.events.models import Event
from apps.events.serializers import EventSummarySerializer


class CommunityQuerySerializer(serializers.Serializer):
    scope = serializers.ChoiceField(
        choices=("public", "mine", "managed", "admin"),
        required=False,
        default="public",
    )


class CommunityActorSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField(allow_blank=True)
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=Role.choices)


class CommunityPostSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = CommunityPost
        fields = [
            "id",
            "author",
            "body",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(CommunityActorSummarySerializer)
    def get_author(self, obj):
        return {
            "id": obj.author_id,
            "full_name": obj.author.full_name,
            "email": obj.author.email,
            "role": obj.author.role,
        }


class CommunityMembershipSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = CommunityMembership
        fields = [
            "id",
            "role",
            "joined_at",
            "user",
        ]

    @extend_schema_field(CommunityActorSummarySerializer)
    def get_user(self, obj):
        return {
            "id": obj.user_id,
            "full_name": obj.user.full_name,
            "email": obj.user.email,
            "role": obj.user.role,
        }


class CommunityGroupSummarySerializer(serializers.ModelSerializer):
    organization = serializers.SerializerMethodField()
    related_course = CourseProgramSummarySerializer(read_only=True)
    related_event = EventSummarySerializer(read_only=True)
    membership_count = serializers.SerializerMethodField()
    post_count = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    member_role = serializers.SerializerMethodField()

    class Meta:
        model = CommunityGroup
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "category",
            "tags",
            "visibility",
            "organization",
            "related_course",
            "related_event",
            "membership_count",
            "post_count",
            "is_member",
            "member_role",
            "is_active",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.JSONField())
    def get_organization(self, obj):
        return {
            "id": obj.organization_id,
            "name": obj.organization.name,
            "verification_status": obj.organization.verification_status,
        }

    @extend_schema_field(serializers.IntegerField())
    def get_membership_count(self, obj):
        if hasattr(obj, "membership_count"):
            return int(obj.membership_count or 0)
        return obj.memberships.count()

    @extend_schema_field(serializers.IntegerField())
    def get_post_count(self, obj):
        if hasattr(obj, "post_count"):
            return int(obj.post_count or 0)
        return obj.posts.count()

    def _viewer_membership(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return None
        membership = getattr(obj, "_viewer_membership", None)
        if membership is not None:
            return membership
        membership = obj.memberships.filter(user=user).first()
        obj._viewer_membership = membership
        return membership

    @extend_schema_field(serializers.BooleanField())
    def get_is_member(self, obj):
        membership = self._viewer_membership(obj)
        return membership is not None

    @extend_schema_field(serializers.CharField())
    def get_member_role(self, obj):
        membership = self._viewer_membership(obj)
        return membership.role if membership is not None else ""


class CommunityGroupDetailSerializer(CommunityGroupSummarySerializer):
    recent_posts = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    class Meta(CommunityGroupSummarySerializer.Meta):
        fields = CommunityGroupSummarySerializer.Meta.fields + [
            "recent_posts",
            "members",
        ]

    @extend_schema_field(CommunityPostSerializer(many=True))
    def get_recent_posts(self, obj):
        posts = list(obj.posts.all()[:25])
        return CommunityPostSerializer(posts, many=True, context=self.context).data

    @extend_schema_field(CommunityMembershipSerializer(many=True))
    def get_members(self, obj):
        memberships = list(obj.memberships.all()[:50])
        return CommunityMembershipSerializer(memberships, many=True, context=self.context).data


class CommunityGroupWriteSerializer(serializers.ModelSerializer):
    related_course_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    related_event_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = CommunityGroup
        fields = [
            "title",
            "description",
            "category",
            "tags",
            "visibility",
            "related_course_id",
            "related_event_id",
        ]

    def validate_tags(self, value):
        cleaned = []
        for item in value or []:
            text = str(item).strip()
            if text:
                cleaned.append(text)
        return cleaned

    def validate(self, attrs):
        user = self.context["request"].user
        organization = getattr(user, "organization_profile", None)
        if organization is None:
            raise serializers.ValidationError({"detail": "Organization profile is required."})
        if not is_verified_organization(organization):
            raise serializers.ValidationError(
                {"detail": "Only verified organizations can create communities."}
            )

        related_course_id = attrs.pop("related_course_id", None)
        related_event_id = attrs.pop("related_event_id", None)
        if related_course_id:
            related_course = CourseProgram.objects.filter(
                id=related_course_id,
                organization=organization,
            ).first()
            if related_course is None:
                raise serializers.ValidationError(
                    {"related_course_id": "Choose one of your organization courses."}
                )
            attrs["related_course"] = related_course
        if related_event_id:
            related_event = Event.objects.filter(
                id=related_event_id,
                organization=organization,
            ).first()
            if related_event is None:
                raise serializers.ValidationError(
                    {"related_event_id": "Choose one of your organization events."}
                )
            attrs["related_event"] = related_event
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        organization = user.organization_profile
        community = CommunityGroup.objects.create(
            organization=organization,
            created_by=user,
            **validated_data,
        )
        CommunityMembership.objects.get_or_create(
            community=community,
            user=user,
            defaults={"role": CommunityMembershipRole.MODERATOR},
        )
        return community


class CommunityMembershipActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=("join", "leave"))


class CommunityPostWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityPost
        fields = ["body"]

    def validate_body(self, value):
        text = str(value or "").strip()
        if not text:
            raise serializers.ValidationError("Post body is required.")
        return text


def annotate_community_queryset(queryset):
    return queryset.annotate(
        membership_count=Count("memberships", distinct=True),
        post_count=Count("posts", distinct=True),
    ).select_related(
        "organization",
        "related_course",
        "related_course__organization",
        "related_event",
        "related_event__organization",
    ).prefetch_related(
        "memberships",
        "memberships__user",
        "posts",
        "posts__author",
    )
