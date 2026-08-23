import { useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import api from "../services/api";


function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] =
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


    if (!normalizedEmail) {
      setError(
        "Please enter your email address.",
      );
      return;
    }


    try {
      setLoading(true);

      await api.post(
        "/auth/forgot-password/",
        {
          email:
            normalizedEmail,
        },
      );


      setSuccess(
        "If an account exists for this email, a password reset code has been sent.",
      );


      setTimeout(() => {
        navigate(
          `/reset-password?email=${encodeURIComponent(
            normalizedEmail,
          )}`,
        );
      }, 900);

    } catch (requestError) {
      console.error(
        "Forgot password error:",
        requestError,
      );

      const data =
        requestError.response?.data;

      setError(
        data?.error ||
        data?.detail ||
        "Unable to request a password reset.",
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
            Account recovery
          </span>

          <h1>
            Forgot your password?
          </h1>

          <p>
            Enter the email address associated
            with your LinkSnip account.
            We'll send a verification code.
          </p>

        </div>


        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >

          <label htmlFor="forgot-email">
            Email address
          </label>

          <input
            id="forgot-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => {
              setEmail(
                event.target.value,
              );

              if (error) {
                setError("");
              }
            }}
            autoComplete="email"
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
              ? "Sending code..."
              : "Send reset code"}
          </button>

        </form>


        <div className="auth-footer">

          <Link to="/login">
            Back to login
          </Link>

        </div>

      </div>

    </div>
  );
}


export default ForgotPassword;