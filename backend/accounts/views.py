import secrets

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.cache import cache

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserProfile
from .email_service import send_transactional_email


OTP_EXPIRY_SECONDS = 10 * 60
OTP_RESEND_SECONDS = 60


def normalize_email(value):
    return (
        str(value or "")
        .strip()
        .lower()
    )


def generate_otp():
    return f"{secrets.randbelow(1_000_000):06d}"


def otp_cache_key(
    email,
    purpose,
):
    return (
        f"linksnip:otp:"
        f"{purpose}:"
        f"{email}"
    )


def otp_cooldown_key(
    email,
    purpose,
):
    return (
        f"linksnip:otp-cooldown:"
        f"{purpose}:"
        f"{email}"
    )


def send_otp_email(
    email,
    otp,
    purpose,
):
    """Send verification/reset OTP through Brevo."""

    if purpose == "verify":
        subject = "LinkSnip Email Verification Code"

        message = (
            f"Your LinkSnip email verification code "
            f"is {otp}.\n\n"
            "This code expires in 10 minutes.\n"
            "If you did not create this account, "
            "you can ignore this email."
        )

    else:
        subject = "LinkSnip Password Reset Code"

        message = (
            f"Your LinkSnip password reset code "
            f"is {otp}.\n\n"
            "This code expires in 10 minutes.\n"
            "If you did not request a password reset, "
            "you can ignore this email."
        )

    html_message = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>LinkSnip</title>
</head>
<body style="
    margin:0;
    padding:30px;
    background:#f4f7fb;
    font-family:Arial,sans-serif;
">
    <div style="
        max-width:500px;
        margin:0 auto;
        background:#ffffff;
        border-radius:16px;
        padding:32px;
    ">
        <h2 style="margin-top:0;color:#111827;">LinkSnip</h2>
        <p style="color:#374151;">Your verification code is:</p>
        <div style="
            margin:24px 0;
            padding:20px;
            text-align:center;
            background:#f3f4f6;
            border-radius:12px;
            font-size:32px;
            font-weight:bold;
            letter-spacing:8px;
            color:#111827;
        ">
            {otp}
        </div>
        <p style="color:#64748b;">This code expires in 10 minutes.</p>
        <p style="color:#64748b;">
            If you did not request this email,
            you can safely ignore it.
        </p>
    </div>
</body>
</html>"""

    return send_transactional_email(
        to_email=email,
        subject=subject,
        text_content=message,
        html_content=html_message,
    )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = normalize_email(
            request.data.get("email")
        )
        password = request.data.get(
            "password",
            "",
        )

        if not email or not password:
            return Response(
                {
                    "error":
                        "Email and password are required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 8:
            return Response(
                {
                    "error":
                        "Password must be at least 8 characters."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_user = (
            User.objects
            .filter(username=email)
            .first()
        )

        if existing_user and existing_user.is_active:
            return Response(
                {
                    "error":
                        "An account with this email already exists."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        created_new_user = False

        if existing_user:
            user = existing_user
            user.set_password(password)
            user.email = email
            user.is_active = False
            user.save(
                update_fields=[
                    "password",
                    "email",
                    "is_active",
                ]
            )

            UserProfile.objects.get_or_create(
                user=user
            )
        else:
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                is_active=False,
            )

            UserProfile.objects.create(
                user=user
            )
            created_new_user = True

        otp = generate_otp()

        try:
            send_otp_email(
                email,
                otp,
                "verify",
            )

            cache.set(
                otp_cache_key(
                    email,
                    "verify",
                ),
                otp,
                timeout=OTP_EXPIRY_SECONDS,
            )

            cache.set(
                otp_cooldown_key(
                    email,
                    "verify",
                ),
                True,
                timeout=OTP_RESEND_SECONDS,
            )

        except Exception as exc:
            cache.delete(
                otp_cache_key(
                    email,
                    "verify",
                )
            )

            cache.delete(
                otp_cooldown_key(
                    email,
                    "verify",
                )
            )

            if created_new_user:
                user.delete()

            return Response(
                {
                    "error":
                        "We could not send the verification email. "
                        "Please check the email service configuration "
                        "and try again.",
                    "detail": str(exc),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "message":
                    "Verification code sent to your email.",
                "email": email,
                "requires_verification": True,
            },
            status=(
                status.HTTP_201_CREATED
                if created_new_user
                else status.HTTP_200_OK
            ),
        )


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = normalize_email(
            request.data.get("email")
        )

        otp = str(
            request.data.get(
                "otp",
                "",
            )
        ).strip()

        if not email or not otp:
            return Response(
                {
                    "error":
                        "Email and verification code are required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not otp.isdigit() or len(otp) != 6:
            return Response(
                {
                    "error":
                        "Verification code must be 6 digits."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        stored_otp = cache.get(
            otp_cache_key(
                email,
                "verify",
            )
        )

        if not stored_otp:
            return Response(
                {
                    "error":
                        "Verification code expired. Request a new code."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if str(stored_otp) != otp:
            return Response(
                {
                    "error":
                        "Invalid verification code."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = (
            User.objects
            .filter(username=email)
            .first()
        )

        if not user:
            return Response(
                {
                    "error":
                        "Account not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        user.is_active = True
        user.save(
            update_fields=[
                "is_active",
            ]
        )

        profile, _ = UserProfile.objects.get_or_create(
            user=user
        )

        profile.is_email_verified = True
        profile.save(
            update_fields=[
                "is_email_verified",
            ]
        )

        cache.delete(
            otp_cache_key(
                email,
                "verify",
            )
        )

        cache.delete(
            otp_cooldown_key(
                email,
                "verify",
            )
        )

        return Response(
            {
                "message":
                    "Email verified successfully. You can now sign in.",
                "email":
                    email,
            },
            status=status.HTTP_200_OK,
        )


class ResendVerificationOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = normalize_email(
            request.data.get("email")
        )

        if not email:
            return Response(
                {
                    "error": "Email is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = (
            User.objects
            .filter(username=email)
            .first()
        )

        if not user:
            return Response(
                {
                    "error": "Account not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.is_active:
            return Response(
                {
                    "error": "This email is already verified."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if cache.get(
            otp_cooldown_key(
                email,
                "verify",
            )
        ):
            return Response(
                {
                    "error":
                        "Please wait before requesting another code."
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        otp = generate_otp()

        try:
            send_otp_email(
                email,
                otp,
                "verify",
            )

            cache.set(
                otp_cache_key(
                    email,
                    "verify",
                ),
                otp,
                timeout=OTP_EXPIRY_SECONDS,
            )

            cache.set(
                otp_cooldown_key(
                    email,
                    "verify",
                ),
                True,
                timeout=OTP_RESEND_SECONDS,
            )

        except Exception as exc:
            cache.delete(
                otp_cache_key(
                    email,
                    "verify",
                )
            )
            cache.delete(
                otp_cooldown_key(
                    email,
                    "verify",
                )
            )

            return Response(
                {
                    "error":
                        "We could not send the verification email.",
                    "detail": str(exc),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "message":
                    "A new verification code has been sent."
            },
            status=status.HTTP_200_OK,
        )



class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = normalize_email(
            request.data.get("email")
        )

        password = request.data.get(
            "password",
            "",
        )

        if not email or not password:
            return Response(
                {
                    "error":
                        "Email and password are required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = (
            User.objects
            .filter(username=email)
            .first()
        )

        if (
            user
            and not user.is_active
        ):
            return Response(
                {
                    "error":
                        "Please verify your email before signing in.",
                    "requires_verification":
                        True,
                    "email":
                        email,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        user = authenticate(
            request,
            username=email,
            password=password,
        )

        if user is None:
            return Response(
                {
                    "error":
                        "Invalid email or password."
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(
            user
        )

        return Response(
            {
                "message":
                    "Login successful.",
                "access":
                    str(refresh.access_token),
                "refresh":
                    str(refresh),
                "email":
                    user.email,
            },
            status=status.HTTP_200_OK,
        )


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = normalize_email(
            request.data.get("email")
        )

        if not email:
            return Response(
                {
                    "error": "Email is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = (
            User.objects
            .filter(
                username=email,
                is_active=True,
            )
            .first()
        )

        if not user:
            return Response(
                {
                    "message":
                        "If an account exists for this email, "
                        "a reset code has been sent."
                },
                status=status.HTTP_200_OK,
            )

        if cache.get(
            otp_cooldown_key(
                email,
                "reset",
            )
        ):
            return Response(
                {
                    "error":
                        "Please wait before requesting another reset code."
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        otp = generate_otp()

        try:
            send_otp_email(
                email,
                otp,
                "reset",
            )

            cache.set(
                otp_cache_key(
                    email,
                    "reset",
                ),
                otp,
                timeout=OTP_EXPIRY_SECONDS,
            )

            cache.set(
                otp_cooldown_key(
                    email,
                    "reset",
                ),
                True,
                timeout=OTP_RESEND_SECONDS,
            )

        except Exception as exc:
            cache.delete(
                otp_cache_key(
                    email,
                    "reset",
                )
            )
            cache.delete(
                otp_cooldown_key(
                    email,
                    "reset",
                )
            )

            return Response(
                {
                    "error":
                        "We could not send the password reset email.",
                    "detail": str(exc),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "message":
                    "If an account exists for this email, "
                    "a reset code has been sent."
            },
            status=status.HTTP_200_OK,
        )



class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = normalize_email(
            request.data.get("email")
        )

        otp = str(
            request.data.get(
                "otp",
                "",
            )
        ).strip()

        new_password = request.data.get(
            "new_password",
            "",
        )

        if not email or not otp or not new_password:
            return Response(
                {
                    "error":
                        "Email, OTP and new password are required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            not otp.isdigit()
            or len(otp) != 6
        ):
            return Response(
                {
                    "error":
                        "Reset code must be 6 digits."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {
                    "error":
                        "New password must be at least 8 characters."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        stored_otp = cache.get(
            otp_cache_key(
                email,
                "reset",
            )
        )

        if not stored_otp:
            return Response(
                {
                    "error":
                        "Reset code expired. Request a new code."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if str(stored_otp) != otp:
            return Response(
                {
                    "error":
                        "Invalid reset code."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = (
            User.objects
            .filter(
                username=email,
                is_active=True,
            )
            .first()
        )

        if not user:
            return Response(
                {
                    "error":
                        "Account not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        user.set_password(
            new_password
        )

        user.save(
            update_fields=[
                "password",
            ]
        )

        cache.delete(
            otp_cache_key(
                email,
                "reset",
            )
        )

        cache.delete(
            otp_cooldown_key(
                email,
                "reset",
            )
        )

        return Response(
            {
                "message":
                    "Password reset successfully. You can now sign in."
            },
            status=status.HTTP_200_OK,
        )