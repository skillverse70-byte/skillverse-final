from django.urls import path

from apps.accounts.views import (
    CurrentUserView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    ResendVerificationView,
    TestEmailView,
    VerifyEmailView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("verify-email/", VerifyEmailView.as_view(), name="auth-verify-email"),
    path(
        "resend-verification/",
        ResendVerificationView.as_view(),
        name="auth-resend-verification",
    ),
    path(
        "password-reset/request/",
        PasswordResetRequestView.as_view(),
        name="auth-password-reset-request",
    ),
    path(
        "password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="auth-password-reset-confirm",
    ),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", CurrentUserView.as_view(), name="auth-me"),
    path("test-email/", TestEmailView.as_view(), name="auth-test-email"),
]
