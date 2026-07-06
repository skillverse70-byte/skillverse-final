from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.common.enums import ReviewContext
from apps.reviews.models import RatingReview
from apps.reviews.services import get_review_eligibility


class ReviewTargetSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField(required=False)
    title = serializers.CharField(required=False)


class RatingReviewSerializer(serializers.ModelSerializer):
    target = serializers.SerializerMethodField()

    class Meta:
        model = RatingReview
        fields = (
            "id",
            "context",
            "rating",
            "comment",
            "target",
            "swap_request",
            "enrollment",
            "course_program",
            "event_rsvp",
            "event",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    @extend_schema_field(ReviewTargetSerializer)
    def get_target(self, obj):
        if obj.context == ReviewContext.SKILL_SWAP and obj.reviewee_user is not None:
            return {
                "id": obj.reviewee_user.id,
                "full_name": obj.reviewee_user.full_name,
            }
        if obj.context == ReviewContext.COURSE and obj.course_program is not None:
            return {
                "id": obj.course_program.id,
                "title": obj.course_program.title,
            }
        if obj.context == ReviewContext.EVENT and obj.event is not None:
            return {
                "id": obj.event.id,
                "title": obj.event.title,
            }
        return None


class ReviewEligibilitySerializer(serializers.Serializer):
    context = serializers.ChoiceField(choices=ReviewContext.choices)
    source_id = serializers.IntegerField()
    eligible = serializers.BooleanField()
    reason = serializers.CharField()
    existing_review_id = serializers.IntegerField(allow_null=True)
    target = ReviewTargetSerializer(allow_null=True)


class RatingReviewCreateSerializer(serializers.Serializer):
    context = serializers.ChoiceField(choices=ReviewContext.choices)
    source_id = serializers.IntegerField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        attrs["comment"] = (attrs.get("comment") or "").strip()
        eligibility = get_review_eligibility(
            user=self.context["request"].user,
            context=attrs["context"],
            source_id=attrs["source_id"],
        )
        if not eligibility["eligible"]:
            raise serializers.ValidationError({"detail": eligibility["reason"]})

        attrs["eligibility"] = eligibility
        return attrs

    def create(self, validated_data):
        return self.context["create_rating_review"](
            reviewer=self.context["request"].user,
            context=validated_data["context"],
            source_id=validated_data["source_id"],
            rating=validated_data["rating"],
            comment=validated_data.get("comment", ""),
        )

