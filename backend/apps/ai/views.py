from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from apps.ai.serializers import (
    AIProviderHealthQuerySerializer,
    AIProviderHealthResponseSerializer,
)
from apps.ai.services import (
    AIProviderConfigurationError,
    AIProviderError,
    get_default_ai_provider,
)
from apps.common.permissions import IsAdminActor


@extend_schema_view(
    get=extend_schema(
        tags=["ai", "admin"],
        operation_id="admin_ai_provider_health",
        parameters=[AIProviderHealthQuerySerializer],
        responses={200: AIProviderHealthResponseSerializer},
    )
)
class AdminAIProviderHealthView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = AIProviderHealthQuerySerializer

    def get(self, request):
        serializer = self.get_serializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        mode = serializer.validated_data.get("mode", "config")

        provider = get_default_ai_provider()
        try:
            payload = provider.verify(mode=mode)
            return Response(payload, status=status.HTTP_200_OK)
        except AIProviderConfigurationError as exc:
            return Response(
                {
                    **provider.configuration(),
                    "mode": mode,
                    "healthy": False,
                    "details": {
                        "status": "configuration_error",
                        "message": str(exc),
                    },
                },
                status=status.HTTP_200_OK,
            )
        except AIProviderError as exc:
            return Response(
                {
                    **provider.configuration(),
                    "mode": mode,
                    "healthy": False,
                    "details": {
                        "status": "provider_error",
                        "message": str(exc),
                    },
                },
                status=status.HTTP_200_OK,
            )
