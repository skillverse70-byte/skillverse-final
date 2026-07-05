from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.common.enums import Role, SkillSwapStatus
from apps.skills.serializers import FieldInterestSerializer, SkillSerializer
from apps.swaps.models import MatchSuggestion, SkillSwapRequest, SkillSwapStatusHistory


class MatchTargetUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    bio = serializers.CharField()
    interests_summary = serializers.CharField()
    experience_level = serializers.CharField(allow_blank=True)


class MatchSuggestionSerializer(serializers.ModelSerializer):
    target_user = serializers.SerializerMethodField()
    can_learn_from_match = serializers.SerializerMethodField()
    can_teach_match = serializers.SerializerMethodField()
    shared_fields = serializers.SerializerMethodField()
    shared_skill_interests = serializers.SerializerMethodField()
    target_offered_skills = serializers.SerializerMethodField()
    target_requested_skills = serializers.SerializerMethodField()
    target_field_interests = serializers.SerializerMethodField()

    class Meta:
        model = MatchSuggestion
        fields = (
            "id",
            "suggestion_type",
            "score",
            "rationale",
            "target_user",
            "can_learn_from_match",
            "can_teach_match",
            "shared_fields",
            "shared_skill_interests",
            "target_offered_skills",
            "target_requested_skills",
            "target_field_interests",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    @extend_schema_field(MatchTargetUserSerializer)
    def get_target_user(self, obj):
        return obj.context_snapshot.get("target_user", {})

    @extend_schema_field(SkillSerializer(many=True))
    def get_can_learn_from_match(self, obj):
        return obj.context_snapshot.get("can_learn_from_match", [])

    @extend_schema_field(SkillSerializer(many=True))
    def get_can_teach_match(self, obj):
        return obj.context_snapshot.get("can_teach_match", [])

    @extend_schema_field(FieldInterestSerializer(many=True))
    def get_shared_fields(self, obj):
        return obj.context_snapshot.get("shared_fields", [])

    @extend_schema_field(SkillSerializer(many=True))
    def get_shared_skill_interests(self, obj):
        return obj.context_snapshot.get("shared_skill_interests", [])

    @extend_schema_field(SkillSerializer(many=True))
    def get_target_offered_skills(self, obj):
        return obj.context_snapshot.get("target_offered_skills", [])

    @extend_schema_field(SkillSerializer(many=True))
    def get_target_requested_skills(self, obj):
        return obj.context_snapshot.get("target_requested_skills", [])

    @extend_schema_field(FieldInterestSerializer(many=True))
    def get_target_field_interests(self, obj):
        return obj.context_snapshot.get("target_field_interests", [])


class SwapParticipantSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    bio = serializers.CharField()
    interests_summary = serializers.CharField()
    experience_level = serializers.CharField(allow_blank=True)


class SkillSwapStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_user = serializers.SerializerMethodField()

    class Meta:
        model = SkillSwapStatusHistory
        fields = (
            "id",
            "from_status",
            "to_status",
            "note",
            "changed_by_user",
            "created_at",
        )
        read_only_fields = fields

    @extend_schema_field(SwapParticipantSerializer)
    def get_changed_by_user(self, obj):
        profile = getattr(obj.changed_by, "regular_profile", None)
        return {
            "id": obj.changed_by.id,
            "full_name": obj.changed_by.full_name,
            "bio": getattr(profile, "bio", ""),
            "interests_summary": getattr(profile, "interests_summary", ""),
            "experience_level": getattr(profile, "experience_level", ""),
        }


class SkillSwapRequestSerializer(serializers.ModelSerializer):
    requester = serializers.SerializerMethodField()
    recipient = serializers.SerializerMethodField()
    counterparty = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    my_teaching_skills = serializers.SerializerMethodField()
    my_learning_skills = serializers.SerializerMethodField()
    exchange_summary = serializers.SerializerMethodField()
    can_accept = serializers.SerializerMethodField()
    can_reject = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    status_history = SkillSwapStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = SkillSwapRequest
        fields = (
            "id",
            "requester",
            "recipient",
            "counterparty",
            "my_role",
            "status",
            "my_teaching_skills",
            "my_learning_skills",
            "exchange_summary",
            "message",
            "requester_note",
            "recipient_note",
            "cancelled_reason",
            "match_suggestion",
            "responded_at",
            "can_accept",
            "can_reject",
            "can_cancel",
            "status_history",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def _serialize_user(self, user):
        profile = getattr(user, "regular_profile", None)
        return {
            "id": user.id,
            "full_name": user.full_name,
            "bio": getattr(profile, "bio", ""),
            "interests_summary": getattr(profile, "interests_summary", ""),
            "experience_level": getattr(profile, "experience_level", ""),
        }

    def _is_requester_view(self, obj):
        request = self.context.get("request")
        return bool(request and request.user == obj.requester)

    def _get_snapshot_skills(self, obj, key):
        if not obj.match_suggestion:
            return []
        return obj.match_suggestion.context_snapshot.get(key, [])

    @extend_schema_field(SwapParticipantSerializer)
    def get_requester(self, obj):
        return self._serialize_user(obj.requester)

    @extend_schema_field(SwapParticipantSerializer)
    def get_recipient(self, obj):
        return self._serialize_user(obj.recipient)

    @extend_schema_field(SwapParticipantSerializer)
    def get_counterparty(self, obj):
        request = self.context.get("request")
        if request and request.user == obj.requester:
            return self._serialize_user(obj.recipient)
        return self._serialize_user(obj.requester)

    @extend_schema_field(str)
    def get_my_role(self, obj):
        request = self.context.get("request")
        if request and request.user == obj.requester:
            return "requester"
        if request and request.user == obj.recipient:
            return "recipient"
        return ""

    @extend_schema_field(SkillSerializer(many=True))
    def get_my_teaching_skills(self, obj):
        if self._is_requester_view(obj):
            return self._get_snapshot_skills(obj, "can_teach_match")
        return self._get_snapshot_skills(obj, "can_learn_from_match")

    @extend_schema_field(SkillSerializer(many=True))
    def get_my_learning_skills(self, obj):
        if self._is_requester_view(obj):
            return self._get_snapshot_skills(obj, "can_learn_from_match")
        return self._get_snapshot_skills(obj, "can_teach_match")

    @extend_schema_field(str)
    def get_exchange_summary(self, obj):
        my_teaching_skills = self.get_my_teaching_skills(obj)
        my_learning_skills = self.get_my_learning_skills(obj)

        teaching_text = ", ".join(skill["name"] for skill in my_teaching_skills[:2])
        learning_text = ", ".join(skill["name"] for skill in my_learning_skills[:2])

        if teaching_text and learning_text:
            return f"You teach {teaching_text} and learn {learning_text}."
        if teaching_text:
            return f"You teach {teaching_text}."
        if learning_text:
            return f"You learn {learning_text}."
        return "Skill exchange details will appear once a matched overlap is available."

    @extend_schema_field(bool)
    def get_can_accept(self, obj):
        request = self.context.get("request")
        return bool(
            request
            and request.user == obj.recipient
            and obj.status == SkillSwapStatus.PENDING
        )

    @extend_schema_field(bool)
    def get_can_reject(self, obj):
        request = self.context.get("request")
        return bool(
            request
            and request.user == obj.recipient
            and obj.status == SkillSwapStatus.PENDING
        )

    @extend_schema_field(bool)
    def get_can_cancel(self, obj):
        request = self.context.get("request")
        if not request:
            return False
        if obj.status == SkillSwapStatus.PENDING and request.user == obj.requester:
            return True
        if obj.status == SkillSwapStatus.ACCEPTED and request.user in (obj.requester, obj.recipient):
            return True
        return False


class SkillSwapRequestCreateSerializer(serializers.Serializer):
    recipient_user_id = serializers.IntegerField()
    match_suggestion_id = serializers.IntegerField(required=False)
    message = serializers.CharField(required=False, allow_blank=True)
    requester_note = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate(self, attrs):
        requester = self.context["request"].user
        recipient_id = attrs["recipient_user_id"]

        if requester.id == recipient_id:
            raise serializers.ValidationError(
                {"recipient_user_id": "You cannot create a swap request with yourself."}
            )

        try:
            recipient = self.context["user_model"].objects.get(
                id=recipient_id,
                role=Role.REGULAR_USER,
            )
        except self.context["user_model"].DoesNotExist as exc:
            raise serializers.ValidationError(
                {"recipient_user_id": "The requested swap recipient was not found."}
            ) from exc

        active_request = self.context["get_active_swap_between_users"](requester, recipient)
        if active_request is not None:
            raise serializers.ValidationError(
                {"recipient_user_id": "There is already an active swap request between these users."}
            )

        match_suggestion_id = attrs.get("match_suggestion_id")
        if match_suggestion_id:
            try:
                match_suggestion = MatchSuggestion.objects.get(
                    id=match_suggestion_id,
                    source_user=requester,
                    target_user=recipient,
                )
            except MatchSuggestion.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {"match_suggestion_id": "This match suggestion is not valid for the selected recipient."}
                ) from exc
            attrs["match_suggestion"] = match_suggestion

        attrs["recipient"] = recipient
        return attrs

    def create(self, validated_data):
        return self.context["create_swap_request"](
            requester=self.context["request"].user,
            recipient=validated_data["recipient"],
            message=validated_data.get("message", ""),
            requester_note=validated_data.get("requester_note", ""),
            match_suggestion=validated_data.get("match_suggestion"),
        )


class SkillSwapActionSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)
