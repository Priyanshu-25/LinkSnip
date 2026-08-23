from django.db.models.signals import (
    post_delete,
    post_save,
)
from django.dispatch import receiver

from .models import Link
from .redirect_cache import (
    invalidate_link_cache,
    warm_link_cache,
)


@receiver(
    post_save,
    sender=Link,
)
def update_redirect_cache(
    sender,
    instance,
    **kwargs,
):
    warm_link_cache(
        instance
    )


@receiver(
    post_delete,
    sender=Link,
)
def remove_redirect_cache(
    sender,
    instance,
    **kwargs,
):
    invalidate_link_cache(
        instance
    )