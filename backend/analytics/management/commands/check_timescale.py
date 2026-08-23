from django.core.management.base import (
    BaseCommand,
)

from analytics.timescale import (
    ensure_timescale_schema,
    get_click_event_count,
)


class Command(BaseCommand):
    help = (
        "Verify LinkSnip TimescaleDB."
    )


    def handle(
        self,
        *args,
        **options,
    ):
        try:
            ensure_timescale_schema()

            count = (
                get_click_event_count()
            )

            self.stdout.write(
                self.style.SUCCESS(
                    "TimescaleDB connection: OK"
                )
            )

            self.stdout.write(
                self.style.SUCCESS(
                    "Hypertable: "
                    "link_click_events_ts"
                )
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f"Stored click events: {count}"
                )
            )

        except Exception as exc:
            self.stderr.write(
                self.style.ERROR(
                    "TimescaleDB check failed: "
                    f"{exc}"
                )
            )