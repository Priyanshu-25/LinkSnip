import { useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { loginUser } from "../services/auth";


function Login() {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    setError("");


    if (
      !email.trim() ||
      !password
    ) {
      setError(
        "Please enter your email and password.",
      );
      return;
    }


    try {
      setLoading(true);


      await loginUser(
        email.trim().toLowerCase(),
        password,
      );


      navigate("/dashboard");

    } catch (requestError) {
      console.error(
        requestError,
      );


      const data =
        requestError.response?.data;


      const message =
        data?.error ||
        data?.detail ||
        "Login failed. Please check your credentials.";


      setError(message);

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

          <span className="auth-brand-name">
            LinkSnip
          </span>
        </Link>


        <div className="auth-heading">

          <span className="auth-badge">
            Welcome back
          </span>

          <h1>
            Sign in to LinkSnip
          </h1>

          <p>
            Manage your links, understand
            your traffic, and unlock
            AI-powered insights.
          </p>

        </div>


        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >

          <label htmlFor="email">
            Email address
          </label>

          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value,
              )
            }
            autoComplete="email"
            disabled={loading}
          />


          <label htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
            autoComplete="current-password"
            disabled={loading}
          />


          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "-4px",
            }}
          >
            <Link to="/forgot-password">
              Forgot password?
            </Link>
          </div>


          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}


          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>

        </form>


        <div className="auth-footer">

          <span>
            Don't have an account?
          </span>

          <Link to="/register">
            Create one
          </Link>

        </div>

      </div>

    </div>
  );
}


export default Login;