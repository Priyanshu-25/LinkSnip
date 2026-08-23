import csv

from datetime import timedelta

from django.http import HttpResponse

from django.shortcuts import get_object_or_404

from django.utils import timezone

from rest_framework import generics

from rest_framework.permissions import (
    IsAuthenticated,
)

from rest_framework.response import Response

from rest_framework.views import APIView

from links.models import Link

from .timescale_analytics import (
    get_events,
    get_summary,
)


class LinkAnalyticsView(
    generics.ListAPIView
):
    permission_classes = [
        IsAuthenticated
    ]

    def get_queryset(self):
        link_id = self.kwargs[
            "link_id"
        ]

        link = get_object_or_404(
            Link,
            id=link_id,
            user=self.request.user,
        )

        return link


    def list(
        self,
        request,
        *args,
        **kwargs,
    ):
        link = self.get_queryset()

        try:
            days = int(
                request.query_params.get(
                    "days",
                    30,
                )
            )
        except (
            TypeError,
            ValueError,
        ):
            days = 30

        if days not in [7, 30]:
            days = 30

        start_time = (
            timezone.now()
            - timedelta(
                days=days - 1
            )
        )

        events = get_events(
            link.id,
            start_time,
        )

        return Response(
            events
        )


class LinkAnalyticsSummaryView(
    APIView
):
    permission_classes = [
        IsAuthenticated
    ]

    def get(
        self,
        request,
        link_id,
    ):
        link = get_object_or_404(
            Link,
            id=link_id,
            user=request.user,
        )

        try:
            days = int(
                request.query_params.get(
                    "days",
                    30,
                )
            )
        except (
            TypeError,
            ValueError,
        ):
            days = 30

        if days not in [7, 30]:
            days = 30

        period_start = (
            timezone.now()
            - timedelta(
                days=days - 1
            )
        )

        summary = get_summary(
            link.id,
            period_start,
        )

        return Response(
            {
                "period_days": days,
                "period_start": period_start,

                "link": {
                    "id": link.id,
                    "short_code": (
                        link.custom_alias
                        or link.short_code
                    ),
                    "original_url":
                        link.original_url,
                },

                **summary,
            }
        )


class LinkAnalyticsCSVView(
    APIView
):
    permission_classes = [
        IsAuthenticated
    ]

    def get(
        self,
        request,
        link_id,
    ):
        link = get_object_or_404(
            Link,
            id=link_id,
            user=request.user,
        )

        try:
            days = int(
                request.query_params.get(
                    "days",
                    30,
                )
            )
        except (
            TypeError,
            ValueError,
        ):
            days = 30

        if days not in [7, 30]:
            days = 30

        period_start = (
            timezone.now()
            - timedelta(
                days=days - 1
            )
        )

        events = get_events(
            link.id,
            period_start,
        )

        response = HttpResponse(
            content_type="text/csv"
        )

        filename = (
            f"linksnip-"
            f"{link.custom_alias or link.short_code}-"
            f"{days}days.csv"
        )

        response[
            "Content-Disposition"
        ] = (
            f'attachment; filename="{filename}"'
        )

        writer = csv.writer(
            response
        )

        writer.writerow(
            [
                "Link",
                "Destination URL",
                "Timestamp",
                "IP Address",
                "Country",
                "City",
                "Referrer",
                "Device",
                "Browser",
                "User Agent",
            ]
        )

        for event in events:
            writer.writerow(
                [
                    (
                        link.custom_alias
                        or link.short_code
                    ),
                    link.original_url,
                    event["timestamp"],
                    event["ip_address"] or "",
                    event["country"] or "",
                    event["city"] or "",
                    event["referrer"] or "",
                    event["device"] or "",
                    event["browser"] or "",
                    event["user_agent"] or "",
                ]
            )

        return response