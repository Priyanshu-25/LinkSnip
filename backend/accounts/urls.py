from django.urls import path

from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

from .views import (
    RegisterView,
    VerifyEmailView,
    ResendVerificationOTPView,
    LoginView,
    ForgotPasswordView,
    ResetPasswordView,
)


urlpatterns = [
    # =====================================================
    # REGISTER
    # =====================================================

    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),

    # =====================================================
    # EMAIL VERIFICATION
    # =====================================================

    path(
        "verify-email/",
        VerifyEmailView.as_view(),
        name="verify-email",
    ),

    path(
        "resend-verification/",
        ResendVerificationOTPView.as_view(),
        name="resend-verification",
    ),

    # =====================================================
    # LOGIN
    # =====================================================

    path(
        "login/",
        LoginView.as_view(),
        name="login",
    ),

    # =====================================================
    # JWT REFRESH
    # =====================================================

    path(
        "token/refresh/",
        TokenRefreshView.as_view(),
        name="token-refresh",
    ),

    # =====================================================
    # PASSWORD RESET
    # =====================================================

    path(
        "forgot-password/",
        ForgotPasswordView.as_view(),
        name="forgot-password",
    ),

    path(
        "reset-password/",
        ResetPasswordView.as_view(),
        name="reset-password",
    ),
]