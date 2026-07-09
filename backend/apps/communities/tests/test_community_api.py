from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.common.enums import (
    CommunityMembershipRole,
    CommunityVisibility,
    OrganizationType,
    OrganizationVerificationStatus,
    Role,
)
from apps.communities.models import CommunityMembership, CommunityPost
from apps.organizations.models import Organization

User = get_user_model()


class CommunityApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org_owner = User.objects.create_user(
            email="org-community@example.com",
            password="StrongPass123!",
            full_name="Community Org",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-09T00:00:00Z",
        )
        self.regular_user = User.objects.create_user(
            email="member@example.com",
            password="StrongPass123!",
            full_name="Member User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-09T00:00:00Z",
        )
        self.organization = Organization.objects.create(
            owner=self.org_owner,
            name="Verified Community Org",
            type=OrganizationType.COMMUNITY,
            description="Community builder",
            contact_email="community@example.com",
            verification_status=OrganizationVerificationStatus.VERIFIED,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_verified_organization_can_create_community(self):
        self.authenticate(self.org_owner)

        response = self.client.post(
            reverse("community-group-list"),
            {
                "title": "Design Circle",
                "description": "A place for design peers.",
                "category": "Design",
                "tags": ["design", "feedback"],
                "visibility": CommunityVisibility.PUBLIC,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Design Circle")
        self.assertTrue(
            CommunityMembership.objects.filter(
                community_id=response.data["id"],
                user=self.org_owner,
                role="moderator",
            ).exists()
        )

    def test_regular_user_can_join_and_post_in_public_community(self):
        self.authenticate(self.org_owner)
        create_response = self.client.post(
            reverse("community-group-list"),
            {
                "title": "Research Guild",
                "description": "Community for research learners.",
                "category": "Research",
                "tags": ["research"],
                "visibility": CommunityVisibility.PUBLIC,
            },
            format="json",
        )
        community_id = create_response.data["id"]

        self.authenticate(self.regular_user)
        join_response = self.client.post(
            reverse("community-group-membership-action", args=[community_id]),
            {"action": "join"},
            format="json",
        )
        post_response = self.client.post(
            reverse("community-group-posts", args=[community_id]),
            {"body": "Excited to learn with this group."},
            format="json",
        )

        self.assertEqual(join_response.status_code, status.HTTP_200_OK)
        self.assertTrue(join_response.data["is_member"])
        self.assertEqual(post_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(post_response.data["author"]["id"], self.regular_user.id)

    def test_members_only_community_rejects_self_service_join(self):
        self.authenticate(self.org_owner)
        create_response = self.client.post(
            reverse("community-group-list"),
            {
                "title": "Private Circle",
                "description": "Private collaboration group.",
                "category": "Research",
                "tags": ["private"],
                "visibility": CommunityVisibility.MEMBERS_ONLY,
            },
            format="json",
        )
        community_id = create_response.data["id"]

        self.authenticate(self.regular_user)
        response = self.client.post(
            reverse("community-group-membership-action", args=[community_id]),
            {"action": "join"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(
            CommunityMembership.objects.filter(
                community_id=community_id,
                user=self.regular_user,
            ).exists()
        )

    def test_community_detail_limits_recent_posts_and_members(self):
        self.authenticate(self.org_owner)
        create_response = self.client.post(
            reverse("community-group-list"),
            {
                "title": "Public Lab",
                "description": "Open lab.",
                "category": "Lab",
                "tags": ["open"],
                "visibility": CommunityVisibility.PUBLIC,
            },
            format="json",
        )
        community_id = create_response.data["id"]

        community = self.organization.community_groups.get(id=community_id)
        for index in range(55):
            user = User.objects.create_user(
                email=f"member-{index}@example.com",
                password="StrongPass123!",
                full_name=f"Member {index}",
                role=Role.REGULAR_USER,
                email_verified_at="2026-07-09T00:00:00Z",
            )
            CommunityMembership.objects.create(
                community=community,
                user=user,
                role=CommunityMembershipRole.MEMBER,
            )
        for index in range(30):
            CommunityPost.objects.create(
                community=community,
                author=self.org_owner,
                body=f"Post {index}",
            )

        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("community-group-detail", args=[community_id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data["recent_posts"]), 25)
        self.assertLessEqual(len(response.data["members"]), 50)
