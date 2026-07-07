from typing import Optional

from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.common.enums import EventStatus, RSVPStatus
from apps.events.models import Event, EventRSVP
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


def build_event_relevance_signals(event):
    return {
        "fields": _clean_string_list(getattr(event, "field_signals", [])),
        "skills": _clean_string_list(getattr(event, "related_skills", [])),
        "courses": _clean_int_list(getattr(event, "related_course_ids", [])),
        "participation": {
            "signals": _clean_string_list(getattr(event, "participation_signals", [])),
            "rsvp_open": bool(getattr(event, "rsvp_open", False)),
            "current_attendees": int(getattr(event, "current_attendees", 0) or 0),
            "total_rsvp_count": int(getattr(event, "total_rsvp_count", 0) or 0),
            "attended_count": int(getattr(event, "attended_count", 0) or 0),
        },
        "organization_verification_status": getattr(
            getattr(event, "organization", None),
            "verification_status",
            "unverified",
        ),
    }


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
    relevance_signals = serializers.SerializerMethodField()

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
            "relevance_signals",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.JSONField())
    def get_relevance_signals(self, obj):
        return build_event_relevance_signals(obj.event)


class EventAttendeeUserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class EventAttendeeSummarySerializer(serializers.ModelSerializer):
    attendee = serializers.SerializerMethodField()
    attendance_recorded = serializers.SerializerMethodField()
    review_unlock_ready = serializers.SerializerMethodField()
    relevance_signals = serializers.SerializerMethodField()

    class Meta:
        model = EventRSVP
        fields = [
            "id",
            "status",
            "attended_at",
            "attendance_recorded",
            "review_unlock_ready",
            "attendee",
            "relevance_signals",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    @extend_schema_field(EventAttendeeUserSerializer)
    def get_attendee(self, obj):
        return {
            "id": obj.user_id,
            "full_name": obj.user.full_name,
            "email": obj.user.email,
        }

    @extend_schema_field(serializers.BooleanField())
    def get_attendance_recorded(self, obj):
        return obj.attended_at is not None

    @extend_schema_field(serializers.BooleanField())
    def get_review_unlock_ready(self, obj):
        return obj.attended_at is not None

    @extend_schema_field(serializers.JSONField())
    def get_relevance_signals(self, obj):
        return build_event_relevance_signals(obj.event)


class EventSummarySerializer(serializers.ModelSerializer):
    organization = EventOrganizationSummarySerializer(read_only=True)
    current_attendees = serializers.IntegerField(read_only=True)
    total_rsvp_count = serializers.IntegerField(read_only=True)
    interested_count = serializers.IntegerField(read_only=True)
    cancelled_count = serializers.IntegerField(read_only=True)
    attended_count = serializers.IntegerField(read_only=True)
    spots_remaining = serializers.SerializerMethodField()
    viewer_rsvp_status = serializers.SerializerMethodField()
    relevance_signals = serializers.SerializerMethodField()

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
            "total_rsvp_count",
            "interested_count",
            "cancelled_count",
            "attended_count",
            "spots_remaining",
            "rsvp_open",
            "status",
            "starts_at",
            "ends_at",
            "viewer_rsvp_status",
            "tags",
            "field_signals",
            "related_skills",
            "related_course_ids",
            "participation_signals",
            "relevance_signals",
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

    @extend_schema_field(serializers.JSONField())
    def get_relevance_signals(self, obj):
        return build_event_relevance_signals(obj)


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


class AdminEventOversightSerializer(EventSummarySerializer):
    reviewed_by_email = serializers.EmailField(source="admin_reviewed_by.email", read_only=True)
    meeting_url = serializers.CharField(read_only=True)

    class Meta(EventSummarySerializer.Meta):
        fields = EventSummarySerializer.Meta.fields + [
            "meeting_url",
            "admin_review_notes",
            "reviewed_by_email",
            "admin_reviewed_at",
        ]
        read_only_fields = fields


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
            "field_signals",
            "related_skills",
            "related_course_ids",
            "participation_signals",
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

        for list_field in ["tags", "field_signals", "related_skills", "participation_signals"]:
            if list_field in attrs:
                attrs[list_field] = _clean_string_list(attrs.get(list_field))
        if "related_course_ids" in attrs:
            attrs["related_course_ids"] = _clean_int_list(attrs.get("related_course_ids"))
        return attrs

    def create(self, validated_data):
        organization = self.context["organization"]
        return Event.objects.create(organization=organization, **validated_data)


class EventRSVPWriteSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=RSVPStatus.choices, default=RSVPStatus.GOING)


class EventAttendeeUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=RSVPStatus.choices, required=False)
    attended = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if "status" not in attrs and "attended" not in attrs:
            raise serializers.ValidationError(
                {"detail": "Provide at least one attendee update field."}
            )

        if attrs.get("attended") is True and attrs.get("status") == RSVPStatus.CANCELLED:
            raise serializers.ValidationError(
                {"attended": "Cancelled attendees cannot be marked as attended."}
            )
        return attrs


class AdminEventOversightDecisionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=EventStatus.choices, required=False)
    rsvp_open = serializers.BooleanField(required=False)
    review_notes = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)

    def validate(self, attrs):
        if "status" not in attrs and "rsvp_open" not in attrs and "review_notes" not in attrs:
            raise serializers.ValidationError(
                {"detail": "Provide at least one oversight update field."}
            )
        return attrs


def annotate_event_queryset(queryset):
    return queryset.select_related("organization").annotate(
        total_rsvp_count=Count("rsvps", distinct=True),
        current_attendees=Count(
            "rsvps",
            filter=Q(rsvps__status=RSVPStatus.GOING),
            distinct=True,
        ),
        interested_count=Count(
            "rsvps",
            filter=Q(rsvps__status=RSVPStatus.INTERESTED),
            distinct=True,
        ),
        cancelled_count=Count(
            "rsvps",
            filter=Q(rsvps__status=RSVPStatus.CANCELLED),
            distinct=True,
        ),
        attended_count=Count(
            "rsvps",
            filter=Q(rsvps__attended_at__isnull=False),
            distinct=True,
        ),
    )
