from io import StringIO

from django.core.management import call_command
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import AccountActionToken
from apps.common.enums import Role

User = get_user_model()


class AuthApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()

    def test_register_creates_regular_user_and_sends_verification_code(self):
        response = self.client.post(
            reverse("auth-register"),
            {
                "email": "learner@example.com",
                "password": "StrongPass123!",
                "full_name": "Learner Example",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="learner@example.com").exists())
        user = User.objects.get(email="learner@example.com")
        self.assertEqual(user.role, Role.REGULAR_USER)
        self.assertFalse(user.is_email_verified)
        self.assertEqual(mail.outbox[0].to, ["learner@example.com"])
        self.assertIn("verification code", mail.outbox[0].body.lower())
        self.assertEqual(len(mail.outbox[0].alternatives), 1)
        self.assertIn("text/html", mail.outbox[0].alternatives[0].mimetype)
        self.assertIn("verification code", mail.outbox[0].alternatives[0].content.lower())

    def test_unverified_user_cannot_obtain_jwt_pair(self):
        User.objects.create_user(
            email="pending@example.com",
            password="StrongPass123!",
            full_name="Pending User",
        )

        response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": "pending@example.com", "password": "StrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("verification", str(response.data).lower())

    def test_verify_email_returns_tokens_and_authenticated_user_can_fetch_me(self):
        user = User.objects.create_user(
            email="verifyme@example.com",
            password="StrongPass123!",
            full_name="Verify Me",
        )
        token = AccountActionToken.issue_email_verification(user)

        verify_response = self.client.post(
            reverse("auth-verify-email"),
            {"email": user.email, "code": token.token},
            format="json",
        )

        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.is_email_verified)
        self.assertIn("access", verify_response.data)
        self.assertIn("refresh", verify_response.data)
        self.assertEqual(verify_response.data["user"]["email"], user.email)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {verify_response.data['access']}"
        )
        me_response = self.client.get(reverse("auth-me"))

        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["email"], user.email)
        self.assertEqual(me_response.data["role"], Role.REGULAR_USER)
        self.assertTrue(me_response.data["is_email_verified"])

    def test_unauthenticated_user_cannot_fetch_me(self):
        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_user_can_fetch_me(self):
        admin_user = User.objects.create_user(
            email="me-admin@example.com",
            password="StrongPass123!",
            full_name="Admin Me",
            role=Role.ADMIN,
            is_staff=True,
        )
        admin_user.mark_email_verified()

        login_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": admin_user.email, "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )
        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], Role.ADMIN)

    def test_password_reset_request_and_confirm_changes_password(self):
        user = User.objects.create_user(
            email="reset@example.com",
            password="OldStrongPass123!",
            full_name="Reset User",
        )
        user.mark_email_verified()

        request_response = self.client.post(
            reverse("auth-password-reset-request"),
            {"email": user.email},
            format="json",
        )

        self.assertEqual(request_response.status_code, status.HTTP_200_OK)
        reset_token = AccountActionToken.objects.get(
            user=user,
            purpose=AccountActionToken.Purpose.PASSWORD_RESET,
        )
        self.assertEqual(mail.outbox[-1].to, [user.email])
        self.assertIn(reset_token.token, mail.outbox[-1].body)
        self.assertEqual(len(mail.outbox[-1].alternatives), 1)
        self.assertIn("reset-password?token=", mail.outbox[-1].alternatives[0].content)

        confirm_response = self.client.post(
            reverse("auth-password-reset-confirm"),
            {
                "token": reset_token.token,
                "new_password": "NewStrongPass123!",
            },
            format="json",
        )

        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)
        login_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": user.email, "password": "NewStrongPass123!"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

    def test_password_reset_confirm_reports_replaced_token_clearly(self):
        user = User.objects.create_user(
            email="replaced-reset@example.com",
            password="OldStrongPass123!",
            full_name="Reset User",
        )
        user.mark_email_verified()

        first_request_response = self.client.post(
            reverse("auth-password-reset-request"),
            {"email": user.email},
            format="json",
        )
        self.assertEqual(first_request_response.status_code, status.HTTP_200_OK)
        first_token = AccountActionToken.objects.get(
            user=user,
            purpose=AccountActionToken.Purpose.PASSWORD_RESET,
        )

        second_request_response = self.client.post(
            reverse("auth-password-reset-request"),
            {"email": user.email},
            format="json",
        )
        self.assertEqual(second_request_response.status_code, status.HTTP_200_OK)

        confirm_response = self.client.post(
            reverse("auth-password-reset-confirm"),
            {
                "token": first_token.token,
                "new_password": "NewStrongPass123!",
            },
            format="json",
        )

        self.assertEqual(confirm_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("replaced", str(confirm_response.data["token"][0]).lower())

    def test_logout_blacklists_refresh_token(self):
        user = User.objects.create_user(
            email="logout@example.com",
            password="StrongPass123!",
            full_name="Logout User",
            email_verified_at="2026-07-05T00:00:00Z",
        )

        login_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": user.email, "password": "StrongPass123!"},
            format="json",
        )
        access = login_response.data["access"]
        refresh = login_response.data["refresh"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        logout_response = self.client.post(
            reverse("auth-logout"),
            {"refresh": refresh},
            format="json",
        )

        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)
        refresh_response = self.client.post(
            reverse("token_refresh"),
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_endpoint_is_rate_limited(self):
        cache.clear()
        user = User.objects.create_user(
            email="throttle@example.com",
            password="StrongPass123!",
            full_name="Throttle User",
        )
        user.mark_email_verified()

        payload = {"email": user.email, "password": "StrongPass123!"}
        responses = [
            self.client.post(reverse("token_obtain_pair"), payload, format="json")
            for _ in range(11)
        ]

        for response in responses[:10]:
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(responses[10].status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_admin_can_send_one_off_test_email_from_endpoint(self):
        admin_user = User.objects.create_user(
            email="admin-test@example.com",
            password="StrongPass123!",
            full_name="Admin Tester",
            role=Role.ADMIN,
            is_staff=True,
        )
        self.client.force_authenticate(user=admin_user)

        response = self.client.post(
            reverse("auth-test-email"),
            {
                "to_email": "recipient@example.com",
                "subject": "SkillVerse smoke test",
                "message": "Hello from the admin email smoke test.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(mail.outbox[-1].to, ["recipient@example.com"])
        self.assertEqual(mail.outbox[-1].subject, "SkillVerse smoke test")

    def test_regular_user_cannot_send_test_email_from_endpoint(self):
        regular_user = User.objects.create_user(
            email="user-test@example.com",
            password="StrongPass123!",
            full_name="Regular Tester",
        )
        self.client.force_authenticate(user=regular_user)

        response = self.client.post(reverse("auth-test-email"), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_organization_user_cannot_send_test_email_from_endpoint(self):
        organization_user = User.objects.create_user(
            email="org-test@example.com",
            password="StrongPass123!",
            full_name="Org Tester",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-05T00:00:00Z",
        )
        self.client.force_authenticate(user=organization_user)

        response = self.client.post(reverse("auth-test-email"), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_management_command_sends_test_email(self):
        out = StringIO()

        call_command(
            "send_test_email",
            to="command@example.com",
            subject="Command test",
            message="Sent from management command.",
            stdout=out,
        )

        self.assertEqual(mail.outbox[-1].to, ["command@example.com"])
        self.assertEqual(mail.outbox[-1].subject, "Command test")
        self.assertIn("Test email sent to command@example.com", out.getvalue())
