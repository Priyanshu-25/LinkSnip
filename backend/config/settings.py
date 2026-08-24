from pathlib import Path
from datetime import timedelta
import os

from dotenv import load_dotenv


# =========================================================
# BASE
# =========================================================

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent.parent
)

load_dotenv(
    BASE_DIR / ".env"
)


# =========================================================
# SECURITY
# =========================================================

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-dev-only-key",
)

DEBUG = (
    os.getenv(
        "DEBUG",
        "True",
    )
    .strip()
    .lower()
    == "true"
)


# =========================================================
# ALLOWED HOSTS
# =========================================================

_allowed_hosts_raw = os.getenv(
    "ALLOWED_HOSTS",
    "",
)

if _allowed_hosts_raw.strip():
    ALLOWED_HOSTS = [
        host.strip()
        for host in _allowed_hosts_raw.split(",")
        if host.strip()
    ]
else:
    ALLOWED_HOSTS = [
        "localhost",
        "127.0.0.1",
        "[::1]",
    ]


# =========================================================
# PUBLIC SHORT URL
# =========================================================

PUBLIC_SHORT_URL_BASE = os.getenv(
    "PUBLIC_SHORT_URL_BASE",
    "http://127.0.0.1:8001",
).rstrip("/")


# =========================================================
# APPLICATIONS
# =========================================================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "drf_spectacular",
    "corsheaders",

    "accounts",
    "links",
    "analytics",
    "ai_engine",
]


# =========================================================
# MIDDLEWARE
# =========================================================

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


# =========================================================
# URL / WSGI
# =========================================================

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND":
            "django.template.backends.django.DjangoTemplates",

        "DIRS": [],

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

WSGI_APPLICATION = (
    "config.wsgi.application"
)


# =========================================================
# DATABASE
# =========================================================

# =========================================================
# DATABASE
# =========================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "",
).strip()

if DATABASE_URL:
    from urllib.parse import unquote, urlparse

    parsed_database_url = urlparse(
        DATABASE_URL
    )

    database_name = (
        parsed_database_url.path.lstrip("/")
        or "linkora_db"
    )

    database_user = (
        unquote(
            parsed_database_url.username or ""
        )
        or "postgres"
    )

    database_password = unquote(
        parsed_database_url.password or ""
    )

    database_host = (
        parsed_database_url.hostname
        or "localhost"
    )

    database_port = (
        str(
            parsed_database_url.port
        )
        if parsed_database_url.port
        else "5432"
    )

    DATABASES = {
        "default": {
            "ENGINE":
                "django.db.backends.postgresql",

            "NAME":
                database_name,

            "USER":
                database_user,

            "PASSWORD":
                database_password,

            "HOST":
                database_host,

            "PORT":
                database_port,

            "OPTIONS": {
                "sslmode": os.getenv(
                    "DB_SSLMODE",
                    "require",
                ),
            },
        }
    }

else:
    # Local development fallback.
    DATABASES = {
        "default": {
            "ENGINE":
                "django.db.backends.postgresql",

            "NAME":
                os.getenv(
                    "DB_NAME",
                    "linkora_db",
                ),

            "USER":
                os.getenv(
                    "DB_USER",
                    "postgres",
                ),

            "PASSWORD":
                os.getenv(
                    "DB_PASSWORD",
                    "",
                ),

            "HOST":
                os.getenv(
                    "DB_HOST",
                    "localhost",
                ),

            "PORT":
                os.getenv(
                    "DB_PORT",
                    "5432",
                ),
        }
    }

# =========================================================
# PASSWORD VALIDATION
# =========================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME":
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator",
    },
    {
        "NAME":
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator",
    },
    {
        "NAME":
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator",
    },
    {
        "NAME":
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator",
    },
]


# =========================================================
# INTERNATIONALIZATION
# =========================================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# =========================================================
# STATIC
# =========================================================

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"


# =========================================================
# EMAIL
# =========================================================

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend",
)

EMAIL_HOST = os.getenv(
    "EMAIL_HOST",
    "",
)

EMAIL_PORT = int(
    os.getenv(
        "EMAIL_PORT",
        "587",
    )
)

EMAIL_HOST_USER = os.getenv(
    "EMAIL_HOST_USER",
    "",
)

EMAIL_HOST_PASSWORD = os.getenv(
    "EMAIL_HOST_PASSWORD",
    "",
)

EMAIL_USE_TLS = (
    os.getenv(
        "EMAIL_USE_TLS",
        "True",
    )
    .strip()
    .lower()
    == "true"
)

EMAIL_USE_SSL = (
    os.getenv(
        "EMAIL_USE_SSL",
        "False",
    )
    .strip()
    .lower()
    == "true"
)

DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    EMAIL_HOST_USER,
)


# =========================================================
# REDIS
# =========================================================

REDIS_URL = os.getenv(
    "REDIS_URL",
    "redis://127.0.0.1:6379/1",
)

CACHES = {
    "default": {
        "BACKEND":
            "django_redis.cache.RedisCache",

        "LOCATION":
            REDIS_URL,

        "OPTIONS": {
            "CLIENT_CLASS":
                "django_redis.client.DefaultClient",
        },
    },
}


# =========================================================
# REDIRECT CACHE
# =========================================================

REDIRECT_CACHE_TTL = int(
    os.getenv(
        "REDIRECT_CACHE_TTL",
        "300",
    )
)


# =========================================================
# BACKEND URL
# =========================================================

BACKEND_BASE_URL = os.getenv(
    "BACKEND_BASE_URL",
    "http://127.0.0.1:8000",
).rstrip("/")


# =========================================================
# REDIRECT SERVICE DATABASE URL
# =========================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "",
)


# =========================================================
# TIMESCALEDB
# =========================================================

TIMESCALE_DATABASE_URL = os.getenv(
    "TIMESCALE_DATABASE_URL",
    "postgresql://postgres:Rishi1234@127.0.0.1:5433/linkora_analytics",
)

USE_TIMESCALE = (
    os.getenv(
        "USE_TIMESCALE",
        "true",
    ).strip().lower()
    == "true"
)


# =========================================================
# GEOLOCATION
# =========================================================

GEO_PROVIDER_URL = os.getenv(
    "GEO_PROVIDER_URL",
    "",
)

GEO_API_TOKEN = os.getenv(
    "GEO_API_TOKEN",
    "",
)


# =========================================================
# DJANGO REST FRAMEWORK
# =========================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication."
        "JWTAuthentication",
    ),

    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),

    "DEFAULT_SCHEMA_CLASS":
        "drf_spectacular.openapi.AutoSchema",

    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),

    "DEFAULT_THROTTLE_RATES": {
        "anon": "30/minute",
        "user": "120/minute",
    },
}


# =========================================================
# SIMPLE JWT
# =========================================================

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":
        timedelta(minutes=30),

    "REFRESH_TOKEN_LIFETIME":
        timedelta(days=7),

    "AUTH_HEADER_TYPES": (
        "Bearer",
    ),
}


# =========================================================
# CORS
# =========================================================

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        (
            "http://localhost:5173,"
            "http://127.0.0.1:5173"
        ),
    ).split(",")
    if origin.strip()
]


# =========================================================
# CSRF
# =========================================================

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CSRF_TRUSTED_ORIGINS",
        (
            "http://localhost:5173,"
            "http://127.0.0.1:5173"
        ),
    ).split(",")
    if origin.strip()
]


# =========================================================
# SECURITY HEADERS
# =========================================================

SECURE_CONTENT_TYPE_NOSNIFF = True

X_FRAME_OPTIONS = "DENY"

SECURE_REFERRER_POLICY = "same-origin"


# =========================================================
# PROXY
# =========================================================

SECURE_PROXY_SSL_HEADER = (
    "HTTP_X_FORWARDED_PROTO",
    "https",
)


# =========================================================
# COOKIES
# =========================================================

SESSION_COOKIE_HTTPONLY = True

SESSION_COOKIE_SAMESITE = "Lax"

CSRF_COOKIE_SAMESITE = "Lax"


# =========================================================
# PRODUCTION SECURITY
# =========================================================

if not DEBUG:

    SECURE_SSL_REDIRECT = True

    SESSION_COOKIE_SECURE = True

    CSRF_COOKIE_SECURE = True

    SECURE_HSTS_SECONDS = 31536000

    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

    SECURE_HSTS_PRELOAD = True