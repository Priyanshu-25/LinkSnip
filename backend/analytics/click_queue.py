import json

from django.core.cache import cache

from redis.exceptions import (
    TimeoutError as RedisTimeoutError,
)


CLICK_QUEUE_KEY = "linksnip:click-events"


def get_redis_client():
    return cache.client.get_client(
        write=True,
    )


def enqueue_click(event):
    payload = json.dumps(
        event,
        default=str,
    )

    client = get_redis_client()

    client.rpush(
        CLICK_QUEUE_KEY,
        payload,
    )


def dequeue_click(timeout=5):
    client = get_redis_client()

    try:
        result = client.blpop(
            CLICK_QUEUE_KEY,
            timeout=timeout,
        )

    except RedisTimeoutError:
        return None

    if not result:
        return None

    _, payload = result

    if isinstance(payload, bytes):
        payload = payload.decode(
            "utf-8"
        )

    return json.loads(payload)