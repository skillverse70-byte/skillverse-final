from pathlib import Path
from datetime import timedelta

import environ

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
    FRONTEND_APP_URL=(str, "http://localhost:5173"),
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
    "apps.common",
    "apps.organizations",
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    "channels",
]

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
