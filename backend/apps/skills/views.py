from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.generics import GenericAPIView, ListAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response

from apps.accounts.models import RegularUserProfile
from apps.common.permissions import IsRegularUserOrAdmin
from apps.skills.models import FieldInterest, Skill, UserFieldInterest, UserSkill
from apps.skills.serializers import (
    FieldInterestSerializer,
    RegularUserProfileSerializer,
    RegularUserProfileUpdateSerializer,
    SkillSerializer,
    UserFieldInterestCreateSerializer,
    UserFieldInterestSerializer,
    UserSkillCreateSerializer,
    UserSkillSerializer,
    UserSkillUpdateSerializer,
)


def get_or_create_regular_profile(user):
    profile, _ = RegularUserProfile.objects.get_or_create(user=user)
    return profile


@extend_schema(tags=["profile"], responses={200: RegularUserProfileSerializer})
class CurrentRegularUserProfileView(RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUserOrAdmin]

    def get_object(self):
        return get_or_create_regular_profile(self.request.user)

    def get_serializer_class(self):
        if self.request.method in permissions.SAFE_METHODS:
            return RegularUserProfileSerializer
        return RegularUserProfileUpdateSerializer

    def retrieve(self, request, *args, **kwargs):
        serializer = RegularUserProfileSerializer(self.get_object())
        return Response(serializer.data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        profile = self.get_object()
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        response_serializer = RegularUserProfileSerializer(profile)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


@extend_schema(tags=["profile"], responses={200: UserFieldInterestSerializer(many=True)})
class UserFieldInterestListCreateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUserOrAdmin]

    def get(self, request):
        queryset = request.user.field_interest_links.select_related("field_interest")
        serializer = UserFieldInterestSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=UserFieldInterestCreateSerializer, responses={201: UserFieldInterestSerializer})
    def post(self, request):
        serializer = UserFieldInterestCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        relation = serializer.save()
        response_serializer = UserFieldInterestSerializer(relation)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["profile"], responses={204: None})
class UserFieldInterestDetailView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUserOrAdmin]

    def delete(self, request, pk):
        deleted_count, _ = UserFieldInterest.objects.filter(
            id=pk,
            user=request.user,
        ).delete()
        if not deleted_count:
            return Response({"detail": "Field interest was not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["profile"], responses={200: UserSkillSerializer(many=True)})
class UserSkillListCreateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUserOrAdmin]

    def get(self, request):
        queryset = request.user.user_skills.select_related("skill")
        serializer = UserSkillSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=UserSkillCreateSerializer, responses={201: UserSkillSerializer})
    def post(self, request):
        serializer = UserSkillCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user_skill = serializer.save()
        response_serializer = UserSkillSerializer(user_skill)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["profile"], responses={200: UserSkillSerializer})
class UserSkillDetailView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUserOrAdmin]

    def get_object(self, request, pk):
        return UserSkill.objects.filter(id=pk, user=request.user).select_related("skill").first()

    @extend_schema(request=UserSkillUpdateSerializer, responses={200: UserSkillSerializer})
    def patch(self, request, pk):
        user_skill = self.get_object(request, pk)
        if user_skill is None:
            return Response({"detail": "User skill was not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = UserSkillUpdateSerializer(user_skill, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSkillSerializer(user_skill).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        deleted_count, _ = UserSkill.objects.filter(id=pk, user=request.user).delete()
        if not deleted_count:
            return Response({"detail": "User skill was not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["skills"], responses={200: FieldInterestSerializer(many=True)})
class FieldInterestCatalogListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUserOrAdmin]
    serializer_class = FieldInterestSerializer

    def get_queryset(self):
        return FieldInterest.objects.filter(is_active=True)


@extend_schema(tags=["skills"], responses={200: SkillSerializer(many=True)})
class SkillCatalogListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUserOrAdmin]
    serializer_class = SkillSerializer

    def get_queryset(self):
        return Skill.objects.filter(is_active=True)
