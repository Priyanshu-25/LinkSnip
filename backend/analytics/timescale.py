import os

import psycopg


TIMESCALE_DATABASE_URL = os.getenv(
    "TIMESCALE_DATABASE_URL",
    "",
)


CREATE_SCHEMA_SQL = """
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS link_click_events_ts (
    event_id BIGINT GENERATED ALWAYS AS IDENTITY,
    link_id BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    ip_address INET NULL,
    country VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    referrer TEXT NULL,
    user_agent TEXT NOT NULL DEFAULT '',
    device VARCHAR(50) NOT NULL DEFAULT 'Unknown',
    browser VARCHAR(50) NOT NULL DEFAULT 'Unknown'
);

SELECT create_hypertable(
    'link_click_events_ts',
    'timestamp',
    if_not_exists => TRUE
);

CREATE INDEX IF NOT EXISTS
link_click_events_ts_link_time_idx
ON link_click_events_ts (
    link_id,
    timestamp DESC
);

CREATE INDEX IF NOT EXISTS
link_click_events_ts_country_idx
ON link_click_events_ts (
    country
);

CREATE INDEX IF NOT EXISTS
link_click_events_ts_device_idx
ON link_click_events_ts (
    device
);

CREATE INDEX IF NOT EXISTS
link_click_events_ts_browser_idx
ON link_click_events_ts (
    browser
);
"""


def get_timescale_connection():
    database_url = (
        TIMESCALE_DATABASE_URL
        or os.getenv(
            "TIMESCALE_DATABASE_URL",
            "",
        )
    )

    if not database_url:
        raise RuntimeError(
            "TIMESCALE_DATABASE_URL is not configured."
        )

    return psycopg.connect(
        database_url
    )


def ensure_timescale_schema():
    with get_timescale_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "CREATE EXTENSION IF NOT EXISTS timescaledb;"
            )

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS
                link_click_events_ts (
                    event_id BIGINT
                        GENERATED ALWAYS AS IDENTITY,

                    link_id BIGINT NOT NULL,

                    timestamp TIMESTAMPTZ
                        NOT NULL DEFAULT NOW(),

                    ip_address INET NULL,

                    country VARCHAR(100) NULL,

                    city VARCHAR(100) NULL,

                    referrer TEXT NULL,

                    user_agent TEXT
                        NOT NULL DEFAULT '',

                    device VARCHAR(50)
                        NOT NULL DEFAULT 'Unknown',

                    browser VARCHAR(50)
                        NOT NULL DEFAULT 'Unknown'
                );
                """
            )

            cursor.execute(
                """
                SELECT create_hypertable(
                    'link_click_events_ts',
                    'timestamp',
                    if_not_exists => TRUE
                );
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS
                link_click_events_ts_link_time_idx
                ON link_click_events_ts (
                    link_id,
                    timestamp DESC
                );
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS
                link_click_events_ts_country_idx
                ON link_click_events_ts (
                    country
                );
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS
                link_click_events_ts_device_idx
                ON link_click_events_ts (
                    device
                );
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS
                link_click_events_ts_browser_idx
                ON link_click_events_ts (
                    browser
                );
                """
            )

        connection.commit()


def write_click_event(event):
    with get_timescale_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO
                link_click_events_ts (
                    link_id,
                    timestamp,
                    ip_address,
                    country,
                    city,
                    referrer,
                    user_agent,
                    device,
                    browser
                )
                VALUES (
                    %s,
                    NOW(),
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                );
                """,
                (
                    event["link_id"],
                    event.get(
                        "ip_address"
                    ),
                    event.get(
                        "country",
                        "",
                    ),
                    event.get(
                        "city",
                        "",
                    ),
                    event.get(
                        "referrer"
                    ),
                    event.get(
                        "user_agent",
                        "",
                    ),
                    event.get(
                        "device",
                        "Unknown",
                    ),
                    event.get(
                        "browser",
                        "Unknown",
                    ),
                ),
            )

        connection.commit()


def get_click_event_count():
    with get_timescale_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM link_click_events_ts;
                """
            )

            result = cursor.fetchone()

            return int(
                result[0]
            )