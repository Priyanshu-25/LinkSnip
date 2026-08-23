import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { registerUser } from "../services/auth";


function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  // =====================================================
  // REGISTER
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");


    // ---------------------------------------------------
    // BASIC VALIDATION
    // ---------------------------------------------------

    if (
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError(
        "Please complete all fields."
      );
      return;
    }


    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }


    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      return;
    }


    // ---------------------------------------------------
    // REGISTER
    // ---------------------------------------------------

    try {
      setLoading(true);

      const normalizedEmail =
        email.trim().toLowerCase();


      await registerUser(
        normalizedEmail,
        password,
      );


      // -------------------------------------------------
      // OTP VERIFICATION
      // -------------------------------------------------

      setSuccess(
        "Account created. A verification code has been sent to your email."
      );


      setTimeout(() => {
        navigate(
          `/verify-email?email=${encodeURIComponent(
            normalizedEmail,
          )}`,
        );
      }, 700);


    } catch (requestError) {
      console.error(requestError);


      const backendError =
        requestError.response?.data;


      const message =
        backendError?.error ||
        backendError?.detail ||
        "Unable to create your account.";


      setError(message);


    } finally {
      setLoading(false);
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
            Start for free
          </span>

          <h1>
            Create your Linkora account
          </h1>

          <p>
            Shorten links, track performance,
            and discover smarter insights.
          </p>

        </div>


        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >

          {/* EMAIL */}

          <label htmlFor="register-email">
            Email address
          </label>

          <input
            id="register-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            autoComplete="email"
            disabled={loading}
          />


          {/* PASSWORD */}

          <label htmlFor="register-password">
            Password
          </label>

          <input
            id="register-password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            autoComplete="new-password"
            disabled={loading}
          />


          {/* CONFIRM PASSWORD */}

          <label htmlFor="confirm-password">
            Confirm password
          </label>

          <input
            id="confirm-password"
            type="password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(
                event.target.value
              )
            }
            autoComplete="new-password"
            disabled={loading}
          />


          {/* ERROR */}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}


          {/* SUCCESS */}

          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}


          {/* SUBMIT */}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Sending verification..."
              : "Create account"}
          </button>

        </form>


        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="auth-footer">

          <span>
            Already have an account?
          </span>

          <Link to="/login">
            Sign in
          </Link>

        </div>

      </div>

    </div>
  );
}


export default Register;