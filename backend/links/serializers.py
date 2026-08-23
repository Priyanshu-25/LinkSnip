from django.conf import settings
from django.contrib.auth.hashers import make_password

import ipaddress
from urllib.parse import urlparse

from rest_framework import serializers

from .models import Link


class LinkSerializer(
    serializers.ModelSerializer
):

    short_url = serializers.SerializerMethodField(
        read_only=True,
    )

    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )

    folder = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=50,
    )

    tags = serializers.ListField(
        child=serializers.CharField(
            max_length=30,
        ),
        required=False,
        allow_empty=True,
    )

    redirect_type = serializers.ChoiceField(
        choices=Link.REDIRECT_TYPE_CHOICES,
        required=False,
        default=Link.REDIRECT_302,
    )


    class Meta:
        model = Link

        fields = [
            "id",
            "original_url",
            "short_code",
            "custom_alias",
            "short_url",

            "folder",
            "tags",

            "redirect_type",

            "created_at",
            "updated_at",

            "expires_at",
            "click_limit",
            "click_count",

            "is_active",
            "is_archived",

            "is_password_protected",
            "password",
        ]

        read_only_fields = [
            "id",
            "short_code",
            "short_url",
            "created_at",
            "updated_at",
            "click_count",
        ]


    # =====================================================
    # DESTINATION URL
    # =====================================================

    def validate_original_url(self, value):
        value = value.strip()
        parsed = urlparse(value)
        scheme = (parsed.scheme or "").lower()
        hostname = (parsed.hostname or "").strip().lower()

        if scheme not in {"http", "https"}:
            raise serializers.ValidationError(
                "Only HTTP and HTTPS destination URLs are allowed."
            )

        if not hostname:
            raise serializers.ValidationError(
                "Please provide a valid destination URL."
            )

        if hostname in {"localhost", "localhost.localdomain"}:
            raise serializers.ValidationError(
                "Localhost destinations are not allowed."
            )

        try:
            parsed_ip = ipaddress.ip_address(hostname)
        except ValueError:
            parsed_ip = None

        if parsed_ip and (
            parsed_ip.is_private
            or parsed_ip.is_loopback
            or parsed_ip.is_link_local
            or parsed_ip.is_reserved
            or parsed_ip.is_unspecified
        ):
            raise serializers.ValidationError(
                "Local or private IP destinations are not allowed."
            )

        return value


    # =====================================================
    # CUSTOM ALIAS
    # =====================================================

    def validate_custom_alias(
        self,
        value,
    ):
        if value is None:
            return value

        value = value.strip()

        if not 3 <= len(value) <= 30:
            raise serializers.ValidationError(
                "Custom alias must be between 3 and 30 characters."
            )

        allowed_characters = (
            "abcdefghijklmnopqrstuvwxyz"
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            "0123456789-"
        )

        if any(
            char not in allowed_characters
            for char in value
        ):
            raise serializers.ValidationError(
                "Custom alias can contain only letters, numbers, and hyphens."
            )

        query = Link.objects.filter(
            custom_alias__iexact=value,
        )

        current_link = self.instance

        if current_link:
            query = query.exclude(
                pk=current_link.pk,
            )

        if query.exists():
            raise serializers.ValidationError(
                "This custom alias is already in use."
            )

        return value


    # =====================================================
    # FOLDER
    # =====================================================

    def validate_folder(
        self,
        value,
    ):
        if value is None:
            return value

        value = value.strip()

        if len(value) > 50:
            raise serializers.ValidationError(
                "Folder name must be 50 characters or less."
            )

        return value


    # =====================================================
    # TAGS
    # =====================================================

    def validate_tags(
        self,
        value,
    ):
        cleaned_tags = []

        for tag in value:
            tag = tag.strip()

            if not tag:
                continue

            if len(tag) > 30:
                raise serializers.ValidationError(
                    "Each tag must be 30 characters or less."
                )

            existing_tags_lower = [
                existing.lower()
                for existing in cleaned_tags
            ]

            if tag.lower() not in existing_tags_lower:
                cleaned_tags.append(tag)

        if len(cleaned_tags) > 10:
            raise serializers.ValidationError(
                "You can add a maximum of 10 tags."
            )

        return cleaned_tags


    # =====================================================
    # GENERAL VALIDATION
    # =====================================================

    def validate(
        self,
        attrs,
    ):
        click_limit = attrs.get(
            "click_limit",
        )

        password = attrs.get(
            "password",
        )

        if (
            click_limit is not None
            and click_limit <= 0
        ):
            raise serializers.ValidationError(
                {
                    "click_limit":
                        "Click limit must be greater than 0."
                }
            )

        if password:
            attrs[
                "is_password_protected"
            ] = True

            attrs[
                "password_hash"
            ] = make_password(
                password,
            )

        return attrs


    # =====================================================
    # SHORT URL
    # =====================================================

    def get_short_url(
        self,
        obj,
    ):
        base_url = getattr(
            settings,
            "PUBLIC_SHORT_URL_BASE",
            "",
        ).rstrip("/")

        code = (
            obj.custom_alias
            or obj.short_code
        )

        # -------------------------------------------------
        # PUBLIC REDIRECT SERVICE
        # -------------------------------------------------

        if base_url:
            return (
                f"{base_url}/{code}/"
            )

        # -------------------------------------------------
        # FALLBACK TO CURRENT REQUEST
        # -------------------------------------------------

        request = self.context.get(
            "request",
        )

        if request:
            return request.build_absolute_uri(
                f"/{code}/",
            )

        return f"/{code}/"


    # =====================================================
    # CREATE
    # =====================================================

    def create(
        self,
        validated_data,
    ):
        request = self.context.get(
            "request",
        )

        validated_data.pop(
            "password",
            None,
        )

        if (
            request
            and request.user.is_authenticated
        ):
            validated_data[
                "user"
            ] = request.user

        validated_data[
            "short_code"
        ] = Link.generate_short_code()

        return super().create(
            validated_data,
        )


    # =====================================================
    # UPDATE
    # =====================================================

    def update(
        self,
        instance,
        validated_data,
    ):
        password = validated_data.pop(
            "password",
            None,
        )

        if password:
            validated_data[
                "is_password_protected"
            ] = True

            validated_data[
                "password_hash"
            ] = make_password(
                password,
            )

        elif (
            "is_password_protected"
            in validated_data
            and not validated_data[
                "is_password_protected"
            ]
        ):
            validated_data[
                "password_hash"
            ] = None

        return super().update(
            instance,
            validated_data,
        )