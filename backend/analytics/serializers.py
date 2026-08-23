from rest_framework import serializers

from .models import ClickEvent


class ClickEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClickEvent
        fields = [
            "id",
            "timestamp",
            "ip_address",
            "country",
            "city",
            "referrer",
            "device",
            "browser",
            "user_agent",
        ]
        read_only_fields = fields