from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.common.enums import LearningSessionStatus, SkillSwapStatus
from apps.sessions.models import LearningSession
from apps.swaps.models import SkillSwapRequest


class SessionParticipantSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()


class LearningSessionSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()
    counterparty = serializers.SerializerMethodField()

    class Meta:
        model = LearningSession
        fields = (
            "id",
            "swap_request",
            "title",
            "description",
            "status",
            "scheduled_start_at",
            "scheduled_end_at",
            "timezone",
            "meeting_url",
            "meeting_notes",
            "location_note",
            "completion_notes",
            "metadata",
            "completed_at",
            "cancelled_at",
            "participants",
            "counterparty",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def _serialize_user(self, user):
        return {
            "id": user.id,
            "full_name": user.full_name,
        }

    @extend_schema_field(SessionParticipantSerializer(many=True))
    def get_participants(self, obj):
        return [
            self._serialize_user(obj.swap_request.requester),
            self._serialize_user(obj.swap_request.recipient),
        ]

    @extend_schema_field(SessionParticipantSerializer(allow_null=True))
    def get_counterparty(self, obj):
        request = self.context.get("request")
        if request is None:
            return None

        if request.user == obj.swap_request.requester:
            return self._serialize_user(obj.swap_request.recipient)
        if request.user == obj.swap_request.recipient:
            return self._serialize_user(obj.swap_request.requester)
        return None


class LearningSessionCreateSerializer(serializers.Serializer):
    swap_request_id = serializers.IntegerField()
    title = serializers.CharField(max_length=160)
    description = serializers.CharField(required=False, allow_blank=True)
    scheduled_start_at = serializers.DateTimeField()
    scheduled_end_at = serializers.DateTimeField(required=False, allow_null=True)
    timezone = serializers.CharField(required=False, allow_blank=True, max_length=64)
    meeting_url = serializers.URLField(required=False, allow_blank=True)
    meeting_notes = serializers.CharField(required=False, allow_blank=True, max_length=255)
    location_note = serializers.CharField(required=False, allow_blank=True, max_length=255)
    metadata = serializers.JSONField(required=False)

    def validate_swap_request_id(self, value):
        user = self.context["request"].user
        try:
            swap_request = SkillSwapRequest.objects.select_related(
                "requester",
                "recipient",
                "match_suggestion",
            ).get(id=value)
        except SkillSwapRequest.DoesNotExist as exc:
            raise serializers.ValidationError("The selected swap request was not found.") from exc

        if user not in (swap_request.requester, swap_request.recipient):
            raise serializers.ValidationError("You are not a participant in this swap request.")
        if swap_request.status != SkillSwapStatus.ACCEPTED:
            raise serializers.ValidationError(
                "Learning sessions can only be planned for accepted swap requests."
            )

        self.context["swap_request"] = swap_request
        return value

    def validate(self, attrs):
        scheduled_start_at = attrs.get("scheduled_start_at")
        scheduled_end_at = attrs.get("scheduled_end_at")

        if scheduled_end_at and scheduled_end_at <= scheduled_start_at:
            raise serializers.ValidationError(
                {"scheduled_end_at": "Session end time must be after the start time."}
            )

        attrs["description"] = (attrs.get("description") or "").strip()
        attrs["timezone"] = (attrs.get("timezone") or "").strip()
        attrs["meeting_notes"] = (attrs.get("meeting_notes") or "").strip()
        attrs["location_note"] = (attrs.get("location_note") or "").strip()
        attrs["metadata"] = attrs.get("metadata") or {}
        return attrs

    def create(self, validated_data):
        return self.context["create_learning_session"](
            swap_request=self.context["swap_request"],
            created_by=self.context["request"].user,
            title=validated_data["title"],
            description=validated_data.get("description", ""),
            scheduled_start_at=validated_data["scheduled_start_at"],
            scheduled_end_at=validated_data.get("scheduled_end_at"),
            timezone=validated_data.get("timezone", ""),
            meeting_url=validated_data.get("meeting_url", ""),
            meeting_notes=validated_data.get("meeting_notes", ""),
            location_note=validated_data.get("location_note", ""),
            metadata=validated_data.get("metadata", {}),
        )


class LearningSessionUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, max_length=160)
    description = serializers.CharField(required=False, allow_blank=True)
    scheduled_start_at = serializers.DateTimeField(required=False)
    scheduled_end_at = serializers.DateTimeField(required=False, allow_null=True)
    timezone = serializers.CharField(required=False, allow_blank=True, max_length=64)
    meeting_url = serializers.URLField(required=False, allow_blank=True)
    meeting_notes = serializers.CharField(required=False, allow_blank=True, max_length=255)
    location_note = serializers.CharField(required=False, allow_blank=True, max_length=255)
    completion_notes = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(required=False, choices=LearningSessionStatus.choices)
    metadata = serializers.JSONField(required=False)

    def validate(self, attrs):
        session = self.context["session"]
        start_at = attrs.get("scheduled_start_at", session.scheduled_start_at)
        end_at = attrs.get("scheduled_end_at", session.scheduled_end_at)

        if end_at and end_at <= start_at:
            raise serializers.ValidationError(
                {"scheduled_end_at": "Session end time must be after the start time."}
            )

        if attrs.get("status") == LearningSessionStatus.COMPLETED and not attrs.get(
            "completion_notes",
            session.completion_notes,
        ):
            raise serializers.ValidationError(
                {"completion_notes": "Completion notes are required when marking a session completed."}
            )

        for field_name in ("description", "timezone", "meeting_notes", "location_note", "completion_notes"):
            if field_name in attrs:
                attrs[field_name] = (attrs.get(field_name) or "").strip()

        if "metadata" in attrs and attrs["metadata"] is None:
            attrs["metadata"] = {}

        return attrs

    def update(self, instance, validated_data):
        return self.context["update_learning_session"](
            session=instance,
            updated_by=self.context["request"].user,
            **validated_data,
        )

