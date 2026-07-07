import importlib.util
import os
from pathlib import Path
from datetime import timedelta

try:
    import environ
except ModuleNotFoundError:
    class _FallbackEnv:
        def __init__(self, **schema):
            self.schema = schema

        @staticmethod
        def read_env(path):
            return None

        def __call__(self, key, default=None):
            schema_default = self.schema.get(key, (None, None))[1]
            resolved_default = default if default is not None else schema_default
            value = os.environ.get(key, resolved_default)
            return self._cast(key, value)

        def bool(self, key, default=False):
            return bool(self._cast(key, os.environ.get(key, default)))

        def int(self, key, default=0):
            return int(self._cast(key, os.environ.get(key, default)))

        def list(self, key, default=None):
            value = os.environ.get(key)
            if value is None:
                return list(default or [])
            if isinstance(value, list):
                return value
            return [item.strip() for item in str(value).split(",") if item.strip()]

        def _cast(self, key, value):
            cast = self.schema.get(key, (None, None))[0]
            if value is None or cast is None:
                return value
            if cast is bool:
                if isinstance(value, bool):
                    return value
                return str(value).lower() in {"1", "true", "yes", "on"}
            if cast is int:
                return int(value)
            if cast is list:
                if isinstance(value, list):
                    return value
                return [item.strip() for item in str(value).split(",") if item.strip()]
            return cast(value)

    class _FallbackEnvironModule:
        Env = _FallbackEnv

    environ = _FallbackEnvironModule()

BASE_DIR = Path(__file__).resolve().parents[2]

env = environ.Env(
    DEBUG=(bool, False),
    DJANGO_SECRET_KEY=(str, "change-me"),
    DJANGO_SETTINGS_MODULE=(str, "config.settings.local"),
    DJANGO_ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    DJANGO_CSRF_TRUSTED_ORIGINS=(list, ["http://localhost:5173", "http://127.0.0.1:5173"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:5173", "http://127.0.0.1:5173"]),
    MYSQL_PORT=(int, 3306),
    REDIS_URL=(str, "redis://127.0.0.1:6379/0"),
    CELERY_RESULT_BACKEND=(str, "redis://127.0.0.1:6379/1"),
    EMAIL_PORT=(int, 587),
    RESEND_API_KEY=(str, ""),
    CHAPA_ENV=(str, "test"),
    CHAPA_SECRET_KEY=(str, ""),
    CHAPA_PUBLIC_KEY=(str, ""),
    CHAPA_WEBHOOK_SECRET=(str, ""),
    CHAPA_ENCRYPTION_KEY=(str, ""),
    CHAPA_RETURN_URL=(str, "http://localhost:5173/courses/{course_id}?payment_tx_ref={tx_ref}"),
    CHAPA_CALLBACK_URL=(str, "http://localhost:8000/api/payments/chapa/callback/"),
    CHAPA_HTTP_TIMEOUT_SECONDS=(int, 15),
    FRONTEND_APP_URL=(str, "http://localhost:5173"),
    ENABLE_AUTH_THROTTLING=(bool, False),
    PAYMENT_RATE_THROTTLE=(str, "20/hour"),
    AUTH_RATE_THROTTLE=(str, "20/hour"),
    AUTH_LOGIN_RATE_THROTTLE=(str, "10/hour"),
    AUTH_REGISTER_RATE_THROTTLE=(str, "5/hour"),
    AUTH_VERIFY_EMAIL_RATE_THROTTLE=(str, "10/hour"),
    AUTH_PASSWORD_RESET_RATE_THROTTLE=(str, "5/hour"),
    AUTH_ORGANIZATION_REGISTER_RATE_THROTTLE=(str, "3/hour"),
)

environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = env.list("DJANGO_CSRF_TRUSTED_ORIGINS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "anymail",
    "rest_framework_simplejwt.token_blacklist",
    "apps.accounts",
    "apps.audit",
    "apps.common",
    "apps.organizations",
    "apps.payments",
    "apps.skills",
    "apps.taxonomy",
    "apps.swaps",
    "apps.messaging",
    "apps.notifications",
    "apps.sessions",
    "apps.dashboards",
    "apps.courses",
    "apps.events",
    "apps.opportunities",
    "apps.reviews",
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
]

if importlib.util.find_spec("daphne"):
    INSTALLED_APPS.insert(0, "daphne")

if importlib.util.find_spec("channels"):
    INSTALLED_APPS.append("channels")

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": env("MYSQL_DATABASE", default="skillverse"),
        "USER": env("MYSQL_USER", default="root"),
        "PASSWORD": env("MYSQL_PASSWORD", default=""),
        "HOST": env("MYSQL_HOST", default="127.0.0.1"),
        "PORT": env("MYSQL_PORT"),
        "OPTIONS": {
            "charset": "utf8mb4",
        },
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = env("TIME_ZONE", default="UTC")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"
FRONTEND_APP_URL = env("FRONTEND_APP_URL")
ENABLE_AUTH_THROTTLING = env.bool("ENABLE_AUTH_THROTTLING", default=False)
CHAPA_ENV = env("CHAPA_ENV", default="test")
CHAPA_BASE_URL = "https://api.chapa.co"
CHAPA_SECRET_KEY = env("CHAPA_SECRET_KEY", default="")
CHAPA_PUBLIC_KEY = env("CHAPA_PUBLIC_KEY", default="")
CHAPA_WEBHOOK_SECRET = env("CHAPA_WEBHOOK_SECRET", default="")
CHAPA_ENCRYPTION_KEY = env("CHAPA_ENCRYPTION_KEY", default="")
CHAPA_RETURN_URL = env("CHAPA_RETURN_URL")
CHAPA_CALLBACK_URL = env("CHAPA_CALLBACK_URL")
CHAPA_HTTP_TIMEOUT_SECONDS = env.int("CHAPA_HTTP_TIMEOUT_SECONDS", default=15)

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False
SESSION_COOKIE_SAMESITE = env("SESSION_COOKIE_SAMESITE", default="Lax")
CSRF_COOKIE_SAMESITE = env("CSRF_COOKIE_SAMESITE", default="Lax")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": env("AUTH_RATE_THROTTLE"),
        "user": "120/hour",
        "auth": env("AUTH_RATE_THROTTLE"),
        "auth_login": env("AUTH_LOGIN_RATE_THROTTLE"),
        "auth_register": env("AUTH_REGISTER_RATE_THROTTLE"),
        "auth_verify_email": env("AUTH_VERIFY_EMAIL_RATE_THROTTLE"),
        "auth_password_reset": env("AUTH_PASSWORD_RESET_RATE_THROTTLE"),
        "auth_organization_register": env("AUTH_ORGANIZATION_REGISTER_RATE_THROTTLE"),
        "payment": env("PAYMENT_RATE_THROTTLE"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_TOKEN_MINUTES", default=30)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_TOKEN_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": env.bool("JWT_ROTATE_REFRESH_TOKENS", default=False),
    "BLACKLIST_AFTER_ROTATION": env.bool("JWT_BLACKLIST_AFTER_ROTATION", default=False),
    "UPDATE_LAST_LOGIN": True,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "SkillVerse API",
    "DESCRIPTION": "Backend API for the SkillVerse platform.",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api",
    "COMPONENT_SPLIT_REQUEST": True,
    "SWAGGER_UI_SETTINGS": {
        "persistAuthorization": True,
    },
    "ENUM_NAME_OVERRIDES": {
        "OrganizationTypeEnum": "apps.common.enums.OrganizationType",
        "OrganizationVerificationStatusEnum": "apps.common.enums.OrganizationVerificationStatus",
        "OrganizationVerificationReviewStatusEnum": "apps.common.enums.OrganizationVerificationReviewStatus",
        "SkillSwapStatusEnum": "apps.common.enums.SkillSwapStatus",
        "LearningSessionStatusEnum": "apps.common.enums.LearningSessionStatus",
        "CourseProgramStatusEnum": "apps.common.enums.CourseProgramStatus",
        "LessonItemTypeEnum": "apps.common.enums.LessonItemType",
        "EnrollmentStatusEnum": "apps.common.enums.EnrollmentStatus",
        "EventStatusEnum": "apps.common.enums.EventStatus",
        "FinancialAccountStatusEnum": "apps.common.enums.FinancialAccountStatus",
        "PaymentTransactionStatusEnum": "apps.common.enums.PaymentTransactionStatus",
        "RSVPStatusEnum": "apps.common.enums.RSVPStatus",
        "OpportunityTypeEnum": "apps.common.enums.OpportunityType",
        "OpportunityStatusEnum": "apps.common.enums.OpportunityStatus",
        "JobApplicationStatusEnum": "apps.common.enums.JobApplicationStatus",
        "NotificationTypeEnum": "apps.common.enums.NotificationType",
    },
}

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True

EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default="anymail.backends.resend.EmailBackend",
)
EMAIL_HOST = env("EMAIL_HOST", default="smtp.example.com")
EMAIL_PORT = env("EMAIL_PORT")
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@skillverse.local")
SERVER_EMAIL = env("SERVER_EMAIL", default=DEFAULT_FROM_EMAIL)

ANYMAIL = {
    "RESEND_API_KEY": env("RESEND_API_KEY", default=""),
}

REDIS_URL = env("REDIS_URL")
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
        },
    }
}
