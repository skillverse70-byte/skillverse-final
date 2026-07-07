from typing import Optional

from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.common.enums import EventStatus, RSVPStatus
from apps.events.models import Event, EventRSVP
from apps.organizations.models import Organization


class EventOrganizationSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "type", "verification_status"]


class EventRSVPSummarySerializer(serializers.ModelSerializer):
    event_id = serializers.IntegerField(source="event.id", read_only=True)
    event_title = serializers.CharField(source="event.title", read_only=True)
    organization_id = serializers.IntegerField(source="event.organization_id", read_only=True)
    organization_name = serializers.CharField(source="event.organization.name", read_only=True)
    starts_at = serializers.DateTimeField(source="event.starts_at", read_only=True)
    ends_at = serializers.DateTimeField(source="event.ends_at", read_only=True)

    class Meta:
        model = EventRSVP
        fields = [
            "id",
            "event_id",
            "event_title",
            "organization_id",
            "organization_name",
            "status",
            "attended_at",
            "starts_at",
            "ends_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class EventSummarySerializer(serializers.ModelSerializer):
    organization = EventOrganizationSummarySerializer(read_only=True)
    current_attendees = serializers.IntegerField(read_only=True)
    spots_remaining = serializers.SerializerMethodField()
    viewer_rsvp_status = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "organization",
            "title",
            "description",
            "category",
            "location",
            "is_online",
            "cover_image_url",
            "max_attendees",
            "current_attendees",
            "spots_remaining",
            "rsvp_open",
            "status",
            "starts_at",
            "ends_at",
            "viewer_rsvp_status",
            "tags",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_spots_remaining(self, obj) -> Optional[int]:
        if obj.max_attendees is None:
            return None
        current = getattr(obj, "current_attendees", 0) or 0
        return max(obj.max_attendees - current, 0)

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_viewer_rsvp_status(self, obj) -> Optional[str]:
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return None

        viewer_rsvp = getattr(obj, "_viewer_rsvp", None)
        if viewer_rsvp is not None:
            return viewer_rsvp.status

        rsvp = EventRSVP.objects.filter(event=obj, user=request.user).first()
        return rsvp.status if rsvp else None


class EventDetailSerializer(EventSummarySerializer):
    meeting_url = serializers.SerializerMethodField()

    class Meta(EventSummarySerializer.Meta):
        fields = EventSummarySerializer.Meta.fields + ["meeting_url"]

    @extend_schema_field(serializers.CharField())
    def get_meeting_url(self, obj) -> str:
        if self.context.get("include_meeting_url"):
            return obj.meeting_url

        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return ""

        viewer_rsvp = getattr(obj, "_viewer_rsvp", None)
        if viewer_rsvp is None:
            viewer_rsvp = EventRSVP.objects.filter(event=obj, user=request.user).first()
        if not obj.is_online or viewer_rsvp is None or viewer_rsvp.status != RSVPStatus.GOING:
            return ""
        return obj.meeting_url


class EventWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "category",
            "location",
            "is_online",
            "meeting_url",
            "cover_image_url",
            "max_attendees",
            "rsvp_open",
            "status",
            "starts_at",
            "ends_at",
            "tags",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        starts_at = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends_at = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        is_online = attrs.get("is_online", getattr(self.instance, "is_online", False))
        meeting_url = attrs.get("meeting_url", getattr(self.instance, "meeting_url", ""))
        location = attrs.get("location", getattr(self.instance, "location", ""))
        status_value = attrs.get("status", getattr(self.instance, "status", EventStatus.UPCOMING))
        max_attendees = attrs.get("max_attendees", getattr(self.instance, "max_attendees", None))

        if starts_at is None:
            raise serializers.ValidationError({"starts_at": "Start time is required."})
        if ends_at is not None and ends_at <= starts_at:
            raise serializers.ValidationError({"ends_at": "End time must be after the start time."})
        if is_online and not meeting_url:
            raise serializers.ValidationError({"meeting_url": "Online events require a meeting URL."})
        if not is_online and not location:
            raise serializers.ValidationError({"location": "In-person events require a location."})
        if status_value == EventStatus.LIVE and ends_at is None:
            raise serializers.ValidationError({"ends_at": "Live events require an end time."})
        if max_attendees is not None and max_attendees < 1:
            raise serializers.ValidationError(
                {"max_attendees": "Maximum attendees must be at least 1."}
            )
        return attrs

    def create(self, validated_data):
        organization = self.context["organization"]
        return Event.objects.create(organization=organization, **validated_data)


class EventRSVPWriteSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=RSVPStatus.choices, default=RSVPStatus.GOING)


def annotate_event_queryset(queryset):
    return queryset.select_related("organization").annotate(
        current_attendees=Count(
            "rsvps",
            filter=Q(rsvps__status=RSVPStatus.GOING),
            distinct=True,
        )
    )
