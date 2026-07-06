from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.generics import GenericAPIView
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.common.permissions import IsRegularUser
from apps.sessions.serializers import (
    LearningSessionCreateSerializer,
    LearningSessionSerializer,
    LearningSessionUpdateSerializer,
)
from apps.sessions.services import (
    create_learning_session,
    get_learning_session_for_user,
    get_learning_sessions_for_user,
    update_learning_session,
)


@extend_schema(
    tags=["sessions"],
    request=LearningSessionCreateSerializer,
    responses={200: LearningSessionSerializer(many=True), 201: LearningSessionSerializer},
)
class LearningSessionListCreateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]
    serializer_class = LearningSessionCreateSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"create_learning_session": create_learning_session})
        return context

    def get(self, request):
        queryset = get_learning_sessions_for_user(request.user)
        swap_request_id = request.query_params.get("swap_request")
        if swap_request_id:
            queryset = queryset.filter(swap_request_id=swap_request_id)
        serializer = LearningSessionSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = serializer.save()
        response_serializer = LearningSessionSerializer(session, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["sessions"],
    request=LearningSessionUpdateSerializer,
    responses={200: LearningSessionSerializer},
)
class LearningSessionDetailView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]
    serializer_class = LearningSessionUpdateSerializer

    def get_object(self, request, pk):
        session = get_learning_session_for_user(user=request.user, session_id=pk)
        if session is None:
            raise ValidationError({"detail": "Learning session was not found."})
        return session

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"update_learning_session": update_learning_session})
        return context

    def get(self, request, pk):
        session = self.get_object(request, pk)
        serializer = LearningSessionSerializer(session, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        session = self.get_object(request, pk)
        serializer = self.get_serializer(
            data=request.data,
            partial=True,
            context={
                **self.get_serializer_context(),
                "request": request,
                "session": session,
            },
        )
        serializer.is_valid(raise_exception=True)
        session = serializer.update(session, serializer.validated_data)
        response_serializer = LearningSessionSerializer(session, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)

