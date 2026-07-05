from django.contrib.auth import logout as django_logout
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.generics import CreateAPIView, GenericAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.common.permissions import IsAdminActor
from apps.common.email import send_platform_email
from apps.accounts.serializers import (
    AuthUserSerializer,
    build_token_pair_response_data,
    EmailTokenObtainPairSerializer,
    GenericDetailSerializer,
    LogoutSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterResponseSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    TestEmailRequestSerializer,
    TokenPairWithUserResponseSerializer,
    VerifyEmailResponseSerializer,
    VerifyEmailSerializer,
)
from apps.accounts.throttles import AuthEndpointThrottle


@extend_schema(tags=["auth"], responses={201: RegisterResponseSerializer})
class RegisterView(CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthEndpointThrottle]
    throttle_scope = "auth_register"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        response_serializer = RegisterResponseSerializer(
            {
                "detail": "Registration successful. Verify your email to continue.",
                "email": user.email,
                "verification_required": True,
            }
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["auth"],
    request=VerifyEmailSerializer,
    responses={200: VerifyEmailResponseSerializer},
)
class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthEndpointThrottle]
    throttle_scope = "auth_verify_email"

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        action_token = serializer.validated_data["action_token"]
        user.mark_email_verified()
        action_token.mark_used()
        return Response(
            build_token_pair_response_data(user),
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["auth"],
    request=ResendVerificationSerializer,
    responses={200: GenericDetailSerializer},
)
class ResendVerificationView(GenericAPIView):
    serializer_class = ResendVerificationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthEndpointThrottle]
    throttle_scope = "auth_verify_email"

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.save()
        return Response(data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["auth"],
    request=PasswordResetRequestSerializer,
    responses={200: GenericDetailSerializer},
)
class PasswordResetRequestView(GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthEndpointThrottle]
    throttle_scope = "auth_password_reset"

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.save()
        return Response(data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["auth"],
    request=PasswordResetConfirmSerializer,
    responses={200: GenericDetailSerializer},
)
class PasswordResetConfirmView(GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthEndpointThrottle]
    throttle_scope = "auth_password_reset"

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.save()
        return Response(data, status=status.HTTP_200_OK)


@extend_schema(tags=["auth"], request=LogoutSerializer, responses={204: None})
class LogoutView(GenericAPIView):
    serializer_class = LogoutSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthEndpointThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        django_logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["auth"], responses={200: AuthUserSerializer})
class CurrentUserView(RetrieveAPIView):
    serializer_class = AuthUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthEndpointThrottle]
    throttle_scope = "auth"

    def get_object(self):
        return self.request.user


@extend_schema(
    tags=["auth"],
    request=TestEmailRequestSerializer,
    responses={200: GenericDetailSerializer},
)
class TestEmailView(GenericAPIView):
    serializer_class = TestEmailRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    throttle_classes = [AuthEndpointThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        recipient = serializer.validated_data.get("to_email") or request.user.email
        subject = serializer.validated_data["subject"]
        message = serializer.validated_data["message"]

        send_platform_email(
            subject=subject,
            message=message,
            recipient_list=[recipient],
            fail_silently=False,
        )
        return Response(
            {"detail": f"Test email sent to {recipient}."},
            status=status.HTTP_200_OK,
        )


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [AuthEndpointThrottle]
    throttle_scope = "auth_login"

    @extend_schema(
        tags=["auth"],
        request=EmailTokenObtainPairSerializer,
        responses={200: TokenPairWithUserResponseSerializer},
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)
