import { useState } from "react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import api from "../services/api";


function ResetPassword() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();


  const initialEmail =
    searchParams.get("email") || "";


  const [email, setEmail] =
    useState(initialEmail);

  const [otp, setOtp] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");


    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedOtp =
      otp.trim();


    if (!normalizedEmail) {
      setError(
        "Please enter your email address.",
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
        "Reset code must be exactly 6 digits.",
      );
      return;
    }


    if (password.length < 8) {
      setError(
        "New password must be at least 8 characters.",
      );
      return;
    }


    if (password !== confirmPassword) {
      setError(
        "Passwords do not match.",
      );
      return;
    }


    try {
      setLoading(true);


      await api.post(
        "/auth/reset-password/",
        {
          email:
            normalizedEmail,

          otp:
            normalizedOtp,

          new_password:
            password,
        },
      );


      setSuccess(
        "Password reset successfully. Redirecting to login...",
      );


      setPassword("");
      setConfirmPassword("");
      setOtp("");


      setTimeout(() => {
        navigate("/login");
      }, 1200);

    } catch (requestError) {
      console.error(
        "Reset password error:",
        requestError,
      );


      const data =
        requestError.response?.data;


      setError(
        data?.error ||
        data?.detail ||
        "Unable to reset your password.",
      );

    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="auth-page">

      <div className="auth-card">

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


        <div className="auth-heading">

          <span className="auth-badge">
            Secure password reset
          </span>

          <h1>
            Create a new password
          </h1>

          <p>
            Enter the 6-digit code sent
            to your email and choose a
            new password.
          </p>

        </div>


        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >

          <label htmlFor="reset-email">
            Email address
          </label>

          <input
            id="reset-email"
            type="email"
            value={email}
            placeholder="you@example.com"
            onChange={(event) =>
              setEmail(
                event.target.value,
              )
            }
            autoComplete="email"
            disabled={loading}
          />


          <label htmlFor="reset-otp">
            Reset code
          </label>

          <input
            id="reset-otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(event) =>
              setOtp(
                event.target.value
                  .replace(
                    /\D/g,
                    "",
                  )
                  .slice(0, 6),
              )
            }
            autoComplete="one-time-code"
            disabled={loading}
          />


          <label htmlFor="reset-password">
            New password
          </label>

          <input
            id="reset-password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
            autoComplete="new-password"
            disabled={loading}
          />


          <label htmlFor="confirm-reset-password">
            Confirm new password
          </label>

          <input
            id="confirm-reset-password"
            type="password"
            placeholder="Repeat your new password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(
                event.target.value,
              )
            }
            autoComplete="new-password"
            disabled={loading}
          />


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


          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Resetting password..."
              : "Reset password"}
          </button>

        </form>


        <div className="auth-footer">

          <span>
            Remember your password?
          </span>

          <Link to="/login">
            Sign in
          </Link>

        </div>

      </div>

    </div>
  );
}


export default ResetPassword;