from django.db import models

from links.models import Link


class ClickEvent(models.Model):
    link = models.ForeignKey(
        Link,
        on_delete=models.CASCADE,
        related_name="click_events",
    )

    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
    )

    country = models.CharField(
        max_length=100,
        null=True,
        blank=True,
    )

    city = models.CharField(
        max_length=100,
        null=True,
        blank=True,
    )

    referrer = models.URLField(
        max_length=2048,
        null=True,
        blank=True,
    )

    user_agent = models.TextField(
        blank=True,
        default="",
    )

    device = models.CharField(
        max_length=50,
        blank=True,
        default="Unknown",
    )

    browser = models.CharField(
        max_length=50,
        blank=True,
        default="Unknown",
    )

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(
                fields=["link", "-timestamp"]
            ),
            models.Index(
                fields=["country"]
            ),
            models.Index(
                fields=["device"]
            ),
            models.Index(
                fields=["browser"]
            ),
        ]

    def __str__(self):
        return f"{self.link} - {self.timestamp}"