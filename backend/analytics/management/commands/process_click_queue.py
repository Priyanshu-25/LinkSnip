import os
import time

from django.core.management.base import BaseCommand
from django.db import transaction

from analytics.click_queue import (
    dequeue_click,
    enqueue_click,
)
from analytics.geo import lookup_ip
from analytics.models import ClickEvent
from analytics.timescale import (
    ensure_timescale_schema,
    write_click_event,
)
from links.models import Link


class Command(BaseCommand):
    help = "Process LinkSnip asynchronous click events."

    def handle(
        self,
        *args,
        **options,
    ):
        # =========================================================
        # TIMESCALEDB MODE
        # =========================================================
        #
        # USE_TIMESCALE=true
        #     PostgreSQL + TimescaleDB
        #
        # USE_TIMESCALE=false
        #     PostgreSQL only
        #
        # Default:
        #     true
        #
        # This keeps the existing local TimescaleDB setup working
        # while allowing Render free deployment without TimescaleDB.
        # =========================================================

        use_timescale = (
            os.getenv(
                "USE_TIMESCALE",
                "true",
            )
            .strip()
            .lower()
            in {
                "1",
                "true",
                "yes",
                "on",
            }
        )

        # =========================================================
        # INITIALIZE TIMESCALEDB WHEN ENABLED
        # =========================================================

        if use_timescale:
            self.stdout.write(
                self.style.SUCCESS(
                    "TimescaleDB enabled."
                )
            )

            self.stdout.write(
                self.style.SUCCESS(
                    "Initializing TimescaleDB..."
                )
            )

            try:
                ensure_timescale_schema()

                self.stdout.write(
                    self.style.SUCCESS(
                        "TimescaleDB ready."
                    )
                )

            except Exception as exc:
                # Do not stop the worker completely.
                # PostgreSQL analytics can still continue.
                self.stderr.write(
                    self.style.WARNING(
                        "TimescaleDB initialization failed; "
                        "falling back to PostgreSQL analytics: "
                        f"{exc}"
                    )
                )

                use_timescale = False

        else:
            self.stdout.write(
                self.style.WARNING(
                    "TimescaleDB disabled. "
                    "Using PostgreSQL analytics only."
                )
            )

        # =========================================================
        # START WORKER
        # =========================================================

        self.stdout.write(
            self.style.SUCCESS(
                "LinkSnip click worker started."
            )
        )

        # =========================================================
        # PROCESS QUEUE
        # =========================================================

        while True:
            event = None

            try:
                event = dequeue_click(
                    timeout=5
                )

                if event is None:
                    continue

                # =================================================
                # VALIDATE LINK ID
                # =================================================

                link_id = event.get(
                    "link_id"
                )

                if not link_id:
                    self.stderr.write(
                        self.style.WARNING(
                            "Ignoring click event without link_id."
                        )
                    )
                    continue

                # =================================================
                # GEO ENRICHMENT
                # =================================================
                #
                # This happens in the background worker,
                # not during the redirect request.
                # =================================================

                ip_address = event.get(
                    "ip_address"
                )

                geo = lookup_ip(
                    ip_address
                )

                event["country"] = (
                    geo.get(
                        "country",
                        "",
                    )
                    or ""
                )

                event["city"] = (
                    geo.get(
                        "city",
                        "",
                    )
                    or ""
                )

                # =================================================
                # 1. POSTGRESQL ANALYTICS
                # =================================================

                with transaction.atomic():
                    link = (
                        Link.objects
                        .select_for_update()
                        .get(
                            id=link_id
                        )
                    )

                    ClickEvent.objects.create(
                        link=link,
                        ip_address=event.get(
                            "ip_address"
                        ),
                        country=event.get(
                            "country",
                            "",
                        ),
                        city=event.get(
                            "city",
                            "",
                        ),
                        referrer=event.get(
                            "referrer"
                        ),
                        user_agent=event.get(
                            "user_agent",
                            "",
                        ),
                        device=event.get(
                            "device",
                            "Unknown",
                        ),
                        browser=event.get(
                            "browser",
                            "Unknown",
                        ),
                    )

                    link.click_count += 1

                    link.save(
                        update_fields=[
                            "click_count"
                        ]
                    )

                # =================================================
                # 2. TIMESCALEDB ANALYTICS
                # =================================================
                #
                # Only execute this when TimescaleDB is enabled
                # and initialized successfully.
                # =================================================

                if use_timescale:
                    write_click_event(
                        event
                    )

                # =================================================
                # SUCCESS LOG
                # =================================================

                if use_timescale:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Processed click for link {link_id} "
                            "→ PostgreSQL + TimescaleDB"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Processed click for link {link_id} "
                            "→ PostgreSQL"
                        )
                    )

            # =====================================================
            # LINK NO LONGER EXISTS
            # =====================================================

            except Link.DoesNotExist:
                self.stderr.write(
                    self.style.WARNING(
                        "Click event referenced a "
                        "link that no longer exists."
                    )
                )

            # =====================================================
            # WORKER ERROR
            # =====================================================

            except Exception as exc:
                self.stderr.write(
                    self.style.ERROR(
                        f"Click worker error: {exc}"
                    )
                )

                # -------------------------------------------------
                # REQUEUE THE EVENT
                # -------------------------------------------------

                try:
                    if event is not None:
                        enqueue_click(
                            event
                        )

                        self.stderr.write(
                            self.style.WARNING(
                                "Click event requeued."
                            )
                        )

                except Exception as requeue_error:
                    self.stderr.write(
                        self.style.ERROR(
                            "Unable to requeue click event: "
                            f"{requeue_error}"
                        )
                    )

                time.sleep(2)

            # =====================================================
            # CTRL+C
            # =====================================================

            except KeyboardInterrupt:
                self.stdout.write(
                    "\nLinkSnip click worker stopped."
                )
                break