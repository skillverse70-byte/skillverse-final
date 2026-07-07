from django.db import transaction
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import GenericAPIView, ListAPIView, RetrieveAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response

from apps.common.enums import EventStatus, RSVPStatus
from apps.common.permissions import IsOrganizationActor, IsRegularUser
from apps.events.models import Event, EventRSVP
from apps.events.serializers import (
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
        response_serializer = EventDetailSerializer(
            event,
            context={"request": request, "include_meeting_url": True},
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)


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

        response_serializer = EventRSVPSummarySerializer(rsvp)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
