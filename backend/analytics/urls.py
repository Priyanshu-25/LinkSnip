from django.urls import path

from .ai_views import (
    LinkAIInsightsView,
)

from .views import (
    LinkAnalyticsCSVView,
    LinkAnalyticsSummaryView,
    LinkAnalyticsView,
)


urlpatterns = [
    path(
        "links/<int:link_id>/",
        LinkAnalyticsView.as_view(),
        name="link-analytics",
    ),

    path(
        "links/<int:link_id>/summary/",
        LinkAnalyticsSummaryView.as_view(),
        name="link-analytics-summary",
    ),

    path(
        "links/<int:link_id>/export/",
        LinkAnalyticsCSVView.as_view(),
        name="link-analytics-export",
    ),

    path(
        "links/<int:link_id>/ai/",
        LinkAIInsightsView.as_view(),
        name="link-ai-insights",
    ),
]