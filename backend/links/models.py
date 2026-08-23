import secrets
import string

from django.contrib.auth.models import User
from django.db import models


class Link(models.Model):

    # =====================================================
    # REDIRECT TYPE
    # =====================================================

    REDIRECT_301 = 301
    REDIRECT_302 = 302

    REDIRECT_TYPE_CHOICES = [
        (
            REDIRECT_302,
            "302 Temporary",
        ),
        (
            REDIRECT_301,
            "301 Permanent",
        ),
    ]

    # =====================================================
    # OWNER
    # =====================================================

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="links",
    )

    # =====================================================
    # CORE LINK
    # =====================================================

    original_url = models.URLField(
        max_length=2048
    )

    short_code = models.CharField(
        max_length=10,
        unique=True,
        db_index=True,
    )

    custom_alias = models.CharField(
        max_length=30,
        unique=True,
        null=True,
        blank=True,
    )

    # =====================================================
    # ORGANIZATION
    # =====================================================

    folder = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        db_index=True,
    )

    tags = models.JSONField(
        default=list,
        blank=True,
    )

    # =====================================================
    # LINK INFORMATION
    # =====================================================

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    expires_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    click_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    click_count = models.PositiveIntegerField(
        default=0,
    )

    is_active = models.BooleanField(
        default=True,
    )

    is_archived = models.BooleanField(
        default=False,
    )

    # =====================================================
    # REDIRECT CONFIGURATION
    # =====================================================

    redirect_type = models.PositiveSmallIntegerField(
        choices=REDIRECT_TYPE_CHOICES,
        default=REDIRECT_302,
        help_text=(
            "HTTP redirect status used when the short link "
            "redirects to its destination."
        ),
    )

    # =====================================================
    # PASSWORD PROTECTION
    # =====================================================

    is_password_protected = models.BooleanField(
        default=False,
    )

    password_hash = models.CharField(
        max_length=128,
        null=True,
        blank=True,
    )

    # =====================================================
    # DISPLAY
    # =====================================================

    def __str__(self):
        return (
            self.custom_alias
            or self.short_code
        )

    # =====================================================
    # SHORT CODE GENERATOR
    # =====================================================

    @staticmethod
    def generate_short_code(length=7):
        characters = (
            string.ascii_letters
            + string.digits
        )

        while True:

            short_code = "".join(
                secrets.choice(characters)
                for _ in range(length)
            )

            if not Link.objects.filter(
                short_code=short_code
            ).exists():
                return short_code