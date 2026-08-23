import ipaddress
import os

import requests


GEO_PROVIDER_URL = os.getenv(
    "GEO_PROVIDER_URL",
    "https://ipapi.co/{ip}/json/",
).strip()

GEO_API_TOKEN = os.getenv(
    "GEO_API_TOKEN",
    "",
).strip()


def lookup_ip(ip_address):
    if not ip_address:
        return {"country": "", "city": ""}

    try:
        parsed = ipaddress.ip_address(ip_address)
        if (
            parsed.is_private
            or parsed.is_loopback
            or parsed.is_link_local
            or parsed.is_reserved
            or parsed.is_unspecified
        ):
            return {"country": "", "city": ""}
    except ValueError:
        return {"country": "", "city": ""}

    if not GEO_PROVIDER_URL:
        return {"country": "", "city": ""}

    try:
        url = GEO_PROVIDER_URL.format(ip=ip_address)
        headers = {"User-Agent": "LinkSnip/1.0"}

        if GEO_API_TOKEN:
            headers["Authorization"] = f"Bearer {GEO_API_TOKEN}"

        response = requests.get(
            url,
            headers=headers,
            timeout=2,
        )
        response.raise_for_status()
        data = response.json()

        return {
            "country": data.get("country") or data.get("country_name") or "",
            "city": data.get("city") or "",
        }
    except Exception:
        return {"country": "", "city": ""}
