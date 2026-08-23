from django.shortcuts import get_object_or_404

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from links.models import Link
from .models import ClickEvent


class LinkAIInsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, link_id):
        link = get_object_or_404(
            Link,
            id=link_id,
            user=request.user,
        )

        events = ClickEvent.objects.filter(
            link=link
        )

        total_clicks = events.count()

        devices = {}
        browsers = {}

        for event in events:
            devices[event.device] = (
                devices.get(event.device, 0) + 1
            )

            browsers[event.browser] = (
                browsers.get(event.browser, 0) + 1
            )

        top_device = (
            max(
                devices,
                key=devices.get,
            )
            if devices
            else "No data"
        )

        top_browser = (
            max(
                browsers,
                key=browsers.get,
            )
            if browsers
            else "No data"
        )

        if total_clicks == 0:
            summary = (
                "Your link has not received any "
                "recorded clicks yet."
            )

            recommendations = [
                "Share your link with your audience.",
                "Add the link to your campaigns.",
                "Return after your first clicks to "
                "see traffic patterns.",
            ]

        else:
            summary = (
                f"Your link has received "
                f"{total_clicks} clicks. "
                f"{top_device} is currently the "
                f"top device and {top_browser} is "
                f"the leading browser."
            )

            recommendations = [
                f"Keep optimizing for {top_device} traffic.",
                f"Review your experience on {top_browser}.",
                "Continue monitoring traffic trends "
                "as more clicks arrive.",
            ]

        return Response(
            {
                "link": {
                    "id": link.id,
                    "short_code": (
                        link.custom_alias
                        or link.short_code
                    ),
                    "original_url": link.original_url,
                },
                "summary": summary,
                "recommendations": recommendations,
                "metrics": {
                    "total_clicks": total_clicks,
                    "top_device": top_device,
                    "top_browser": top_browser,
                    "devices": devices,
                    "browsers": browsers,
                },
            }
        )