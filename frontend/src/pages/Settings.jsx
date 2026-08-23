import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { logoutUser } from "../services/auth";


function Settings() {
  const navigate = useNavigate();

  const email =
    localStorage.getItem("user_email") ||
    "LinkSnip User";


  const isLoggedIn = Boolean(
    localStorage.getItem("access_token"),
  );


  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };


  const initials = useMemo(() => {
    return (
      email
        .split("@")[0]
        .charAt(0)
        .toUpperCase() || "L"
    );
  }, [email]);


  return (
    <div className="dashboard-page">

      {/* =====================================
          SIDEBAR
      ===================================== */}

      <aside className="sidebar">

        <div className="sidebar-brand">

          <span className="sidebar-logo">
            L
          </span>

          <span>
            LINKSNIP
          </span>

        </div>


        <div className="workspace-label">
          WORKSPACE
        </div>


        <nav className="sidebar-nav">

          <button
            className="sidebar-item"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <span>▦</span>
            Dashboard
          </button>


          <button
            className="sidebar-item"
            onClick={() =>
              navigate("/links")
            }
          >
            <span>🔗</span>
            My Links
          </button>


          <button
            className="sidebar-item"
            onClick={() =>
              navigate("/analytics")
            }
          >
            <span>📊</span>
            Analytics
          </button>


          <button
            className="sidebar-item"
            onClick={() =>
              navigate("/ai-copilot")
            }
          >
            <span>✦</span>
            AI Copilot
          </button>


          <button
            className="sidebar-item"
            onClick={() =>
              navigate("/security")
            }
          >
            <span>🛡</span>
            Security
          </button>


          <button
            className="sidebar-item active"
          >
            <span>⚙</span>
            Settings
          </button>


          <button
            className="sidebar-item"
            onClick={() => navigate("/help")}
          >
            <span>?</span>
            Help & Support
          </button>

        </nav>


        <div className="sidebar-bottom">

          <div className="profile-mini">

            <div className="profile-avatar">
              {initials}
            </div>


            <div className="profile-info">

              <strong>
                LinkSnip User
              </strong>

              <span>
                {email}
              </span>

            </div>

          </div>


          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Log out
          </button>

        </div>

      </aside>


      {/* =====================================
          MAIN
      ===================================== */}

      <main className="dashboard-main">

        <header className="dashboard-header">

          <div>

            <span className="dashboard-eyebrow">
              ACCOUNT SETTINGS
            </span>

            <h1>
              Settings
            </h1>

            <p>
              Manage your LinkSnip account
              and security preferences.
            </p>

          </div>

        </header>


        {/* =================================
            PROFILE CARD
        ================================= */}

        <section className="settings-profile-card">

          <div className="settings-profile-avatar">
            {initials}
          </div>


          <div className="settings-profile-info">

            <span>
              LINKORA ACCOUNT
            </span>

            <h2>
              LinkSnip User
            </h2>

            <p>
              {email}
            </p>

          </div>


          <div
            className={
              isLoggedIn
                ? "settings-status active"
                : "settings-status"
            }
          >
            <span>
              ●
            </span>

            {isLoggedIn
              ? "Signed in"
              : "Signed out"}
          </div>

        </section>


        {/* =================================
            ACCOUNT
        ================================= */}

        <section className="dashboard-card settings-card">

          <div className="settings-card-header">

            <div>

              <span className="dashboard-eyebrow">
                ACCOUNT
              </span>

              <h2>
                Account information
              </h2>

            </div>

          </div>


          <div className="settings-list">

            <SettingsRow
              icon="✉"
              title="Email address"
              description="The email address associated with your Linkora account."
              value={email}
            />


            <SettingsRow
              icon="●"
              title="Account status"
              description="Your current application session status."
              value={
                isLoggedIn
                  ? "Active"
                  : "Signed out"
              }
            />


            <SettingsRow
              icon="🔐"
              title="Authentication"
              description="Your account is protected using JWT authentication."
              value="Enabled"
            />

          </div>

        </section>


        {/* =================================
            SECURITY
        ================================= */}

        <section className="dashboard-card settings-card">

          <div className="settings-card-header">

            <div>

              <span className="dashboard-eyebrow">
                SECURITY
              </span>

              <h2>
                Security controls
              </h2>

            </div>


            <button
              className="view-all-button"
              onClick={() =>
                navigate("/security")
              }
            >
              Security Center →
            </button>

          </div>


          <div className="settings-list">

            <SettingsRow
              icon="🛡"
              title="Link security"
              description="Manage passwords, expiration and click limits for your links."
              value="Available"
            />


            <SettingsRow
              icon="📊"
              title="Analytics privacy"
              description="Linkora records click metadata to provide traffic analytics."
              value="Enabled"
            />

          </div>

        </section>


        {/* =================================
            QUICK ACTIONS
        ================================= */}

        <section className="settings-actions-grid">

          <SettingsAction
            icon="🔗"
            title="Manage Links"
            text="Create, edit, archive and protect your links."
            button="Open My Links"
            onClick={() =>
              navigate("/links")
            }
          />


          <SettingsAction
            icon="📊"
            title="Analytics"
            text="Review clicks, devices, browsers and AI insights."
            button="Open Analytics"
            onClick={() =>
              navigate("/analytics")
            }
          />


          <SettingsAction
            icon="🛡"
            title="Security"
            text="Review your protection configuration."
            button="Open Security"
            onClick={() =>
              navigate("/security")
            }
          />

        </section>


        {/* =================================
            LOGOUT
        ================================= */}

        <section className="settings-danger-card">

          <div>

            <span>
              SESSION
            </span>

            <h2>
              Sign out of LinkSnip
            </h2>

            <p>
              This removes your local authentication
              tokens from this browser.
            </p>

          </div>


          <button
            className="settings-logout-button"
            onClick={handleLogout}
          >
            Log out
          </button>

        </section>

      </main>

    </div>
  );
}


/* =========================================
   SETTINGS ROW
========================================= */

function SettingsRow({
  icon,
  title,
  description,
  value,
}) {
  return (
    <div className="settings-row">

      <div className="settings-row-icon">
        {icon}
      </div>


      <div className="settings-row-content">

        <strong>
          {title}
        </strong>

        <p>
          {description}
        </p>

      </div>


      <span className="settings-row-value">
        {value}
      </span>

    </div>
  );
}


/* =========================================
   SETTINGS ACTION
========================================= */

function SettingsAction({
  icon,
  title,
  text,
  button,
  onClick,
}) {
  return (
    <div className="settings-action-card">

      <div className="settings-action-icon">
        {icon}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>

      <button
        onClick={onClick}
      >
        {button} →
      </button>

    </div>
  );
}


export default Settings;