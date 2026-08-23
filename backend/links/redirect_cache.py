from django.core.cache import cache

from .models import Link


REDIRECT_CACHE_TIMEOUT = 300


def redirect_cache_key(short_code):
    return (
        f"linksnip:redirect:{short_code.lower()}"
    )


def serialize_link(link):
    return {
        "id": link.id,
        "short_code": link.short_code,
        "custom_alias": link.custom_alias,
        "original_url": link.original_url,
        "expires_at": (
            link.expires_at.isoformat()
            if link.expires_at
            else None
        ),
        "click_limit": link.click_limit,
        "click_count": link.click_count,
        "is_active": link.is_active,
        "is_archived": link.is_archived,
        "redirect_type": link.redirect_type,
        "is_password_protected": (
            link.is_password_protected
        ),
        "password_hash": (
            link.password_hash
            if link.is_password_protected
            else None
        ),
    }


def get_cached_link(short_code):
    key = redirect_cache_key(short_code)

    cached = cache.get(key)

    if cached is not None:
        return cached

    link = (
        Link.objects
        .filter(
            short_code__iexact=short_code
        )
        .first()
    )

    if link is None:
        link = (
            Link.objects
            .filter(
                custom_alias__iexact=short_code
            )
            .first()
        )

    if link is None:
        return None

    data = serialize_link(link)

    cache.set(
        key,
        data,
        timeout=REDIRECT_CACHE_TIMEOUT,
    )

    return data


def invalidate_link_cache(link):
    cache.delete(
        redirect_cache_key(
            link.short_code
        )
    )

    if link.custom_alias:
        cache.delete(
            redirect_cache_key(
                link.custom_alias
            )
        )


def warm_link_cache(link):
    data = serialize_link(link)

    cache.set(
        redirect_cache_key(
            link.short_code
        ),
        data,
        timeout=REDIRECT_CACHE_TIMEOUT,
    )

    if link.custom_alias:
        cache.set(
            redirect_cache_key(
                link.custom_alias
            ),
            data,
            timeout=REDIRECT_CACHE_TIMEOUT,
        )