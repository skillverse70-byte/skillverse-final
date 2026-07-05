from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.generics import GenericAPIView
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from django.contrib.auth import get_user_model

from apps.common.permissions import IsRegularUser
from apps.common.enums import SkillSwapStatus
from apps.swaps.serializers import (
    MatchSuggestionSerializer,
    SkillSwapActionSerializer,
    SkillSwapRequestCreateSerializer,
    SkillSwapRequestSerializer,
)
from apps.swaps.services import (
    create_swap_request,
    get_active_swap_between_users,
    get_swap_requests_for_user,
    refresh_match_suggestions_for_user,
    transition_swap_request,
)

User = get_user_model()


@extend_schema(tags=["swaps"], responses={200: MatchSuggestionSerializer(many=True)})
class MatchSuggestionListView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]

    def get(self, request):
        suggestions = refresh_match_suggestions_for_user(request.user)
        serializer = MatchSuggestionSerializer(suggestions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["swaps"],
    request=SkillSwapRequestCreateSerializer,
    responses={200: SkillSwapRequestSerializer(many=True), 201: SkillSwapRequestSerializer},
)
class SkillSwapRequestListCreateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]
    serializer_class = SkillSwapRequestCreateSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update(
            {
                "user_model": User,
                "create_swap_request": create_swap_request,
                "get_active_swap_between_users": get_active_swap_between_users,
            }
        )
        return context

    def get(self, request):
        queryset = get_swap_requests_for_user(request.user)
        serializer = SkillSwapRequestSerializer(
            queryset,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        swap_request = serializer.save()
        response_serializer = SkillSwapRequestSerializer(
            swap_request,
            context={"request": request},
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["swaps"], responses={200: SkillSwapRequestSerializer})
class SkillSwapRequestDetailView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]

    def get_object(self, request, pk):
        swap_request = (
            get_swap_requests_for_user(request.user)
            .filter(id=pk)
            .first()
        )
        if swap_request is None:
            raise ValidationError({"detail": "Swap request was not found."})
        return swap_request

    def get(self, request, pk):
        swap_request = self.get_object(request, pk)
        serializer = SkillSwapRequestSerializer(swap_request, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class BaseSkillSwapActionView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]
    serializer_class = SkillSwapActionSerializer
    target_status = None

    def get_swap_request(self, request, pk):
        swap_request = (
            get_swap_requests_for_user(request.user)
            .filter(id=pk)
            .first()
        )
        if swap_request is None:
            raise ValidationError({"detail": "Swap request was not found."})
        return swap_request

    def validate_transition(self, request, swap_request):
        raise NotImplementedError

    @extend_schema(request=SkillSwapActionSerializer, responses={200: SkillSwapRequestSerializer})
    def post(self, request, pk):
        swap_request = self.get_swap_request(request, pk)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = serializer.validated_data.get("note", "")
        self.validate_transition(request, swap_request)
        transition_swap_request(
            swap_request=swap_request,
            changed_by=request.user,
            to_status=self.target_status,
            note=note,
        )
        swap_request = self.get_swap_request(request, pk)
        response_serializer = SkillSwapRequestSerializer(
            swap_request,
            context={"request": request},
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)


@extend_schema(tags=["swaps"])
class SkillSwapAcceptView(BaseSkillSwapActionView):
    target_status = SkillSwapStatus.ACCEPTED

    def validate_transition(self, request, swap_request):
        if request.user != swap_request.recipient:
            raise PermissionDenied("Only the recipient can accept this swap request.")
        if swap_request.status != SkillSwapStatus.PENDING:
            raise ValidationError({"detail": "Only pending swap requests can be accepted."})


@extend_schema(tags=["swaps"])
class SkillSwapRejectView(BaseSkillSwapActionView):
    target_status = SkillSwapStatus.REJECTED

    def validate_transition(self, request, swap_request):
        if request.user != swap_request.recipient:
            raise PermissionDenied("Only the recipient can reject this swap request.")
        if swap_request.status != SkillSwapStatus.PENDING:
            raise ValidationError({"detail": "Only pending swap requests can be rejected."})


@extend_schema(tags=["swaps"])
class SkillSwapCancelView(BaseSkillSwapActionView):
    target_status = SkillSwapStatus.CANCELLED

    def validate_transition(self, request, swap_request):
        if swap_request.status == SkillSwapStatus.PENDING:
            if request.user != swap_request.requester:
                raise PermissionDenied("Only the requester can cancel a pending swap request.")
            return

        if swap_request.status == SkillSwapStatus.ACCEPTED:
            if request.user not in (swap_request.requester, swap_request.recipient):
                raise PermissionDenied("Only participants can cancel an accepted swap request.")
            return

        raise ValidationError({"detail": "Only pending or accepted swap requests can be cancelled."})
