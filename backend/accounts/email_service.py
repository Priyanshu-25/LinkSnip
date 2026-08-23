import os

import requests


BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def send_transactional_email(
    *,
    to_email,
    subject,
    text_content,
    html_content=None,
):
    """
    Send a transactional email through Brevo's HTTPS API.

    Required environment variables:

    BREVO_API_KEY
    EMAIL_HOST_USER
    EMAIL_SENDER_NAME
    """

    api_key = os.getenv(
        "BREVO_API_KEY",
        "",
    ).strip()

    sender_email = os.getenv(
        "EMAIL_HOST_USER",
        "",
    ).strip()

    sender_name = os.getenv(
        "EMAIL_SENDER_NAME",
        "LinkSnip",
    ).strip()

    if not api_key:
        raise RuntimeError(
            "BREVO_API_KEY is not configured."
        )

    if not sender_email:
        raise RuntimeError(
            "EMAIL_HOST_USER is not configured."
        )

    if not to_email:
        raise RuntimeError(
            "Recipient email address is missing."
        )

    payload = {
        "sender": {
            "name": sender_name,
            "email": sender_email,
        },
        "to": [
            {
                "email": to_email,
            }
        ],
        "subject": subject,
        "textContent": text_content,
    }

    if html_content:
        payload["htmlContent"] = html_content

    try:
        response = requests.post(
            BREVO_API_URL,
            headers={
                "accept": "application/json",
                "api-key": api_key,
                "content-type": "application/json",
            },
            json=payload,
            timeout=15,
        )

    except requests.RequestException as exc:
        raise RuntimeError(
            f"Unable to connect to Brevo: {exc}"
        ) from exc

    if not response.ok:
        try:
            details = response.json()
        except ValueError:
            details = response.text

        raise RuntimeError(
            "Brevo email send failed: "
            f"HTTP {response.status_code}: {details}"
        )

    try:
        return response.json()
    except ValueError:
        return {}