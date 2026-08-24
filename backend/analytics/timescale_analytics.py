import os

import psycopg
from django.db import connection


def get_connection():
    url = os.getenv(
        "TIMESCALE_DATABASE_URL",
        "",
    )

    if not url:
        raise RuntimeError(
            "TIMESCALE_DATABASE_URL is not configured."
        )

    return psycopg.connect(url)


def get_events(
    link_id,
    start_time,
):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    event_id,
                    link_id,
                    timestamp,
                    ip_address,
                    country,
                    city,
                    referrer,
                    user_agent,
                    device,
                    browser
                FROM link_click_events_ts
                WHERE
                    link_id = %s
                    AND timestamp >= %s
                ORDER BY timestamp DESC
                """,
                (
                    link_id,
                    start_time,
                ),
            )

            rows = cursor.fetchall()

    return [
        {
            "id": row[0],
            "link_id": row[1],
            "timestamp": row[2],
            "ip_address": (
                str(row[3])
                if row[3]
                else None
            ),
            "country": row[4],
            "city": row[5],
            "referrer": row[6],
            "user_agent": row[7],
            "device": row[8],
            "browser": row[9],
        }
        for row in rows
    ]

def get_postgres_summary(
    link_id,
    start_time,
):
    """
    PostgreSQL fallback analytics.

    Used when USE_TIMESCALE=false, such as the
    Render deployment.
    """

    with connection.cursor() as cursor:

        # =====================================================
        # TOTAL CLICKS
        # =====================================================

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM analytics_clickevent
            WHERE link_id = %s
              AND timestamp >= %s
            """,
            [
                link_id,
                start_time,
            ],
        )

        total_clicks = (
            cursor.fetchone()[0] or 0
        )

        # =====================================================
        # DEVICES
        # =====================================================

        cursor.execute(
            """
            SELECT
                COALESCE(device, 'Unknown'),
                COUNT(*) AS total
            FROM analytics_clickevent
            WHERE link_id = %s
              AND timestamp >= %s
            GROUP BY device
            ORDER BY total DESC
            """,
            [
                link_id,
                start_time,
            ],
        )

        devices = [
            {
                "device": row[0],
                "total": row[1],
            }
            for row in cursor.fetchall()
        ]

        # =====================================================
        # BROWSERS
        # =====================================================

        cursor.execute(
            """
            SELECT
                COALESCE(browser, 'Unknown'),
                COUNT(*) AS total
            FROM analytics_clickevent
            WHERE link_id = %s
              AND timestamp >= %s
            GROUP BY browser
            ORDER BY total DESC
            """,
            [
                link_id,
                start_time,
            ],
        )

        browsers = [
            {
                "browser": row[0],
                "total": row[1],
            }
            for row in cursor.fetchall()
        ]

        # =====================================================
        # COUNTRIES
        # =====================================================

        cursor.execute(
            """
            SELECT
                country,
                COUNT(*) AS total
            FROM analytics_clickevent
            WHERE link_id = %s
              AND timestamp >= %s
              AND country IS NOT NULL
              AND country <> ''
            GROUP BY country
            ORDER BY total DESC
            """,
            [
                link_id,
                start_time,
            ],
        )

        countries = [
            {
                "country": row[0],
                "total": row[1],
            }
            for row in cursor.fetchall()
        ]

        # =====================================================
        # REFERRERS
        # =====================================================

        cursor.execute(
            """
            SELECT
                referrer,
                COUNT(*) AS total
            FROM analytics_clickevent
            WHERE link_id = %s
              AND timestamp >= %s
              AND referrer IS NOT NULL
              AND referrer <> ''
            GROUP BY referrer
            ORDER BY total DESC
            """,
            [
                link_id,
                start_time,
            ],
        )

        referrers = [
            {
                "referrer": row[0],
                "total": row[1],
            }
            for row in cursor.fetchall()
        ]

        # =====================================================
        # DAILY CLICKS
        # =====================================================

        cursor.execute(
            """
            SELECT
                DATE(timestamp) AS day,
                COUNT(*) AS total
            FROM analytics_clickevent
            WHERE link_id = %s
              AND timestamp >= %s
            GROUP BY DATE(timestamp)
            ORDER BY day ASC
            """,
            [
                link_id,
                start_time,
            ],
        )

        daily_clicks = [
            {
                "day": row[0].isoformat(),
                "total": row[1],
            }
            for row in cursor.fetchall()
        ]

    return {
        "total_clicks": total_clicks,
        "devices": devices,
        "browsers": browsers,
        "countries": countries,
        "referrers": referrers,
        "daily_clicks": daily_clicks,
    }
     


def get_summary(
    link_id,
    start_time,
):

    use_timescale = (
        os.getenv(
            "USE_TIMESCALE",
            "true",
        )
        .strip()
        .lower()
        == "true"
    )

    if not use_timescale:
        return get_postgres_summary(
            link_id,
            start_time,
        )

    with get_connection() as connection:
        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT COUNT(*)
                FROM link_click_events_ts
                WHERE
                    link_id = %s
                    AND timestamp >= %s
                """,
                (
                    link_id,
                    start_time,
                ),
            )

            total_clicks = cursor.fetchone()[0]

            cursor.execute(
                """
                SELECT
                    device,
                    COUNT(*) AS total
                FROM link_click_events_ts
                WHERE
                    link_id = %s
                    AND timestamp >= %s
                    AND device <> ''
                GROUP BY device
                ORDER BY total DESC
                """,
                (
                    link_id,
                    start_time,
                ),
            )

            devices = [
                {
                    "device": row[0],
                    "total": row[1],
                }
                for row in cursor.fetchall()
            ]

            cursor.execute(
                """
                SELECT
                    browser,
                    COUNT(*) AS total
                FROM link_click_events_ts
                WHERE
                    link_id = %s
                    AND timestamp >= %s
                    AND browser <> ''
                GROUP BY browser
                ORDER BY total DESC
                """,
                (
                    link_id,
                    start_time,
                ),
            )

            browsers = [
                {
                    "browser": row[0],
                    "total": row[1],
                }
                for row in cursor.fetchall()
            ]

            cursor.execute(
                """
                SELECT
                    country,
                    COUNT(*) AS total
                FROM link_click_events_ts
                WHERE
                    link_id = %s
                    AND timestamp >= %s
                    AND country IS NOT NULL
                    AND country <> ''
                GROUP BY country
                ORDER BY total DESC
                """,
                (
                    link_id,
                    start_time,
                ),
            )

            countries = [
                {
                    "country": row[0],
                    "total": row[1],
                }
                for row in cursor.fetchall()
            ]

            cursor.execute(
                """
                SELECT
                    referrer,
                    COUNT(*) AS total
                FROM link_click_events_ts
                WHERE
                    link_id = %s
                    AND timestamp >= %s
                    AND referrer IS NOT NULL
                    AND referrer <> ''
                GROUP BY referrer
                ORDER BY total DESC
                LIMIT 10
                """,
                (
                    link_id,
                    start_time,
                ),
            )

            referrers = [
                {
                    "referrer": row[0],
                    "total": row[1],
                }
                for row in cursor.fetchall()
            ]

            cursor.execute(
                """
                SELECT
                    DATE(timestamp) AS day,
                    COUNT(*) AS total
                FROM link_click_events_ts
                WHERE
                    link_id = %s
                    AND timestamp >= %s
                GROUP BY DATE(timestamp)
                ORDER BY day
                """,
                (
                    link_id,
                    start_time,
                ),
            )

            daily_clicks = [
                {
                    "day": row[0],
                    "total": row[1],
                }
                for row in cursor.fetchall()
            ]

    return {
        "total_clicks": total_clicks,
        "devices": devices,
        "browsers": browsers,
        "countries": countries,
        "referrers": referrers,
        "daily_clicks": daily_clicks,
    }