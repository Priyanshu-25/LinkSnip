import csv
import ipaddress
import json
import io
from functools import lru_cache
from urllib.error import URLError
from urllib.request import Request, urlopen

from django.contrib.auth.hashers import check_password
from django.db.models import Q
from django.core.cache import cache
from django.http import HttpResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404, redirect
from django.http import HttpResponseRedirect, HttpResponsePermanentRedirect
from django.utils import timezone

from rest_framework import generics
from rest_framework.authentication import SessionAuthentication
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from analytics.models import ClickEvent

from .models import Link
from .serializers import LinkSerializer
from .redirect_cache import (
    get_cached_link,
    invalidate_link_cache,
    warm_link_cache,
)
from analytics.click_queue import enqueue_click


# =========================================================
# ANALYTICS HELPERS
# =========================================================

def get_client_ip(request):
    forwarded_for = request.META.get(
        "HTTP_X_FORWARDED_FOR"
    )

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    return request.META.get("REMOTE_ADDR")


def detect_device(user_agent):
    user_agent = user_agent.lower()

    if "ipad" in user_agent or "tablet" in user_agent:
        return "Tablet"

    if "mobile" in user_agent or "android" in user_agent:
        return "Mobile"

    return "Desktop"


def detect_browser(user_agent):
    user_agent = user_agent.lower()

    if "edg/" in user_agent:
        return "Edge"

    if "chrome" in user_agent:
        return "Chrome"

    if "firefox" in user_agent:
        return "Firefox"

    if "safari" in user_agent:
        return "Safari"

    if "opera" in user_agent or "opr/" in user_agent:
        return "Opera"

    return "Other"


@lru_cache(maxsize=1024)
def lookup_country_for_ip(ip_address):
    """
    Resolve a public IP address to a country name.

    Uses IPinfo Lite:
        https://api.ipinfo.io/lite/<ip>?token=<token>

    Local/private IPs return an empty value because they do not represent
    a public visitor location.

    The lookup is best-effort. If the external lookup is unavailable,
    analytics recording still succeeds without a country.
    """
    import os

    if not ip_address:
        return ""

    try:
        parsed_ip = ipaddress.ip_address(ip_address.strip())
    except ValueError:
        return ""

    if (
        parsed_ip.is_private
        or parsed_ip.is_loopback
        or parsed_ip.is_reserved
        or parsed_ip.is_unspecified
        or parsed_ip.is_link_local
    ):
        return ""

    provider_url = os.getenv("GEO_PROVIDER_URL", "").strip()
    api_token = os.getenv("GEO_API_TOKEN", "").strip()

    if not provider_url or not api_token:
        return ""

    try:
        url = provider_url.format(ip=ip_address.strip())

        separator = "&" if "?" in url else "?"

        request = Request(
            f"{url}{separator}token={api_token}",
            headers={
                "User-Agent": "LinkSnip/1.0",
                "Accept": "application/json",
            },
        )

        with urlopen(request, timeout=5) as response:
            payload = json.loads(
                response.read().decode("utf-8")
            )

        country_name = (
            payload.get("country")
            or payload.get("country_name")
            or ""
        )

        return str(country_name).strip()

    except (
        URLError,
        TimeoutError,
        ValueError,
        json.JSONDecodeError,
        OSError,
    ):
        return ""


def get_country_from_request(
    request,
    ip_address,
):
    """
    Prefer country information supplied by the deployment platform.
    Fall back to an IP geolocation lookup.
    """
    country = (
        request.META.get("HTTP_CF_IPCOUNTRY")
        or request.META.get("HTTP_X_COUNTRY_CODE")
        or request.META.get("HTTP_X_APPENGINE_COUNTRY")
    )

    if country:
        return country.strip()

    return lookup_country_for_ip(
        ip_address
    )


def record_click(request, link, referrer=None):
    user_agent = request.META.get(
        "HTTP_USER_AGENT",
        "",
    )

    ip_address = get_client_ip(
        request
    )

    # Use an explicitly supplied referrer when available.
    # Otherwise use the current HTTP Referer header.
    if referrer is None:
        referrer = request.META.get(
            "HTTP_REFERER"
        )

    country = get_country_from_request(
        request,
        ip_address,
    )

    ClickEvent.objects.create(
        link=link,
        ip_address=ip_address,
        country=country,
        referrer=referrer,
        user_agent=user_agent,
        device=detect_device(user_agent),
        browser=detect_browser(user_agent),
    )


# =========================================================
# LINK API
# =========================================================

class LinkCreateListView(
    generics.ListCreateAPIView
):
    serializer_class = LinkSerializer

    # -----------------------------------------------------
    # JWT is the authentication mechanism used by the
    # React dashboard. Keep SessionAuthentication available
    # for the other protected link views in this module.
    # -----------------------------------------------------

    authentication_classes = [
        JWTAuthentication,
    ]

    def get_permissions(self):
        # -------------------------------------------------
        # POST /api/links/
        #
        # Public short-link creation from the landing page.
        # -------------------------------------------------

        if self.request.method == "POST":
            return [
                AllowAny()
            ]

        # -------------------------------------------------
        # GET /api/links/
        #
        # Dashboard / My Links / Analytics must be
        # authenticated.
        # -------------------------------------------------

        return [
            IsAuthenticated()
        ]

    def get_queryset(self):
        # -------------------------------------------------
        # Never expose another user's links.
        # -------------------------------------------------

        user = self.request.user

        if not user.is_authenticated:
            return Link.objects.none()

        return (
            Link.objects
            .filter(
                user=user,
                is_archived=False,
            )
            .order_by(
                "-created_at"
            )
        )

    def perform_create(
        self,
        serializer,
    ):
        # -------------------------------------------------
        # Public visitor:
        # create an anonymous link.
        # -------------------------------------------------

        if (
            self.request.user
            and self.request.user.is_authenticated
        ):
            serializer.save(
                user=self.request.user
            )
        else:
            serializer.save()


class LinkBulkImportView(
    generics.GenericAPIView
):
    """
    Import multiple links from a CSV file.

    Required column:
        original_url

    Optional columns:
        custom_alias
        folder
        tags

    For tags, use semicolons inside the CSV cell:
        campaign;summer;social
    """

    serializer_class = LinkSerializer
    authentication_classes = [
        JWTAuthentication,
        SessionAuthentication,
    ]
    permission_classes = [
        IsAuthenticated,
    ]
    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    MAX_FILE_SIZE = 2 * 1024 * 1024
    MAX_ROWS = 100

    def post(self, request, *args, **kwargs):
        uploaded_file = request.FILES.get("file")

        if not uploaded_file:
            return Response(
                {
                    "detail": "Please upload a CSV file using the 'file' field."
                },
                status=400,
            )

        if uploaded_file.size > self.MAX_FILE_SIZE:
            return Response(
                {
                    "detail": "CSV file must be 2 MB or smaller."
                },
                status=400,
            )

        filename = (uploaded_file.name or "").lower()

        if not filename.endswith(".csv"):
            return Response(
                {
                    "detail": "Only .csv files are supported."
                },
                status=400,
            )

        try:
            raw = uploaded_file.read()
            decoded = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            return Response(
                {
                    "detail": "CSV must use UTF-8 encoding."
                },
                status=400,
            )

        # -----------------------------------------------------
        # Parse CSV robustly
        # -----------------------------------------------------

        try:
            sample = decoded[:4096]

            try:
                dialect = csv.Sniffer().sniff(
                    sample,
                    delimiters=",;\\t",
                )
            except csv.Error:
                dialect = csv.excel

            reader = csv.DictReader(
                io.StringIO(decoded),
                dialect=dialect,
            )

        except csv.Error:
            return Response(
                {
                    "detail": "Unable to read the CSV file."
                },
                status=400,
            )

        if not reader.fieldnames:
            return Response(
                {
                    "detail": (
                        "CSV file is empty or missing a header row."
                    )
                },
                status=400,
            )

        # Excel/Google Sheets may add whitespace, BOM,
        # or different capitalization to headers.
        raw_headers = list(reader.fieldnames)

        def normalize_header(header):
            return (
                str(header or "")
                .replace("\\ufeff", "")
                .strip()
                .lower()
                .replace(" ", "_")
                .replace("-", "_")
            )

        normalized_headers = {
            normalize_header(header): header
            for header in raw_headers
        }

        # Accept the required PRD name plus a few safe aliases
        # so users do not get a confusing error from Excel.
        original_url_key = next(
            (
                normalized_headers[key]
                for key in (
                    "original_url",
                    "originalurl",
                    "url",
                    "destination_url",
                    "destination",
                )
                if key in normalized_headers
            ),
            None,
        )

        if original_url_key is None:
            return Response(
                {
                    "detail": (
                        "CSV must contain an 'original_url' "
                        "column. Use: "
                        "original_url,custom_alias,folder,tags"
                    )
                },
                status=400,
            )

        field_map = {}

        for header in raw_headers:
            field_map[
                normalize_header(header)
            ] = header

        # Always map the required field to original_url.
        field_map["original_url"] = original_url_key

        results = []
        created_count = 0
        failed_count = 0
        seen_aliases = set()

        for row_number, raw_row in enumerate(
            reader,
            start=2,
        ):
            if row_number > self.MAX_ROWS + 1:
                results.append(
                    {
                        "row": row_number,
                        "status": "error",
                        "message": (
                            f"Maximum {self.MAX_ROWS} data rows "
                            "are allowed per upload."
                        ),
                    }
                )
                failed_count += 1
                break

            def cell(name):
                source_key = field_map.get(
                    normalize_header(name)
                )

                if source_key is None:
                    return ""

                value = raw_row.get(source_key)

                if value is None:
                    return ""

                return str(value).strip()

            original_url = cell(
                "original_url"
            )

            if not original_url:
                results.append(
                    {
                        "row": row_number,
                        "status": "error",
                        "message": "original_url is required.",
                    }
                )
                failed_count += 1
                continue

            custom_alias = cell(
                "custom_alias"
            )

            folder = cell(
                "folder"
            )

            tags_raw = cell(
                "tags"
            )

            tags = [
                tag.strip()
                for tag in tags_raw.split(";")
                if tag.strip()
            ]

            if custom_alias:
                alias_key = custom_alias.lower()

                if alias_key in seen_aliases:
                    results.append(
                        {
                            "row": row_number,
                            "status": "error",
                            "message": (
                                "Custom alias is duplicated "
                                "inside this CSV."
                            ),
                        }
                    )
                    failed_count += 1
                    continue

                seen_aliases.add(
                    alias_key
                )

            payload = {
                "original_url": original_url,
                "custom_alias": (
                    custom_alias or None
                ),
                "folder": folder,
                "tags": tags,
            }

            serializer = self.get_serializer(
                data=payload
            )

            if not serializer.is_valid():
                error_message = "; ".join(
                    [
                        f"{field}: {', '.join(map(str, messages))}"
                        for field, messages
                        in serializer.errors.items()
                    ]
                )

                results.append(
                    {
                        "row": row_number,
                        "status": "error",
                        "message": error_message
                        or "Invalid row.",
                    }
                )
                failed_count += 1
                continue

            try:
                link = serializer.save(
                    user=request.user
                )

                created_count += 1

                results.append(
                    {
                        "row": row_number,
                        "status": "created",
                        "id": link.id,
                        "short_code": (
                            link.custom_alias
                            or link.short_code
                        ),
                        "message": "Link created.",
                    }
                )

            except Exception as exc:
                results.append(
                    {
                        "row": row_number,
                        "status": "error",
                        "message": (
                            "Unable to create this row."
                        ),
                    }
                )
                failed_count += 1

        return Response(
            {
                "total_rows": created_count
                + failed_count,
                "created": created_count,
                "failed": failed_count,
                "results": results,
            },
            status=201 if created_count else 400,
        )


class LinkDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = LinkSerializer

    authentication_classes = [
        JWTAuthentication,
        SessionAuthentication,
    ]

    permission_classes = [
        IsAuthenticated
    ]

    def get_queryset(self):
        return Link.objects.filter(
            user=self.request.user,
        )

    def perform_update(self, serializer):
        old_instance = self.get_object()

        old_short_code = (
            old_instance.short_code
        )

        old_alias = (
            old_instance.custom_alias
        )

        instance = serializer.save()

        cache.delete(
            f"linksnip:redirect:{old_short_code.lower()}"
        )

        if old_alias:
            cache.delete(
                f"linksnip:redirect:{old_alias.lower()}"
            )

        warm_link_cache(instance)

    def perform_destroy(self, instance):
        invalidate_link_cache(instance)

        instance.is_archived = True

        instance.save(
            update_fields=[
                "is_archived"
            ]
        )


class LinkPermanentDeleteView(
    generics.DestroyAPIView
):
    """
    Permanently delete a link owned by the
    authenticated user.

    The existing LinkDetailView DELETE operation
    intentionally archives links, so permanent
    deletion uses this separate endpoint.
    """

    serializer_class = LinkSerializer

    authentication_classes = [
        JWTAuthentication,
        SessionAuthentication,
    ]

    permission_classes = [
        IsAuthenticated,
    ]

    def get_queryset(self):
        return Link.objects.filter(
            user=self.request.user,
        )

    def perform_destroy(self, instance):
        invalidate_link_cache(instance)
        instance.delete()


# =========================================================
# SHORT LINK REDIRECT
# =========================================================

def redirect_link(request, short_code):
    # =====================================================
    # READ-THROUGH REDIS CACHE
    # =====================================================

    link = get_cached_link(short_code)

    if link is None:
        return link_unavailable_page(
            "This link could not be found."
        )

    # =====================================================
    # INACTIVE / ARCHIVED
    # =====================================================

    if (
        not link["is_active"]
        or link["is_archived"]
    ):
        return link_unavailable_page(
            "This link is currently unavailable."
        )

    # =====================================================
    # EXPIRATION
    # =====================================================

    expires_at = link["expires_at"]

    if expires_at:
        from datetime import datetime

        expires_datetime = datetime.fromisoformat(
            expires_at
        )

        if timezone.now() >= expires_datetime:
            source_link = (
                Link.objects
                .filter(id=link["id"])
                .first()
            )

            if source_link:
                source_link.is_active = False
                source_link.save(
                    update_fields=["is_active"]
                )

                invalidate_link_cache(
                    source_link
                )

            return link_unavailable_page(
                "This link has expired."
            )

    # =====================================================
    # CLICK LIMIT
    # =====================================================

    click_limit = link["click_limit"]
    click_count = int(
        link["click_count"] or 0
    )

    if (
        click_limit is not None
        and click_count >= click_limit
    ):
        source_link = (
            Link.objects
            .filter(id=link["id"])
            .first()
        )

        if source_link:
            source_link.is_active = False
            source_link.save(
                update_fields=["is_active"]
            )

            invalidate_link_cache(
                source_link
            )

        return link_unavailable_page(
            "This link has reached its maximum number of visits."
        )

    # =====================================================
    # PASSWORD PROTECTION
    # =====================================================

    if link["is_password_protected"]:
        session_key = (
            f"link_verified_{link['id']}"
        )

        verified_password_hash = (
            request.session.get(
                session_key
            )
        )

        if (
            not verified_password_hash
            or verified_password_hash
            != link["password_hash"]
        ):
            request.session[
                f"link_original_referrer_{link['id']}"
            ] = request.META.get(
                "HTTP_REFERER"
            )

            return redirect(
                f"/verify-link/{short_code}/"
            )

    # =====================================================
    # ASYNC ANALYTICS EVENT
    # =====================================================

    enqueue_click(
        {
            "link_id": link["id"],
            "ip_address": get_client_ip(request),
            "country": get_country_from_request(
                request,
                get_client_ip(request),
            ),
            "city": "",
            "referrer": request.META.get(
                "HTTP_REFERER"
            ),
            "user_agent": request.META.get(
                "HTTP_USER_AGENT",
                "",
            ),
            "device": detect_device(
                request.META.get(
                    "HTTP_USER_AGENT",
                    "",
                )
            ),
            "browser": detect_browser(
                request.META.get(
                    "HTTP_USER_AGENT",
                    "",
                )
            ),
        }
    )

    # =====================================================
    # FAST REDIRECT
    # =====================================================

    if (
        int(link["redirect_type"])
        == Link.REDIRECT_301
    ):
        return HttpResponsePermanentRedirect(
            link["original_url"]
        )

    return HttpResponseRedirect(
        link["original_url"]
    )


# =========================================================
# PASSWORD PROTECTED LINK
# =========================================================

def verify_link(request, short_code):
    link = get_object_or_404(
        Link,
        Q(short_code=short_code)
        | Q(custom_alias=short_code),
        is_active=True,
        is_archived=False,
    )

    if request.method == "POST":
        password = request.POST.get(
            "password",
            "",
        )

        if not link.password_hash:
            if link.redirect_type == Link.REDIRECT_301:
                return HttpResponsePermanentRedirect(
                    link.original_url
                )

            return HttpResponseRedirect(
                link.original_url
            )

        if check_password(
            password,
            link.password_hash,
        ):
            # -------------------------------------------------
            # Store the CURRENT password hash as verified.
            # -------------------------------------------------

            request.session[
                f"link_verified_{link.id}"
            ] = link.password_hash

            # -------------------------------------------------
            # Retrieve the original referrer saved before
            # the visitor was redirected to the password page.
            # -------------------------------------------------

            original_referrer = (
                request.session.get(
                    f"link_original_referrer_{link.id}"
                )
            )

            # -------------------------------------------------
            # Queue the click asynchronously.
            # This prevents the password verification request
            # from waiting on the analytics database write.
            # -------------------------------------------------

            user_agent = request.META.get(
                "HTTP_USER_AGENT",
                "",
            )

            ip_address = get_client_ip(
                request
            )

            enqueue_click(
                {
                    "link_id": link.id,
                    "ip_address": ip_address,
                    "country": get_country_from_request(
                        request,
                        ip_address,
                    ),
                    "city": "",
                    "referrer": original_referrer,
                    "user_agent": user_agent,
                    "device": detect_device(
                        user_agent
                    ),
                    "browser": detect_browser(
                        user_agent
                    ),
                }
            )

            # The worker updates PostgreSQL click_count.

            # -------------------------------------------------
            # Remove the temporary referrer from the session.
            # -------------------------------------------------

            request.session.pop(
                f"link_original_referrer_{link.id}",
                None,
            )

            if link.redirect_type == Link.REDIRECT_301:
                return HttpResponsePermanentRedirect(
                    link.original_url
                )

            return HttpResponseRedirect(
                link.original_url
            )

        return verify_password_page(
            short_code,
            "Incorrect password. Please try again.",
            request,
        )

    return verify_password_page(
        short_code,
        request=request,
    )


# =========================================================
# PASSWORD PAGE
# =========================================================

def verify_password_page(
    short_code,
    error=None,
    request=None,
):
    error_html = ""

    if error:
        error_html = f"""
        <p style="color:#dc2626;margin-bottom:16px;">
            {error}
        </p>
        """

    csrf_token = get_token(request)

    html = f"""
    <!DOCTYPE html>
    <html>

    <head>
        <title>
            Protected Link | LinkSnip
        </title>

        <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
        >

        <style>
            body {{
                margin: 0;
                font-family: Arial, sans-serif;
                background: #f4f7fb;

                display: flex;
                justify-content: center;
                align-items: center;

                min-height: 100vh;
            }}

            .card {{
                width: 90%;
                max-width: 420px;

                background: white;
                padding: 32px;

                border-radius: 16px;

                box-shadow:
                    0 10px 30px
                    rgba(0,0,0,0.08);

                text-align: center;
            }}

            h1 {{
                margin-bottom: 10px;
            }}

            p {{
                color: #64748b;
            }}

            input {{
                width: 100%;
                padding: 12px;

                margin: 18px 0;

                border:
                    1px solid #cbd5e1;

                border-radius: 8px;

                box-sizing: border-box;
            }}

            button {{
                width: 100%;
                padding: 12px;

                border: none;
                border-radius: 8px;

                background: #111827;
                color: white;

                cursor: pointer;
                font-size: 15px;
            }}

            .brand {{
                font-weight: bold;
                margin-bottom: 24px;
                font-size: 20px;
            }}
        </style>
    </head>

    <body>

        <div class="card">

            <div class="brand">
                LinkSnip
            </div>

            <h1>
                🔐 Protected Link
            </h1>

            <p>
                This link is password protected.
            </p>

            {error_html}

            <form method="post">

                <input
                    type="hidden"
                    name="csrfmiddlewaretoken"
                    value="{csrf_token}"
                >

                <input
                    type="password"
                    name="password"
                    placeholder="Enter password"
                    required
                >

                <button type="submit">
                    Continue
                </button>

            </form>

        </div>

    </body>
    </html>
    """

    return HttpResponse(html)


# =========================================================
# UNAVAILABLE LINK PAGE
# =========================================================

def link_unavailable_page(message):
    html = f"""
    <!DOCTYPE html>
    <html>

    <head>
        <title>
            Link Unavailable | LinkSnip
        </title>

        <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
        >

        <style>
            body {{
                margin: 0;
                font-family: Arial, sans-serif;
                background: #f4f7fb;

                display: flex;
                justify-content: center;
                align-items: center;

                min-height: 100vh;
            }}

            .card {{
                width: 90%;
                max-width: 480px;

                background: white;
                padding: 36px;

                border-radius: 16px;

                text-align: center;

                box-shadow:
                    0 10px 30px
                    rgba(0,0,0,0.08);
            }}

            .brand {{
                font-weight: bold;
                font-size: 20px;
                margin-bottom: 25px;
            }}

            h1 {{
                margin-bottom: 12px;
            }}

            p {{
                color: #64748b;
            }}
        </style>
    </head>

    <body>

        <div class="card">

            <div class="brand">
                LinkSnip
            </div>

            <h1>
                🔒 Link Unavailable
            </h1>

            <p>
                {message}
            </p>

        </div>

    </body>
    </html>
    """

    return HttpResponse(html)