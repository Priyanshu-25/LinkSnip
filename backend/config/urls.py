from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

from links.views import (
    redirect_link,
    verify_link,
)


# =========================================================
# HEALTH CHECK
# =========================================================

def health_check(request):
    return JsonResponse(
        {
            "status": "ok",
            "service": "linksnip-backend",
        }
    )


# =========================================================
# URLS
# =========================================================

urlpatterns = [
    # =====================================================
    # HEALTH
    # =====================================================

    path(
        "health/",
        health_check,
        name="health",
    ),

    # =====================================================
    # ADMIN
    # =====================================================

    path(
        "admin/",
        admin.site.urls,
    ),

    # =====================================================
    # AUTH
    # =====================================================

    path(
        "api/auth/",
        include("accounts.urls"),
    ),

    # =====================================================
    # LINKS
    # =====================================================

    path(
        "api/links/",
        include("links.urls"),
    ),

    # =====================================================
    # ANALYTICS
    # =====================================================

    path(
        "api/analytics/",
        include("analytics.urls"),
    ),

    # =====================================================
    # OPENAPI SCHEMA
    # =====================================================

    path(
        "api/schema/",
        SpectacularAPIView.as_view(),
        name="schema",
    ),

    # =====================================================
    # SWAGGER UI
    # =====================================================

    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(
            url_name="schema",
        ),
        name="swagger-ui",
    ),

    # =====================================================
    # PASSWORD-PROTECTED SHORT LINKS
    # =====================================================

    path(
        "verify-link/<str:short_code>/",
        verify_link,
        name="verify_link",
    ),

    # =====================================================
    # SHORT LINK REDIRECT
    # =====================================================

    path(
        "<str:short_code>/",
        redirect_link,
        name="redirect_link",
    ),
]