from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import EmailTokenObtainPairView
from apps.payments.views import ChapaWebhookView
from config.api import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/auth/organizations/", include("apps.organizations.urls")),
    path("api/organizations/", include("apps.organizations.api_urls")),
    path("api/admin/organizations/", include("apps.organizations.admin_urls")),
    path("api/admin/payments/", include("apps.payments.admin_urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/v1/payment/webhook/", ChapaWebhookView.as_view(), name="chapa-webhook"),
    path("api/", include("apps.skills.urls")),
    path("api/swaps/", include("apps.swaps.urls")),
    path("api/messages/", include("apps.messaging.urls")),
    path("api/sessions/", include("apps.sessions.urls")),
    path("api/reviews/", include("apps.reviews.urls")),
    path("api/", include("apps.courses.urls")),
    path("api/", include("apps.events.urls")),
    path("api/", include("apps.opportunities.urls")),
    path("api-auth/", include("rest_framework.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/docs/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("api/auth/jwt/token/", EmailTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/jwt/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
