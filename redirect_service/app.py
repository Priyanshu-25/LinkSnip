import json
import os
import time
from datetime import datetime, timezone
from urllib.parse import quote, urlencode
from urllib.request import Request as URLRequest, urlopen
import ipaddress

import psycopg
import redis

from fastapi import FastAPI, Request
from fastapi.responses import (
    HTMLResponse,
    RedirectResponse,
)


app = FastAPI(
    title="LinkSnip Redirect Service",
    version="1.0.0",
)


# =========================================================
# ENVIRONMENT
# =========================================================

REDIS_URL = os.getenv(
    "REDIS_URL",
    "redis://127.0.0.1:6379/1",
)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@127.0.0.1:5432/linkora_db",
)

CACHE_TTL = int(
    os.getenv(
        "REDIRECT_CACHE_TTL",
        "300",
    )
)

BACKEND_BASE_URL = os.getenv(
    "BACKEND_BASE_URL",
    "http://127.0.0.1:8000",
)

GEO_PROVIDER_URL = os.getenv(
    "GEO_PROVIDER_URL",
    "",
).strip()

GEO_API_TOKEN = os.getenv(
    "GEO_API_TOKEN",
    "",
).strip()


# =========================================================
# CLIENTS
# =========================================================

redis_client = redis.Redis.from_url(
    REDIS_URL,
    decode_responses=True,
)


# =========================================================
# CACHE
# =========================================================

def cache_key(short_code):
    return (
        f"linksnip:redirect:"
        f"{short_code.lower()}"
    )


def get_cached(short_code):
    value = redis_client.get(
        cache_key(short_code)
    )

    if not value:
        return None

    try:
        return json.loads(value)
    except json.JSONDecodeError:
        redis_client.delete(
            cache_key(short_code)
        )
        return None


def set_cached(
    short_code,
    data,
):
    redis_client.setex(
        cache_key(short_code),
        CACHE_TTL,
        json.dumps(
            data,
            default=str,
        ),
    )


# =========================================================
# DATABASE LOOKUP
# =========================================================

def get_link_from_database(
    short_code,
):
    query = """
        SELECT
            id,
            short_code,
            custom_alias,
            original_url,
            expires_at,
            click_limit,
            click_count,
            is_active,
            is_archived,
            redirect_type,
            is_password_protected,
            password_hash
        FROM links_link
        WHERE
            LOWER(short_code) = LOWER(%s)
            OR LOWER(custom_alias) = LOWER(%s)
        LIMIT 1;
    """

    with psycopg.connect(
        DATABASE_URL
    ) as connection:

        with connection.cursor() as cursor:
            cursor.execute(
                query,
                (
                    short_code,
                    short_code,
                ),
            )

            row = cursor.fetchone()

            if row is None:
                return None

            columns = [
                "id",
                "short_code",
                "custom_alias",
                "original_url",
                "expires_at",
                "click_limit",
                "click_count",
                "is_active",
                "is_archived",
                "redirect_type",
                "is_password_protected",
                "password_hash",
            ]

            return dict(
                zip(columns, row)
            )


def get_link(
    short_code,
):
    cached = get_cached(
        short_code
    )

    if cached is not None:
        return cached, True

    link = get_link_from_database(
        short_code
    )

    if link is None:
        return None, False

    set_cached(
        short_code,
        link,
    )

    return link, False


# =========================================================
# CLICK QUEUE
# =========================================================

CLICK_QUEUE_KEY = (
    "linksnip:click-events"
)


def lookup_country_for_ip(ip_address):
    """
    Resolve a public IP address to a country using IPinfo Lite.

    Local/private/reserved addresses return an empty value.
    Geolocation failures never block click recording.
    """

    if not ip_address:
        return ""

    try:
        parsed_ip = ipaddress.ip_address(
            str(ip_address).strip()
        )
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

    if not GEO_PROVIDER_URL or not GEO_API_TOKEN:
        return ""

    try:
        url = GEO_PROVIDER_URL.format(
            ip=str(ip_address).strip()
        )

        separator = (
            "&"
            if "?" in url
            else "?"
        )

        request = URLRequest(
            f"{url}{separator}{urlencode({'token': GEO_API_TOKEN})}",
            headers={
                "User-Agent": "LinkSnip-Redirect/1.0",
                "Accept": "application/json",
            },
        )

        with urlopen(
            request,
            timeout=3,
        ) as response:
            payload = json.loads(
                response.read().decode("utf-8")
            )

        country = (
            payload.get("country")
            or payload.get("country_name")
            or ""
        )

        return str(country).strip()

    except (
        OSError,
        ValueError,
        TimeoutError,
        json.JSONDecodeError,
    ):
        return ""


def enqueue_click(
    link,
    request_headers,
    client_ip=None,
):
    forwarded_for = request_headers.get(
        "x-forwarded-for"
    )

    real_ip = request_headers.get(
        "x-real-ip"
    )

    cloudflare_ip = request_headers.get(
        "cf-connecting-ip"
    )

    remote_addr = None

    if forwarded_for:
        remote_addr = (
            forwarded_for.split(",")[0].strip()
        )
    elif real_ip:
        remote_addr = real_ip.strip()
    elif cloudflare_ip:
        remote_addr = cloudflare_ip.strip()
    elif client_ip:
        remote_addr = str(client_ip).strip()

    user_agent = request_headers.get(
        "user-agent",
        "",
    )

    referrer = request_headers.get(
        "referer"
    )

    country = lookup_country_for_ip(
        remote_addr
    )

    event = {
        "link_id": link["id"],
        "ip_address": remote_addr,
        "country": country,
        "city": "",
        "referrer": referrer,
        "user_agent": user_agent,
        "device": detect_device(
            user_agent
        ),
        "browser": detect_browser(
            user_agent
        ),
    }

    redis_client.rpush(
        CLICK_QUEUE_KEY,
        json.dumps(
            event,
            default=str,
        ),
    )


def detect_device(user_agent):
    value = (
        user_agent or ""
    ).lower()

    if (
        "ipad" in value
        or "tablet" in value
    ):
        return "Tablet"

    if (
        "mobile" in value
        or "android" in value
        or "iphone" in value
    ):
        return "Mobile"

    return "Desktop"


def detect_browser(user_agent):
    value = (
        user_agent or ""
    ).lower()

    if "edg/" in value:
        return "Edge"

    if "chrome" in value:
        return "Chrome"

    if "firefox" in value:
        return "Firefox"

    if "safari" in value:
        return "Safari"

    if (
        "opera" in value
        or "opr/" in value
    ):
        return "Opera"

    return "Other"


# =========================================================
# FRIENDLY ERROR PAGE
# =========================================================

def unavailable_page(
    message,
    status_code=404,
):
    return HTMLResponse(
        content=f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >
    <title>Link Unavailable | LinkSnip</title>

    <style>
        body {{
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f4f7fb;
            font-family: Arial, sans-serif;
        }}

        .card {{
            width: 90%;
            max-width: 480px;
            padding: 36px;
            background: white;
            border-radius: 16px;
            text-align: center;
            box-shadow:
                0 10px 30px
                rgba(0, 0, 0, 0.08);
        }}

        .brand {{
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 24px;
        }}

        h1 {{
            margin-bottom: 12px;
        }}

        p {{
            color: #64748b;
            line-height: 1.6;
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
        """,
        status_code=status_code,
    )


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get(
    "/health",
)
def health():
    redis_ok = False
    database_ok = False

    try:
        redis_ok = bool(
            redis_client.ping()
        )
    except Exception:
        redis_ok = False

    try:
        with psycopg.connect(
            DATABASE_URL
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1"
                )
                database_ok = (
                    cursor.fetchone()
                    == (1,)
                )
    except Exception:
        database_ok = False

    return {
        "status": (
            "ok"
            if redis_ok and database_ok
            else "degraded"
        ),
        "redis": redis_ok,
        "database": database_ok,
    }


# =========================================================
# REDIRECT
# =========================================================

@app.get(
    "/{short_code}",
)
@app.get(
    "/{short_code}/",
)
def redirect_link(
    short_code: str,
    request: Request,
):
    started = time.perf_counter()

    link, cache_hit = get_link(
        short_code
    )

    if link is None:
        return unavailable_page(
            "This short link does not exist."
        )

    if (
        not link["is_active"]
        or link["is_archived"]
    ):
        return unavailable_page(
            "This link is currently unavailable."
        )

    expires_at = link[
        "expires_at"
    ]

    if expires_at:
        if (
            expires_at.tzinfo is None
        ):
            expires_at = expires_at.replace(
                tzinfo=timezone.utc
            )

        if (
            datetime.now(timezone.utc)
            >= expires_at
        ):
            return unavailable_page(
                "This link has expired."
            )

    click_limit = link[
        "click_limit"
    ]

    click_count = int(
        link["click_count"] or 0
    )

    if (
        click_limit is not None
        and click_count >= click_limit
    ):
        return unavailable_page(
            "This link has reached its maximum number of visits."
        )

    # Password-protected links continue
    # through Django's existing verification page.
    if link[
        "is_password_protected"
    ]:
        target = (
            f"{BACKEND_BASE_URL.rstrip('/')}"
            f"/verify-link/"
            f"{quote(short_code)}"
            f"/"
        )

        return RedirectResponse(
            target,
            status_code=302,
        )

    # Queue analytics without blocking redirect.
    # Queue errors must never stop the user redirect.
    try:
        enqueue_click(
            link,
            dict(request.headers),
            client_ip=(
                request.client.host
                if request.client
                else None
            ),
        )
    except Exception:
        pass

    redirect_type = int(
        link["redirect_type"]
    )

    elapsed_ms = (
        time.perf_counter()
        - started
    ) * 1000

    # Expose benchmark metadata in headers.
    headers = {
        "X-LinkSnip-Cache": (
            "HIT"
            if cache_hit
            else "MISS"
        ),
        "X-LinkSnip-Redirect-MS":
            f"{elapsed_ms:.3f}",
    }

    if redirect_type == 301:
        return RedirectResponse(
            link["original_url"],
            status_code=301,
            headers=headers,
        )

    return RedirectResponse(
        link["original_url"],
        status_code=302,
        headers=headers,
    )