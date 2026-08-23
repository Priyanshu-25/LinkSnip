from django.core.management.base import (
    BaseCommand,
)

from analytics.timescale import (
    ensure_timescale_schema,
)


class Command(BaseCommand):
    help = (
        "Initialize the LinkSnip TimescaleDB "
        "analytics schema."
    )

    def handle(
        self,
        *args,
        **options,
    ):
        try:
            ensure_timescale_schema()

            self.stdout.write(
                self.style.SUCCESS(
                    "TimescaleDB schema initialized successfully."
                )
            )

        except Exception as exc:
            self.stderr.write(
                self.style.ERROR(
                    "TimescaleDB setup failed: "
                    f"{exc}"
                )
            )