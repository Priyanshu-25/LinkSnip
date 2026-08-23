import { useNavigate } from "react-router-dom";

import { logoutUser } from "../services/auth";


function Help() {
  const navigate = useNavigate();

  const email =
    localStorage.getItem("user_email") ||
    "LinkSnip User";


  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };


  return (
    <div className="dashboard-page">

      {/* =================================================
          SIDEBAR
      ================================================= */}

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
              navigate("/analytics")
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
            className="sidebar-item"
            onClick={() =>
              navigate("/settings")
            }
          >
            <span>⚙</span>
            Settings
          </button>


          <button
            className="sidebar-item active"
          >
            <span>?</span>
            Help & Support
          </button>

        </nav>


        <div className="sidebar-bottom">

          <div className="profile-mini">

            <div className="profile-avatar">
              {email
                .charAt(0)
                .toUpperCase()}
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


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="dashboard-main">

        <header className="dashboard-header">

          <div>

            <span className="dashboard-eyebrow">
              HELP CENTER
            </span>

            <h1>
              Help & Support
            </h1>

            <p>
              Learn how to use LinkSnip,
              troubleshoot common issues,
              and understand your workspace.
            </p>

          </div>

        </header>


        {/* =================================================
            QUICK START
        ================================================= */}

        <section className="dashboard-card">

          <div className="card-header">

            <div>

              <span className="dashboard-eyebrow">
                GET STARTED
              </span>

              <h2>
                Getting started with LinkSnip
              </h2>

            </div>

          </div>


          <div className="settings-list">

            <HelpRow
              icon="🔗"
              title="Create a short link"
              description="Paste a destination URL on the dashboard and create a short, shareable link."
            />

            <HelpRow
              icon="✏"
              title="Edit a link"
              description="Open My Links and use Edit to change the destination, alias, expiration, tags, folder, or redirect type."
            />

            <HelpRow
              icon="📊"
              title="View analytics"
              description="Open Analytics to review clicks, devices, browsers, countries, referrers, charts, and CSV exports."
            />

            <HelpRow
              icon="🔐"
              title="Protect a link"
              description="Use password protection, expiration dates, and click limits for additional link controls."
            />

          </div>

        </section>


        {/* =================================================
            FEATURES
        ================================================= */}

        <section className="settings-actions-grid">

          <HelpCard
            icon="📊"
            title="Analytics"
            text="Understand how your links are performing and where your visitors come from."
            button="Open Analytics"
            onClick={() =>
              navigate("/analytics")
            }
          />


          <HelpCard
            icon="✦"
            title="AI Copilot"
            text="Use your analytics to generate traffic explanations and improvement recommendations."
            button="Open AI"
            onClick={() =>
              navigate("/analytics")
            }
          />


          <HelpCard
            icon="🛡"
            title="Security"
            text="Review password protection, expiration, click limits, safe-link controls, and security health."
            button="Open Security"
            onClick={() =>
              navigate("/security")
            }
          />


          <HelpCard
            icon="⚙"
            title="Settings"
            text="Review your account, authentication status, and workspace controls."
            button="Open Settings"
            onClick={() =>
              navigate("/settings")
            }
          />

        </section>


        {/* =================================================
            TROUBLESHOOTING
        ================================================= */}

        <section className="dashboard-card">

          <div className="card-header">

            <div>

              <span className="dashboard-eyebrow">
                TROUBLESHOOTING
              </span>

              <h2>
                Common issues
              </h2>

            </div>

          </div>


          <div className="settings-list">

            <HelpRow
              icon="🔑"
              title="Login token error"
              description="If you see an invalid-token message, sign out, clear the old local authentication token, and sign in again."
            />

            <HelpRow
              icon="✉"
              title="Email verification"
              description="During local development, verification emails are printed in the Django terminal because the console email backend is enabled."
            />

            <HelpRow
              icon="📈"
              title="Country shows blank"
              description="Localhost traffic uses a loopback IP, so it cannot be geolocated like a public IP address."
            />

            <HelpRow
              icon="🤖"
              title="AI Copilot shows no result"
              description="Select a link with analytics data first, then run the AI analysis from the Analytics page."
            />

            <HelpRow
              icon="🗑"
              title="Delete versus Archive"
              description="Archive removes a link from active management, while Permanent Delete removes the database record."
            />

          </div>

        </section>


        {/* =================================================
            API DOCUMENTATION
        ================================================= */}

        <section className="dashboard-card">

          <div className="card-header">

            <div>

              <span className="dashboard-eyebrow">
                DEVELOPER
              </span>

              <h2>
                API documentation
              </h2>

              <p>
                Explore the LinkSnip REST API
                through Swagger.
              </p>

            </div>


            <button
              className="view-all-button"
              onClick={() =>
                window.open(
                  "http://127.0.0.1:8000/api/docs/",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              Open Swagger →
            </button>

          </div>

        </section>

      </main>

    </div>
  );
}


// =========================================================
// HELP ROW
// =========================================================

function HelpRow({
  icon,
  title,
  description,
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

    </div>
  );
}


// =========================================================
// HELP CARD
// =========================================================

function HelpCard({
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


export default Help;