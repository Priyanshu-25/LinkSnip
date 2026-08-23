from django.urls import path

from .views import (
    LinkBulkImportView,
    LinkCreateListView,
    LinkDetailView,
    LinkPermanentDeleteView,
)


urlpatterns = [
    path(
        "",
        LinkCreateListView.as_view(),
        name="link-list-create",
    ),

    path(
        "bulk-import/",
        LinkBulkImportView.as_view(),
        name="link-bulk-import",
    ),

    path(
        "<int:pk>/",
        LinkDetailView.as_view(),
        name="link-detail",
    ),

    path(
        "<int:pk>/permanent-delete/",
        LinkPermanentDeleteView.as_view(),
        name="link-permanent-delete",
    ),
]