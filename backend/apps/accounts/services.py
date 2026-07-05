from django.conf import settings

from apps.accounts.models import AccountActionToken
from apps.common.email import render_email_html, send_platform_email


def get_frontend_app_url():
    if getattr(settings, "FRONTEND_APP_URL", ""):
        return settings.FRONTEND_APP_URL.rstrip("/")

    cors_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", [])
    if cors_origins:
        return cors_origins[0].rstrip("/")

    return "http://localhost:5173"


def send_verification_email(user, action_token):
    greeting_name = user.full_name or user.email
    html_context = {
        "subject": "Verify your SkillVerse email",
        "greeting_name": greeting_name,
        "verification_code": action_token.token,
        "expiry_text": "This code expires in 15 minutes.",
    }
    send_platform_email(
        subject=html_context["subject"],
        message=(
            f"Hello {greeting_name},\n\n"
            f"Your SkillVerse verification code is: {action_token.token}\n\n"
            "This code expires in 15 minutes."
        ),
        html_message=render_email_html("emails/verification_email.html", html_context),
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_reset_email(user, action_token):
    greeting_name = user.full_name or user.email
    reset_url = f"{get_frontend_app_url()}/reset-password?token={action_token.token}"
    html_context = {
        "subject": "Reset your SkillVerse password",
        "greeting_name": greeting_name,
        "reset_url": reset_url,
        "expiry_text": "This link expires in 1 hour.",
    }
    send_platform_email(
        subject=html_context["subject"],
        message=(
            f"Hello {greeting_name},\n\n"
            "Use the link below to reset your password:\n"
            f"{reset_url}\n\n"
            "This link expires in 1 hour."
        ),
        html_message=render_email_html("emails/password_reset_email.html", html_context),
        recipient_list=[user.email],
        fail_silently=False,
    )


def issue_verification_token(user):
    action_token = AccountActionToken.issue_email_verification(user)
    send_verification_email(user, action_token)
    return action_token


def issue_password_reset_token(user):
    action_token = AccountActionToken.issue_password_reset(user)
    send_password_reset_email(user, action_token)
    return action_token
