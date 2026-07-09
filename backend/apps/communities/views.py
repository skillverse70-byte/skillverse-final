from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from apps.common.enums import CommunityVisibility, Role
from apps.common.permissions import normalize_actor_role
from apps.communities.models import CommunityGroup, CommunityMembership, CommunityPost
from apps.communities.serializers import (
    CommunityGroupDetailSerializer,
    CommunityGroupSummarySerializer,
    CommunityGroupWriteSerializer,
    CommunityMembershipActionSerializer,
    CommunityPostSerializer,
    CommunityPostWriteSerializer,
    CommunityQuerySerializer,
    annotate_community_queryset,
)
from apps.notifications.services import notify_certificate_community_joined


def community_is_accessible(*, community, user):
    actor_role = normalize_actor_role(user)
    if community.visibility == CommunityVisibility.PUBLIC and community.is_active:
        return True
    if actor_role == Role.ADMIN:
        return True
    if actor_role == Role.ORGANIZATION and getattr(user, "organization_profile", None):
        return community.organization_id == user.organization_profile.id
    if user.is_authenticated:
        if community.created_by_id == user.id:
            return True
        return community.memberships.filter(user=user).exists()
    return False


@extend_schema_view(
    get=extend_schema(
        tags=["communities"],
        operation_id="community_group_list",
        parameters=[CommunityQuerySerializer],
        responses={200: CommunityGroupSummarySerializer(many=True)},
    ),
    post=extend_schema(
        tags=["communities"],
        operation_id="community_group_create",
        request=CommunityGroupWriteSerializer,
        responses={201: CommunityGroupSummarySerializer},
    ),
)
class CommunityGroupListCreateView(GenericAPIView):
    queryset = CommunityGroup.objects.all()

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get(self, request):
        query_serializer = CommunityQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        scope = query_serializer.validated_data.get("scope", "public")
        actor_role = normalize_actor_role(request.user)
        queryset = annotate_community_queryset(CommunityGroup.objects.filter(is_active=True))

        if scope == "mine":
            if not request.user.is_authenticated:
                raise PermissionDenied("Authentication is required for personal communities.")
            queryset = queryset.filter(memberships__user=request.user)
        elif scope == "managed":
            if actor_role != Role.ORGANIZATION or not hasattr(request.user, "organization_profile"):
                raise PermissionDenied("Organization access is required for managed communities.")
            queryset = queryset.filter(organization=request.user.organization_profile)
        elif scope == "admin":
            if actor_role != Role.ADMIN:
                raise PermissionDenied("Admin access is required for this scope.")
        else:
            queryset = queryset.filter(visibility=CommunityVisibility.PUBLIC)

        serializer = CommunityGroupSummarySerializer(
            queryset.order_by("-created_at", "-id"),
            many=True,
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        actor_role = normalize_actor_role(request.user)
        if actor_role != Role.ORGANIZATION:
            raise PermissionDenied("Only organizations can create communities.")
        serializer = CommunityGroupWriteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        community = serializer.save()
        response_serializer = CommunityGroupSummarySerializer(community, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(
        tags=["communities"],
        operation_id="community_group_detail",
        responses={200: CommunityGroupDetailSerializer},
    )
)
class CommunityGroupDetailView(GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def get_object(self, pk):
        community = annotate_community_queryset(CommunityGroup.objects.filter(pk=pk)).first()
        if community is None:
            raise NotFound("Community not found.")
        return community

    def get(self, request, pk):
        community = self.get_object(pk)
        if not community_is_accessible(community=community, user=request.user):
            raise PermissionDenied("You do not have access to this community.")
        serializer = CommunityGroupDetailSerializer(community, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        tags=["communities"],
        operation_id="community_group_membership_action",
        request=CommunityMembershipActionSerializer,
        responses={200: CommunityGroupSummarySerializer},
    )
)
class CommunityMembershipActionView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CommunityMembershipActionSerializer

    def post(self, request, pk):
        if normalize_actor_role(request.user) != Role.REGULAR_USER:
            raise PermissionDenied("Only regular users can join or leave communities.")
        community = annotate_community_queryset(CommunityGroup.objects.filter(pk=pk, is_active=True)).first()
        if community is None:
            raise NotFound("Community not found.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data["action"]

        if action == "join":
            if community.visibility != CommunityVisibility.PUBLIC:
                raise PermissionDenied(
                    "This community does not allow self-service joining."
                )
            membership, created = CommunityMembership.objects.get_or_create(
                community=community,
                user=request.user,
                defaults={"role": "member"},
            )
            if created:
                notify_certificate_community_joined(community, request.user)
        else:
            CommunityMembership.objects.filter(community=community, user=request.user).delete()

        community = annotate_community_queryset(CommunityGroup.objects.filter(pk=pk)).first()
        response_serializer = CommunityGroupSummarySerializer(community, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["communities"],
        operation_id="community_group_posts_list",
        responses={200: CommunityPostSerializer(many=True)},
    ),
    post=extend_schema(
        tags=["communities"],
        operation_id="community_group_posts_create",
        request=CommunityPostWriteSerializer,
        responses={201: CommunityPostSerializer},
    ),
)
class CommunityPostListCreateView(GenericAPIView):
    serializer_class = CommunityPostWriteSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_community(self, pk):
        community = annotate_community_queryset(CommunityGroup.objects.filter(pk=pk, is_active=True)).first()
        if community is None:
            raise NotFound("Community not found.")
        return community

    def get(self, request, pk):
        community = self.get_community(pk)
        if not community_is_accessible(community=community, user=request.user):
            raise PermissionDenied("You do not have access to this community.")
        serializer = CommunityPostSerializer(community.posts.all()[:25], many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, pk):
        community = self.get_community(pk)
        actor_role = normalize_actor_role(request.user)
        is_org_owner = actor_role == Role.ORGANIZATION and getattr(request.user, "organization_profile", None) and community.organization_id == request.user.organization_profile.id
        is_admin = actor_role == Role.ADMIN
        is_member = community.memberships.filter(user=request.user).exists()
        if not (is_member or is_org_owner or is_admin):
            raise PermissionDenied("Join this community before posting.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        post = CommunityPost.objects.create(
            community=community,
            author=request.user,
            body=serializer.validated_data["body"],
        )
        response_serializer = CommunityPostSerializer(post)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
