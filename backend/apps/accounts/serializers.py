from datetime import timedelta

from django.contrib.auth import get_user_model, password_validation
from django.contrib.auth.models import update_last_login
from django.core.cache import cache
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import APIException, AuthenticationFailed, ValidationError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import AccountActionToken
from apps.accounts.services import issue_password_reset_token, issue_verification_token
from apps.common.enums import Role
from apps.courses.services import attach_course_invitations_to_user

User = get_user_model()
VERIFICATION_RESEND_COOLDOWN_SECONDS = 120


class VerificationResendCooldown(APIException):
    status_code = 429
    default_code = "verification_resend_cooldown"

    def __init__(self, wait_seconds):
        super().__init__(
            {
                "detail": (
                    f"Please wait {wait_seconds} seconds before requesting another verification code."
                ),
                "retry_after_seconds": wait_seconds,
            }
        )


class VerificationEmailDeliveryFailed(APIException):
    status_code = 503
    default_code = "verification_email_delivery_failed"
    default_detail = (
        "We could not send the verification email right now. Please try again shortly."
    )


class AuthUserSerializer(serializers.ModelSerializer):
    is_email_verified = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "role",
            "is_staff",
            "is_superuser",
            "is_email_verified",
            "email_verified_at",
        )
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = ("email", "password", "full_name")

    def validate_email(self, value):
        email = value.lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(
            password=password,
            role=Role.REGULAR_USER,
            **validated_data,
        )
        attach_course_invitations_to_user(user)
        issue_verification_token(user)
        return user


class RegisterResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    email = serializers.EmailField()
    verification_required = serializers.BooleanField()


class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(min_length=6, max_length=6)

    def validate(self, attrs):
        email = attrs["email"].lower()
        code = attrs["code"]

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist as exc:
            raise ValidationError({"email": "No account exists for this email."}) from exc

        token = (
            AccountActionToken.objects.filter(
                user=user,
                purpose=AccountActionToken.Purpose.EMAIL_VERIFICATION,
                token=code,
                used_at__isnull=True,
            )
            .order_by("-created_at")
            .first()
        )

        if token is None or token.expires_at <= timezone.now():
            raise ValidationError({"code": "This verification code is invalid or expired."})

        attrs["user"] = user
        attrs["action_token"] = token
        return attrs


class VerifyEmailResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = AuthUserSerializer()


class TokenPairWithUserResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = AuthUserSerializer()


def build_token_pair_response_data(user):
    attach_course_invitations_to_user(user)
    refresh = TokenObtainPairSerializer.get_token(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": AuthUserSerializer(user).data,
    }


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self, **kwargs):
        email = self.validated_data["email"].lower()
        user = User.objects.filter(email__iexact=email).first()
        if user and not user.is_email_verified:
            cache_key = f"auth:verification-resend:{user.id}"
            cooldown_until = cache.get(cache_key)
            if cooldown_until:
                remaining_seconds = max(
                    1,
                    int((cooldown_until - timezone.now()).total_seconds()),
                )
                raise VerificationResendCooldown(remaining_seconds)
            try:
                issue_verification_token(user)
            except Exception as exc:
                raise VerificationEmailDeliveryFailed() from exc
            cache.set(
                cache_key,
                timezone.now() + timedelta(seconds=VERIFICATION_RESEND_COOLDOWN_SECONDS),
                timeout=VERIFICATION_RESEND_COOLDOWN_SECONDS,
            )
        return {"detail": "If the account exists and is not verified, a new code has been sent."}


class GenericDetailSerializer(serializers.Serializer):
    detail = serializers.CharField()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self, **kwargs):
        email = self.validated_data["email"].lower()
        user = User.objects.filter(email__iexact=email).first()
        if user:
            issue_password_reset_token(user)
        return {"detail": "If the account exists, a password reset email has been sent."}


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_new_password(self, value):
        password_validation.validate_password(value)
        return value

    def validate(self, attrs):
        submitted_token = attrs["token"].strip()
        token = (
            AccountActionToken.objects.filter(
                purpose=AccountActionToken.Purpose.PASSWORD_RESET,
                token=submitted_token,
                used_at__isnull=True,
            )
            .order_by("-created_at")
            .select_related("user")
            .first()
        )

        if token is None:
            token_record = (
                AccountActionToken.objects.filter(
                    purpose=AccountActionToken.Purpose.PASSWORD_RESET,
                    token=submitted_token,
                )
                .order_by("-created_at")
                .select_related("user")
                .first()
            )
            if token_record is None:
                raise ValidationError({"token": "This password reset token is invalid."})
            if token_record.used_at is not None:
                raise ValidationError(
                    {
                        "token": (
                            "This password reset token was already used or has been replaced "
                            "by a newer reset email."
                        )
                    }
                )
            raise ValidationError({"token": "This password reset token has expired."})

        if token.expires_at <= timezone.now():
            raise ValidationError({"token": "This password reset token has expired."})

        attrs["action_token"] = token
        attrs["user"] = token.user
        attrs["token"] = submitted_token
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        action_token = self.validated_data["action_token"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        action_token.mark_used()
        return {"detail": "Password has been reset successfully."}


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=False, allow_blank=True)

    def save(self, **kwargs):
        refresh = self.validated_data.get("refresh")
        if refresh:
            token = RefreshToken(refresh)
            token.blacklist()
        return None


class TestEmailRequestSerializer(serializers.Serializer):
    to_email = serializers.EmailField(required=False)
    subject = serializers.CharField(required=False, default="SkillVerse Resend test email")
    message = serializers.CharField(
        required=False,
        default=(
            "This is a test email from SkillVerse using the configured "
            "Resend email backend."
        ),
    )


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    default_error_messages = {
        "no_active_account": "Invalid email or password.",
        "email_not_verified": "Email verification is required before login.",
    }

    @classmethod
    def get_token(cls, user):
        return super().get_token(user)

    def validate(self, attrs):
        data = super().validate(attrs)

        if not self.user.is_email_verified:
            raise AuthenticationFailed(
                self.error_messages["email_not_verified"],
                code="email_not_verified",
            )

        attach_course_invitations_to_user(self.user)
        update_last_login(None, self.user)
        data["user"] = AuthUserSerializer(self.user).data
        return data
