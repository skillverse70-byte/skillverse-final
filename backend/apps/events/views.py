from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import GenericAPIView, ListAPIView, RetrieveAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response

from apps.audit.services import record_audit_log
from apps.common.enums import EventStatus, RSVPStatus
from apps.common.permissions import IsAdminActor, IsOrganizationActor, IsRegularUser
from apps.events.models import Event, EventRSVP
from apps.events.serializers import (
    AdminEventOversightDecisionSerializer,
    AdminEventOversightSerializer,
    EventAttendeeSummarySerializer,
    EventAttendeeUpdateSerializer,
    EventDetailSerializer,
    EventRSVPSummarySerializer,
    EventRSVPWriteSerializer,
    EventSummarySerializer,
    EventWriteSerializer,
    annotate_event_queryset,
)
from apps.organizations.models import Organization


def public_event_queryset():
    return annotate_event_queryset(Event.objects.filter(status__in=[EventStatus.UPCOMING, EventStatus.LIVE]))


def organization_event_queryset(user):
    return annotate_event_queryset(Event.objects.filter(organization__owner=user))


def admin_event_queryset():
    return annotate_event_queryset(
        Event.objects.select_related("organization", "organization__owner", "admin_reviewed_by")
    )


def with_viewer_rsvp(event, user):
    if getattr(user, "is_authenticated", False):
        event._viewer_rsvp = EventRSVP.objects.filter(event=event, user=user).first()
    return event


def rsvp_queryset_for_user(user):
    return (
        EventRSVP.objects.filter(user=user)
        .select_related("event", "event__organization")
        .order_by("event__starts_at", "-updated_at", "-id")
    )


def organization_attendee_queryset(user):
    return (
        EventRSVP.objects.filter(event__organization__owner=user)
        .select_related("user", "event", "event__organization")
        .order_by("event__starts_at", "-updated_at", "-id")
    )


def organization_event_for_user(user, event_id):
    event = organization_event_queryset(user).filter(pk=event_id).first()
    if event is None:
        raise NotFound("Event was not found.")
    return event


@extend_schema_view(
    get=extend_schema(
        tags=["events"],
        operation_id="events_public_list",
        responses={200: EventSummarySerializer(many=True)},
    )
)
class EventListView(ListAPIView):
    serializer_class = EventSummarySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = public_event_queryset()
        organization_id = self.request.query_params.get("organization_id")
        status_value = self.request.query_params.get("status")
        category = self.request.query_params.get("category")
        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)
        if status_value:
            queryset = queryset.filter(status=status_value)
        if category:
            queryset = queryset.filter(category__iexact=category)
        return queryset


@extend_schema_view(
    get=extend_schema(
        tags=["events"],
        operation_id="events_public_retrieve",
        responses={200: EventDetailSerializer},
    )
)
class EventDetailView(RetrieveAPIView):
    serializer_class = EventDetailSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return public_event_queryset()

    def retrieve(self, request, *args, **kwargs):
        instance = with_viewer_rsvp(self.get_object(), request.user)
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["events"],
        operation_id="events_manage_list",
        responses={200: EventDetailSerializer(many=True)},
    ),
    post=extend_schema(
        tags=["events"],
        operation_id="events_manage_create",
        request=EventWriteSerializer,
        responses={201: EventDetailSerializer},
    ),
)
class OrganizationEventListCreateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]
    serializer_class = EventWriteSerializer

    def get_organization(self):
        return Organization.objects.get(owner=self.request.user)

    def serialize_event(self, instance, many=False):
        if not many:
            instance = organization_event_queryset(self.request.user).filter(pk=instance.pk).first() or instance
        return EventDetailSerializer(
            instance,
            many=many,
            context={"request": self.request, "include_meeting_url": True},
        )

    def get(self, request):
        queryset = organization_event_queryset(request.user)
        serializer = self.serialize_event(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = self.get_serializer(
            data=request.data,
            context={"request": request, "organization": self.get_organization()},
        )
        serializer.is_valid(raise_exception=True)
        event = serializer.save()
        response_serializer = self.serialize_event(event)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(
        tags=["events"],
        operation_id="events_manage_retrieve",
        responses={200: EventDetailSerializer},
    ),
    patch=extend_schema(
        tags=["events"],
        operation_id="events_manage_update",
        request=EventWriteSerializer,
        responses={200: EventDetailSerializer},
    ),
    put=extend_schema(
        tags=["events"],
        operation_id="events_manage_replace",
        request=EventWriteSerializer,
        responses={200: EventDetailSerializer},
    ),
    delete=extend_schema(
        tags=["events"],
        operation_id="events_manage_delete",
        responses={204: None},
    ),
)
class OrganizationEventDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]

    def get_queryset(self):
        return organization_event_queryset(self.request.user)

    def get_serializer_class(self):
        if self.request.method in permissions.SAFE_METHODS:
            return EventDetailSerializer
        return EventWriteSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["organization"] = Organization.objects.get(owner=self.request.user)
        return context

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = EventDetailSerializer(
            instance,
            context={"request": request, "include_meeting_url": True},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        event = serializer.save()
        event = organization_event_queryset(request.user).filter(pk=event.pk).first() or event
        response_serializer = EventDetailSerializer(
            event,
            context={"request": request, "include_meeting_url": True},
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        if instance.rsvps.exists():
            raise ValidationError(
                {
                    "detail": (
                        "This event already has attendee records. Cancel or complete the event "
                        "instead of deleting it."
                    )
                }
            )
        instance.delete()


@extend_schema_view(
    get=extend_schema(
        tags=["events"],
        operation_id="events_manage_attendees_list",
        responses={200: EventAttendeeSummarySerializer(many=True)},
    )
)
class OrganizationEventAttendeeListView(ListAPIView):
    serializer_class = EventAttendeeSummarySerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]

    def get_queryset(self):
        event = organization_event_for_user(self.request.user, self.kwargs["pk"])
        queryset = organization_attendee_queryset(self.request.user).filter(event=event)
        status_value = self.request.query_params.get("status")
        attended = self.request.query_params.get("attended")

        if status_value:
            queryset = queryset.filter(status=status_value)
        if attended is not None:
            normalized = attended.strip().lower()
            if normalized in {"true", "1", "yes"}:
                queryset = queryset.filter(attended_at__isnull=False)
            elif normalized in {"false", "0", "no"}:
                queryset = queryset.filter(attended_at__isnull=True)
        return queryset


@extend_schema_view(
    patch=extend_schema(
        tags=["events"],
        operation_id="events_manage_attendees_update",
        request=EventAttendeeUpdateSerializer,
        responses={200: EventAttendeeSummarySerializer},
    )
)
class OrganizationEventAttendeeDetailView(GenericAPIView):
    serializer_class = EventAttendeeUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]

    def get_object(self):
        event = organization_event_for_user(self.request.user, self.kwargs["pk"])
        attendee = organization_attendee_queryset(self.request.user).filter(
            event=event,
            id=self.kwargs["attendee_pk"],
        ).first()
        if attendee is None:
            raise NotFound("Attendee record was not found.")
        return attendee

    @transaction.atomic
    def patch(self, request, pk, attendee_pk):
        attendee = self.get_object()
        serializer = self.get_serializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)

        next_status = serializer.validated_data.get("status", attendee.status)
        mark_attended = serializer.validated_data.get("attended", None)

        if mark_attended is True and next_status != RSVPStatus.GOING:
            raise ValidationError({"attended": "Only attendees with Going status can be marked as attended."})

        attendee.status = next_status
        if mark_attended is True:
            attendee.attended_at = attendee.attended_at or timezone.now()
        elif mark_attended is False or next_status != RSVPStatus.GOING:
            attendee.attended_at = None

        attendee.save(update_fields=["status", "attended_at", "updated_at"])
        from apps.notifications.services import notify_event_attendance_updated

        transaction.on_commit(lambda: notify_event_attendance_updated(attendee))
        response_serializer = EventAttendeeSummarySerializer(attendee)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["events", "admin"],
        operation_id="events_admin_list",
        responses={200: AdminEventOversightSerializer(many=True)},
    )
)
class AdminEventOversightListView(ListAPIView):
    serializer_class = AdminEventOversightSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]

    def get_queryset(self):
        queryset = admin_event_queryset()
        status_value = self.request.query_params.get("status")
        organization_id = self.request.query_params.get("organization_id")
        verification_status = self.request.query_params.get("verification_status")
        if status_value:
            queryset = queryset.filter(status=status_value)
        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)
        if verification_status:
            queryset = queryset.filter(organization__verification_status=verification_status)
        return queryset


@extend_schema_view(
    post=extend_schema(
        tags=["events", "admin"],
        operation_id="events_admin_decision",
        request=AdminEventOversightDecisionSerializer,
        responses={200: AdminEventOversightSerializer},
    )
)
class AdminEventOversightDecisionView(GenericAPIView):
    serializer_class = AdminEventOversightDecisionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]

    def post(self, request, pk):
        event = admin_event_queryset().filter(pk=pk).first()
        if event is None:
            raise NotFound("Event was not found.")

        serializer = self.get_serializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)

        if "status" in serializer.validated_data:
            event.status = serializer.validated_data["status"]
        if "rsvp_open" in serializer.validated_data:
            event.rsvp_open = serializer.validated_data["rsvp_open"]
        if "review_notes" in serializer.validated_data:
            event.admin_review_notes = serializer.validated_data.get("review_notes", "")
        event.admin_reviewed_by = request.user
        event.admin_reviewed_at = timezone.now()
        event.save(
            update_fields=[
                "status",
                "rsvp_open",
                "admin_review_notes",
                "admin_reviewed_by",
                "admin_reviewed_at",
                "updated_at",
            ]
        )

        record_audit_log(
            actor=request.user,
            action="event.admin.reviewed",
            target_type="event",
            target_id=event.id,
            summary=f"Admin reviewed event {event.title}.",
            metadata={
                "status": event.status,
                "rsvp_open": event.rsvp_open,
                "review_notes": event.admin_review_notes,
            },
        )

        refreshed = admin_event_queryset().filter(pk=event.pk).first() or event
        from apps.notifications.services import notify_event_admin_review

        transaction.on_commit(lambda: notify_event_admin_review(event))
        return Response(
            AdminEventOversightSerializer(refreshed).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    get=extend_schema(
        tags=["events"],
        operation_id="events_rsvp_list",
        responses={200: EventRSVPSummarySerializer(many=True)},
    )
)
class RegularUserRSVPListView(ListAPIView):
    serializer_class = EventRSVPSummarySerializer
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]

    def get_queryset(self):
        return rsvp_queryset_for_user(self.request.user)


@extend_schema_view(
    post=extend_schema(
        tags=["events"],
        operation_id="events_rsvp_create_or_update",
        request=EventRSVPWriteSerializer,
        responses={200: EventRSVPSummarySerializer},
    )
)
class RegularUserRSVPView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]
    serializer_class = EventRSVPWriteSerializer

    def get_event(self):
        event = Event.objects.select_related("organization").filter(pk=self.kwargs["pk"]).first()
        if event is None:
            raise NotFound("Event was not found.")
        return event

    def validate_event_for_rsvp(self, event, target_status):
        if event.status not in [EventStatus.UPCOMING, EventStatus.LIVE]:
            raise ValidationError({"detail": "This event is no longer accepting RSVPs."})
        if not event.rsvp_open:
            raise ValidationError({"detail": "RSVP is closed for this event."})
        if target_status != RSVPStatus.GOING:
            return

        existing_rsvp = EventRSVP.objects.filter(event=event, user=self.request.user).first()
        if existing_rsvp is not None and existing_rsvp.status == RSVPStatus.GOING:
            return
        if event.max_attendees is None:
            return

        attendee_count = EventRSVP.objects.filter(event=event, status=RSVPStatus.GOING).count()
        if attendee_count >= event.max_attendees:
            raise ValidationError({"detail": "This event is already full."})

    @transaction.atomic
    def post(self, request, pk):
        event = self.get_event()
        serializer = self.get_serializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        target_status = serializer.validated_data.get("status", RSVPStatus.GOING)
        self.validate_event_for_rsvp(event, target_status)

        rsvp, created = EventRSVP.objects.get_or_create(
            event=event,
            user=request.user,
            defaults={"status": target_status},
        )
        if not created and rsvp.status != target_status:
            rsvp.status = target_status
            if target_status != RSVPStatus.GOING:
                rsvp.attended_at = None
            rsvp.save(update_fields=["status", "attended_at", "updated_at"])

        from apps.notifications.services import notify_event_rsvp_changed

        transaction.on_commit(lambda: notify_event_rsvp_changed(rsvp, created=created))
        response_serializer = EventRSVPSummarySerializer(rsvp)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
