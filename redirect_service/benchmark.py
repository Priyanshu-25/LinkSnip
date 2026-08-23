import http.client
import statistics
import sys
import time
from urllib.parse import urlparse


def benchmark(
    url,
    count,
):
    parsed = urlparse(url)

    if parsed.scheme == "https":
        connection = http.client.HTTPSConnection(
            parsed.netloc,
            timeout=10,
        )
    else:
        connection = http.client.HTTPConnection(
            parsed.netloc,
            timeout=10,
        )

    path = (
        parsed.path
        or "/"
    )

    if parsed.query:
        path += f"?{parsed.query}"

    timings = []

    for _ in range(count):
        started = time.perf_counter()

        connection.request(
            "GET",
            path,
            headers={
                "User-Agent":
                    "LinkSnip-Benchmark/1.0",
            },
        )

        response = (
            connection.getresponse()
        )

        response.read()

        elapsed = (
            time.perf_counter()
            - started
        ) * 1000

        timings.append(
            elapsed
        )

        if response.status not in (
            301,
            302,
        ):
            raise RuntimeError(
                f"Expected 301/302, got "
                f"{response.status}"
            )

    connection.close()

    timings.sort()

    p95 = timings[
        max(
            0,
            int(
                len(timings) * 0.95
            ) - 1,
        )
    ]

    average = statistics.mean(
        timings
    )

    print(
        f"Tests: {count}"
    )

    print(
        f"Min: {timings[0]:.2f} ms"
    )

    print(
        f"Average: {average:.2f} ms"
    )

    print(
        f"P95: {p95:.2f} ms"
    )

    print(
        f"Max: {timings[-1]:.2f} ms"
    )

    if p95 < 100:
        print(
            "PASS: P95 is below 100 ms."
        )
    else:
        print(
            "WARNING: P95 is 100 ms or higher."
        )


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(
            "Usage:"
        )

        print(
            "python benchmark.py "
            "http://127.0.0.1:8001/Wl9Zzw5/ "
            "--count 50"
        )

        raise SystemExit(1)

    url = sys.argv[1]

    count = 50

    if (
        "--count"
        in sys.argv
    ):
        index = sys.argv.index(
            "--count"
        )

        count = int(
            sys.argv[index + 1]
        )

    benchmark(
        url,
        count,
    )