import statistics
import time

from django.core.management.base import BaseCommand
from django.test import Client

from links.models import Link


class Command(BaseCommand):
    help = (
        "Benchmark LinkSnip redirect response time."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=50,
        )

    def handle(self, *args, **options):
        count = options["count"]

        if count < 1:
            self.stderr.write(
                self.style.ERROR(
                    "Count must be at least 1."
                )
            )
            return

        link = (
            Link.objects
            .filter(
                is_active=True,
                is_archived=False,
            )
            .first()
        )

        if link is None:
            self.stderr.write(
                self.style.ERROR(
                    "No active link found. "
                    "Create an active link first."
                )
            )
            return

        code = (
            link.custom_alias
            or link.short_code
        )

        client = Client(
            HTTP_HOST="localhost",
        )

        measurements = []

        self.stdout.write(
            f"Benchmarking /{code}/ "
            f"with {count} requests..."
        )

        for _ in range(count):
            started = time.perf_counter()

            response = client.get(
                f"/{code}/",
                follow=False,
                HTTP_HOST="localhost",
            )

            elapsed_ms = (
                time.perf_counter()
                - started
            ) * 1000

            measurements.append(
                elapsed_ms
            )

            if response.status_code not in (
                301,
                302,
            ):
                self.stderr.write(
                    self.style.ERROR(
                        "Unexpected HTTP status: "
                        f"{response.status_code}"
                    )
                )

                self.stderr.write(
                    "Benchmark stopped because "
                    "the redirect did not return "
                    "301 or 302."
                )
                return

        measurements.sort()

        average = statistics.mean(
            measurements
        )

        p50_index = max(
            0,
            len(measurements) // 2,
        )

        p95_index = max(
            0,
            int(
                len(measurements) * 0.95
            ) - 1,
        )

        p50 = measurements[
            p50_index
        ]

        p95 = measurements[
            p95_index
        ]

        minimum = measurements[0]
        maximum = measurements[-1]

        self.stdout.write("")
        self.stdout.write(
            f"Tests: {count}"
        )

        self.stdout.write(
            f"Min: {minimum:.2f} ms"
        )

        self.stdout.write(
            f"Average: {average:.2f} ms"
        )

        self.stdout.write(
            f"P50: {p50:.2f} ms"
        )

        self.stdout.write(
            f"P95: {p95:.2f} ms"
        )

        self.stdout.write(
            f"Max: {maximum:.2f} ms"
        )

        self.stdout.write("")

        if p95 < 100:
            self.stdout.write(
                self.style.SUCCESS(
                    "PASS: P95 is below 100 ms."
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    "WARNING: P95 is 100 ms or higher."
                )
            )