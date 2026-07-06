from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.common.enums import SkillSwapStatus
from apps.messaging.models import MessageThread, ThreadMessage
from apps.swaps.models import SkillSwapRequest


class MessagingParticipantSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    bio = serializers.CharField()
    interests_summary = serializers.CharField()
    experience_level = serializers.CharField(allow_blank=True)


class ThreadMessageSenderSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()


class ThreadMessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()

    class Meta:
        model = ThreadMessage
        fields = (
            "id",
            "message_type",
            "content",
            "resource_url",
            "resource_label",
            "sender",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    @extend_schema_field(ThreadMessageSenderSerializer)
    def get_sender(self, obj):
        return {
            "id": obj.sender.id,
            "full_name": obj.sender.full_name,
        }


class MessageThreadSerializer(serializers.ModelSerializer):
    counterparty = serializers.SerializerMethodField()
    latest_message = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    exchange_summary = serializers.SerializerMethodField()
    can_message = serializers.SerializerMethodField()

    class Meta:
        model = MessageThread
        fields = (
            "id",
            "swap_request",
            "counterparty",
            "my_role",
            "exchange_summary",
            "can_message",
            "latest_message",
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
        return bool(request and request.user == obj.swap_request.requester)

    @extend_schema_field(MessagingParticipantSerializer)
    def get_counterparty(self, obj):
        if self._is_requester_view(obj):
            return self._serialize_user(obj.swap_request.recipient)
        return self._serialize_user(obj.swap_request.requester)

    @extend_schema_field(str)
    def get_my_role(self, obj):
        if self._is_requester_view(obj):
            return "requester"
        return "recipient"

    @extend_schema_field(str)
    def get_exchange_summary(self, obj):
        snapshot = getattr(obj.swap_request.match_suggestion, "context_snapshot", {}) or {}
        if self._is_requester_view(obj):
            teaching = snapshot.get("can_teach_match", [])
            learning = snapshot.get("can_learn_from_match", [])
        else:
            teaching = snapshot.get("can_learn_from_match", [])
            learning = snapshot.get("can_teach_match", [])

        teaching_text = ", ".join(skill["name"] for skill in teaching[:2])
        learning_text = ", ".join(skill["name"] for skill in learning[:2])

        if teaching_text and learning_text:
            return f"You teach {teaching_text} and learn {learning_text}."
        if teaching_text:
            return f"You teach {teaching_text}."
        if learning_text:
            return f"You learn {learning_text}."
        return "Use this thread to coordinate your accepted skill swap."

    @extend_schema_field(ThreadMessageSerializer)
    def get_latest_message(self, obj):
        latest_message = obj.messages.order_by("-created_at", "-id").first()
        if latest_message is None:
            return None
        return ThreadMessageSerializer(latest_message).data

    @extend_schema_field(bool)
    def get_can_message(self, obj):
        return obj.swap_request.status == SkillSwapStatus.ACCEPTED


class MessageThreadCreateSerializer(serializers.Serializer):
    swap_request_id = serializers.IntegerField()

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
                "A messaging thread can only be created after the swap request is accepted."
            )

        self.context["swap_request"] = swap_request
        return value

    def create(self, validated_data):
        return self.context["ensure_message_thread_for_swap_request"](
            swap_request=self.context["swap_request"],
            created_by=self.context["request"].user,
        )


class ThreadMessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField(required=False, allow_blank=True)
    resource_url = serializers.URLField(required=False, allow_blank=True)
    resource_label = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate(self, attrs):
        content = (attrs.get("content") or "").strip()
        resource_url = (attrs.get("resource_url") or "").strip()
        resource_label = (attrs.get("resource_label") or "").strip()

        if not content and not resource_url:
            raise serializers.ValidationError(
                {"detail": "Provide message content or a resource link to send a thread message."}
            )

        attrs["content"] = content
        attrs["resource_url"] = resource_url
        attrs["resource_label"] = resource_label
        return attrs

    def create(self, validated_data):
        return self.context["create_thread_message"](
            thread=self.context["thread"],
            sender=self.context["request"].user,
            content=validated_data.get("content", ""),
            resource_url=validated_data.get("resource_url", ""),
            resource_label=validated_data.get("resource_label", ""),
        )
