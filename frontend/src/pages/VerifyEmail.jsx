import { useState } from "react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import api from "../services/api";


function VerifyEmail() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const initialEmail =
    searchParams.get("email") || "";


  // =====================================================
  // STATE
  // =====================================================

  const [email, setEmail] =
    useState(initialEmail);

  const [otp, setOtp] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);


  // =====================================================
  // VERIFY EMAIL
  // =====================================================

  const verifyEmail = async (
    event,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");


    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedOtp =
      otp.trim();


    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    if (!normalizedEmail) {
      setError(
        "Please enter your email address.",
      );
      return;
    }

    if (!normalizedOtp) {
      setError(
        "Please enter the verification code.",
      );
      return;
    }

    if (
      normalizedOtp.length !== 6 ||
      !/^\d{6}$/.test(
        normalizedOtp,
      )
    ) {
      setError(
        "Verification code must be exactly 6 digits.",
      );
      return;
    }


    // ---------------------------------------------------
    // API REQUEST
    // ---------------------------------------------------

    try {
      setLoading(true);

      await api.post(
        "/auth/verify-email/",
        {
          email:
            normalizedEmail,

          otp:
            normalizedOtp,
        },
      );


      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      setOtp("");

      setSuccess(
        "Email verified successfully. Redirecting to login...",
      );


      setTimeout(() => {
        navigate("/login");
      }, 1200);

    } catch (requestError) {
      console.error(
        "Email verification error:",
        requestError,
      );


      const backendError =
        requestError.response?.data;


      setError(
        backendError?.error ||
        backendError?.detail ||
        "Unable to verify your email. Please try again.",
      );

    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // RESEND OTP
  // =====================================================

  const resendOTP = async () => {
    setError("");
    setSuccess("");


    const normalizedEmail =
      email.trim().toLowerCase();


    if (!normalizedEmail) {
      setError(
        "Please enter your email address.",
      );
      return;
    }


    try {
      setResending(true);


      await api.post(
        "/auth/resend-verification/",
        {
          email:
            normalizedEmail,
        },
      );


      setOtp("");

      setSuccess(
        "A new verification code has been sent to your email.",
      );

    } catch (requestError) {
      console.error(
        "Resend OTP error:",
        requestError,
      );


      const backendError =
        requestError.response?.data;


      setError(
        backendError?.error ||
        backendError?.detail ||
        "Unable to send a new verification code.",
      );

    } finally {
      setResending(false);
    }
  };


  // =====================================================
  // OTP INPUT
  // =====================================================

  const handleOtpChange = (
    event,
  ) => {
    const value =
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 6);

    setOtp(value);

    if (error) {
      setError("");
    }
  };


  return (
    <div className="auth-page">

      <div className="auth-card">

        {/* =================================================
            BRAND
        ================================================= */}

        <Link
          to="/"
          className="auth-brand"
        >
          <span className="auth-logo">
            L
          </span>

          <span>
            LinkSnip
          </span>
        </Link>


        {/* =================================================
            HEADING
        ================================================= */}

        <div className="auth-heading">

          <span className="auth-badge">
            Verify your email
          </span>

          <h1>
            Check your inbox
          </h1>

          <p>
            Enter the 6-digit verification
            code sent to your email address.
          </p>

        </div>


        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={verifyEmail}
          className="auth-form"
        >

          {/* EMAIL */}

          <label htmlFor="verify-email">
            Email address
          </label>

          <input
            id="verify-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(
                event.target.value,
              );

              if (error) {
                setError("");
              }
            }}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={
              loading ||
              resending
            }
          />


          {/* OTP */}

          <label htmlFor="verify-otp">
            Verification code
          </label>

          <input
            id="verify-otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={
              handleOtpChange
            }
            placeholder="123456"
            autoComplete="one-time-code"
            disabled={
              loading ||
              resending
            }
          />


          {/* STATUS */}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}


          {/* VERIFY BUTTON */}

          <button
            type="submit"
            className="auth-submit"
            disabled={
              loading ||
              resending
            }
          >
            {loading
              ? "Verifying..."
              : "Verify email"}
          </button>


          {/* RESEND BUTTON */}

          <button
            type="button"
            className="auth-secondary-button"
            onClick={resendOTP}
            disabled={
              loading ||
              resending
            }
          >
            {resending
              ? "Sending..."
              : "Resend code"}
          </button>

        </form>


        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="auth-footer">

          <span>
            Already verified?
          </span>

          <Link to="/login">
            Sign in
          </Link>

        </div>

      </div>

    </div>
  );
}


export default VerifyEmail;