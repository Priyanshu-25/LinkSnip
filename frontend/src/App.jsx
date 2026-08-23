import { useState } from "react";

import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import Help from "./pages/Help";
import Settings from "./pages/Settings";
import Security from "./pages/Security";
import MyLinks from "./pages/MyLinks";
import AICopilot from "./pages/AICopilot";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";

import { createShortLink } from "./services/api";


// =========================================================
// LANDING PAGE
// =========================================================

function LandingPage() {
  const navigate = useNavigate();

  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [shortLink, setShortLink] = useState("");
  const [loading, setLoading] = useState(false);


  // =======================================================
  // CREATE PUBLIC SHORT LINK
  // =======================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!url.trim()) {
      setMessage(
        "Please paste a URL first.",
      );
      setShortLink("");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setShortLink("");

      const data =
        await createShortLink(
          url.trim(),
        );

      setShortLink(
        data.short_url,
      );

      setMessage(
        "Your smart link is ready.",
      );

    } catch (error) {
      console.error(error);

      const errorMessage =
        error.response?.data
          ?.original_url?.[0] ||
        error.response?.data
          ?.detail ||
        error.response?.data
          ?.error ||
        "Unable to create the link. Please try again.";

      const normalizedMessage =
        String(errorMessage)
          .toLowerCase();

      if (
        normalizedMessage.includes("unsafe") ||
        normalizedMessage.includes("malicious")
      ) {
        navigate(
          "/link-error?type=unsafe",
        );
        return;
      }

      if (
        normalizedMessage.includes(
          "could not be verified",
        )
      ) {
        navigate(
          "/link-error?type=security-service",
        );
        return;
      }

      setMessage(
        errorMessage,
      );

    } finally {
      setLoading(false);
    }
  };


  // =======================================================
  // COPY SHORT LINK
  // =======================================================

  const copyLink = async () => {
    if (!shortLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        shortLink,
      );

      setMessage(
        "Link copied to clipboard.",
      );

    } catch {
      setMessage(
        "Unable to copy the link.",
      );
    }
  };


  return (
    <div className="app">

      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />
      <div className="dot-pattern" />


      {/* =================================================
          NAVBAR
      ================================================= */}

      <header className="navbar">

        <div className="brand">

          <div className="brand-logo">
            L
          </div>

          <span>
            LinkSnip
          </span>

        </div>


        <nav className="nav-links">

          <a href="#features">
            Features
          </a>

          <a href="#solutions">
            Solutions
          </a>

          <a href="#resources">
            Resources
          </a>

          <a href="#pricing">
            Pricing
          </a>

          <a href="#about">
            About
          </a>

        </nav>


        <div className="nav-actions">

          <Link
            to="/login"
            className="login-button"
          >
            Log in
          </Link>

          <Link
            to="/register"
            className="primary-nav-button"
          >
            Get started free
            <span>→</span>
          </Link>

        </div>

      </header>


      {/* =================================================
          HERO
      ================================================= */}

      <main className="hero">

        <section className="hero-left">

          <div className="ai-badge">

            <span>
              ✦
            </span>

            AI-Powered Link Intelligence

          </div>


          <h1>
            Short Links.
            <span>
              Big Insights.
            </span>
          </h1>


          <p className="hero-description">
            Create branded short links,
            track real-time analytics,
            and get AI-powered insights
            to grow smarter.
          </p>


          {/* =================================================
              PUBLIC SHORTENER
          ================================================= */}

          <form
            className="shortener-card"
            onSubmit={handleSubmit}
          >

            <div className="url-input">

              <span className="url-icon">
                ↗
              </span>

              <input
                type="url"
                value={url}
                onChange={(event) =>
                  setUrl(
                    event.target.value,
                  )
                }
                placeholder="Paste your long URL here..."
              />

            </div>


            <select
              className="link-type-select"
              defaultValue="smart"
            >

              <option value="smart">
                Smart Link
              </option>

              <option value="campaign">
                Campaign Link
              </option>

              <option value="qr">
                QR Link
              </option>

            </select>


            <button
              className="create-link-button"
              type="submit"
              disabled={loading}
            >

              {loading
                ? "Creating..."
                : "Create Smart Link"}

              <span>
                {loading
                  ? "…"
                  : "→"}
              </span>

            </button>

          </form>


          {message && (
            <div className="message-box">
              {message}
            </div>
          )}


          {shortLink && (
            <div className="result-card">

              <div>

                <span>
                  Your Linkora link
                </span>

                <a
                  href={shortLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortLink}
                </a>

              </div>

              <button
                type="button"
                onClick={copyLink}
              >
                Copy
              </button>

            </div>
          )}


          <div className="social-proof">

            <div className="avatar-stack">
              <span>PS</span>
              <span>AK</span>
              <span>RM</span>
              <span>JD</span>
            </div>

            <span>
              Join 15,000+ creators,
              marketers & businesses
            </span>

          </div>

        </section>


        {/* =================================================
            HERO VISUAL
        ================================================= */}

        <section className="hero-visual">

          <div className="analytics-card large-card">

            <div className="card-top">

              <div>
                <p>Total Clicks</p>
                <h2>24.8K</h2>
              </div>

              <span className="growth-badge">
                ↑ 34.6%
              </span>

            </div>


            <div className="line-chart">

              <svg
                viewBox="0 0 420 145"
                preserveAspectRatio="none"
                className="chart-svg"
              >

                <defs>

                  <linearGradient
                    id="chartGradient"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >

                    <stop
                      offset="0%"
                      stopColor="#2563eb"
                      stopOpacity="0.28"
                    />

                    <stop
                      offset="100%"
                      stopColor="#2563eb"
                      stopOpacity="0"
                    />

                  </linearGradient>

                </defs>


                <path
                  d="M0 120 C35 120 40 110 70 106 C100 103 100 82 125 88 C150 94 155 70 180 76 C205 82 215 98 240 76 C270 48 286 70 312 50 C335 34 350 53 372 39 C393 26 404 20 420 5 L420 145 L0 145 Z"
                  fill="url(#chartGradient)"
                />


                <path
                  d="M0 120 C35 120 40 110 70 106 C100 103 100 82 125 88 C150 94 155 70 180 76 C205 82 215 98 240 76 C270 48 286 70 312 50 C335 34 350 53 372 39 C393 26 404 20 420 5"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

              </svg>

            </div>

          </div>


          <div className="analytics-card device-card">

            <p className="small-title">
              Top Devices
            </p>

            <div className="device-layout">

              <div className="donut-chart">
                <div className="donut-center" />
              </div>

              <div className="device-list">

                <div className="device-row">
                  <span className="legend-dot blue" />
                  <span>Mobile</span>
                  <strong>65%</strong>
                </div>

                <div className="device-row">
                  <span className="legend-dot green" />
                  <span>Desktop</span>
                  <strong>25%</strong>
                </div>

                <div className="device-row">
                  <span className="legend-dot orange" />
                  <span>Tablet</span>
                  <strong>10%</strong>
                </div>

              </div>

            </div>

          </div>


          <div className="analytics-card countries-card">

            <p className="small-title">
              Top Countries
            </p>


            <div className="country-row">

              <div className="country-header">
                <span>United States</span>
                <strong>42%</strong>
              </div>

              <div className="country-track">
                <div
                  className="country-progress blue"
                  style={{
                    width: "88%",
                  }}
                />
              </div>

            </div>


            <div className="country-row">

              <div className="country-header">
                <span>India</span>
                <strong>18%</strong>
              </div>

              <div className="country-track">
                <div
                  className="country-progress green"
                  style={{
                    width: "52%",
                  }}
                />
              </div>

            </div>


            <div className="country-row">

              <div className="country-header">
                <span>United Kingdom</span>
                <strong>12%</strong>
              </div>

              <div className="country-track">
                <div
                  className="country-progress orange"
                  style={{
                    width: "38%",
                  }}
                />
              </div>

            </div>


            <div className="country-row">

              <div className="country-header">
                <span>Canada</span>
                <strong>8%</strong>
              </div>

              <div className="country-track">
                <div
                  className="country-progress purple"
                  style={{
                    width: "28%",
                  }}
                />
              </div>

            </div>


            <div className="country-row">

              <div className="country-header">
                <span>Australia</span>
                <strong>5%</strong>
              </div>

              <div className="country-track">
                <div
                  className="country-progress light-blue"
                  style={{
                    width: "20%",
                  }}
                />
              </div>

            </div>

          </div>


          <div className="analytics-card world-card">

            <div className="world-map">
              <div className="country-dot dot-us" />
              <div className="country-dot dot-india" />
              <div className="country-dot dot-australia" />
            </div>

          </div>

        </section>

      </main>


      {/* =================================================
          FEATURE STRIP
      ================================================= */}

      <section className="feature-strip">

        <FeatureItem
          icon="⚡"
          title="Instant Shortening"
          text="Short links in a flash"
          theme="blue"
        />

        <FeatureItem
          icon="▥"
          title="Smart Analytics"
          text="Real-time click insights"
          theme="green"
        />

        <FeatureItem
          icon="✦"
          title="AI Insights"
          text="Get smart recommendations"
          theme="orange"
        />

        <FeatureItem
          icon="✓"
          title="Link Security"
          text="Password, expiry & more"
          theme="blue"
        />

      </section>


      {/* =================================================
          FEATURES
      ================================================= */}

      <section
        className="features-section"
        id="features"
      >

        <div className="section-heading">

          <span>
            POWERFUL FEATURES
          </span>

          <h2>
            Powerful features for{" "}
            <strong>
              smarter growth
            </strong>
          </h2>

          <p>
            Everything you need to create,
            manage, analyze, protect and
            optimize your links from one platform.
          </p>

        </div>


        <div className="feature-grid">

          <FeatureCard
            icon="↗"
            title="Smart Short Links"
            text="Create short, branded, memorable links instantly."
            theme="blue"
          />

          <FeatureCard
            icon="▥"
            title="Advanced Analytics"
            text="Track clicks, devices, locations, referrers and more."
            theme="green"
          />

          <FeatureCard
            icon="✦"
            title="AI Recommendations"
            text="Turn raw analytics into useful recommendations and actions."
            theme="orange"
          />

          <FeatureCard
            icon="✓"
            title="Enterprise Security"
            text="Password protection, expiration, safety checks and controls."
            theme="blue"
          />

        </div>

      </section>

    </div>
  );
}


// =========================================================
// FEATURE ITEM
// =========================================================

function FeatureItem({
  icon,
  title,
  text,
  theme,
}) {
  return (
    <div className="feature-item">

      <div
        className={`feature-icon ${theme}`}
      >
        {icon}
      </div>

      <div>

        <h3>
          {title}
        </h3>

        <p>
          {text}
        </p>

      </div>

    </div>
  );
}


// =========================================================
// FEATURE CARD
// =========================================================

function FeatureCard({
  icon,
  title,
  text,
  theme,
}) {
  return (
    <article className="feature-card">

      <div
        className={`large-feature-icon ${theme}`}
      >
        {icon}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>

      <button className="learn-more">
        Learn more →
      </button>

    </article>
  );
}


// =========================================================
// APP ROUTER
// =========================================================

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =================================================
            LANDING
        ================================================= */}

        <Route
          path="/"
          element={<LandingPage />}
        />


        {/* =================================================
            AUTHENTICATION
        ================================================= */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/verify-email"
          element={<VerifyEmail />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />


        {/* =================================================
            APPLICATION
        ================================================= */}

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/links"
          element={<MyLinks />}
        />

        <Route
          path="/analytics"
          element={<Analytics />}
        />

        <Route
          path="/ai-copilot"
          element={<AICopilot />}
        />

        <Route
          path="/security"
          element={<Security />}
        />

        <Route
          path="/settings"
          element={<Settings />}
        />

        <Route
          path="/help"
          element={<Help />}
        />

      </Routes>

    </BrowserRouter>
  );
}


export default App;