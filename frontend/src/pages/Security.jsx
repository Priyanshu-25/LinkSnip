import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";
import { logoutUser } from "../services/auth";


function Security() {
  const navigate = useNavigate();

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  const email =
    localStorage.getItem("user_email") ||
    "LinkSnip User";


  const loadLinks = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get("/links/");

      setLinks(response.data);
    } catch (requestError) {
      console.error(requestError);

      if (
        requestError.response?.status === 401
      ) {
        logoutUser();
        navigate("/login");
        return;
      }

      setError(
        "Unable to load your security data.",
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadLinks();
  }, []);


  const securityStats = useMemo(() => {
    const total = links.length;

    const protectedLinks =
      links.filter(
        (link) =>
          link.is_password_protected === true,
      ).length;

    const expiringLinks =
      links.filter(
        (link) => Boolean(link.expires_at),
      ).length;

    const limitedLinks =
      links.filter(
        (link) =>
          link.click_limit !== null &&
          link.click_limit !== undefined,
      ).length;

    const inactiveLinks =
      links.filter(
        (link) =>
          link.is_active === false ||
          link.is_archived === true,
      ).length;

    return {
      total,
      protectedLinks,
      expiringLinks,
      limitedLinks,
      inactiveLinks,
    };
  }, [links]);


  const securityScore = useMemo(() => {
    if (links.length === 0) {
      return 0;
    }

    let score = 0;

    const protectedRatio =
      securityStats.protectedLinks /
      securityStats.total;

    const limitedRatio =
      securityStats.limitedLinks /
      securityStats.total;

    const expirationRatio =
      securityStats.expiringLinks /
      securityStats.total;


    score +=
      Math.round(
        protectedRatio * 40,
      );

    score +=
      Math.round(
        limitedRatio * 30,
      );

    score +=
      Math.round(
        expirationRatio * 30,
      );


    return Math.min(
      score,
      100,
    );
  }, [
    links,
    securityStats,
  ]);


  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };


  return (
    <div className="dashboard-page">

      {/* =====================================
          SIDEBAR
      ===================================== */}

      <aside className="sidebar">

        <div className="sidebar-brand">

          <span className="sidebar-logo">
            LinkSnip
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
            onClick={() => navigate("/help")}
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
            className="sidebar-item active"
          >
            <span>🛡</span>
            Security
          </button>


          <button
            className="sidebar-item"
          >
            <span>⚙</span>
            Settings
          </button>


          <button
            className="sidebar-item"
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


      {/* =====================================
          MAIN
      ===================================== */}

      <main className="dashboard-main">

        <header className="dashboard-header">

          <div>

            <span className="dashboard-eyebrow">
              LINK PROTECTION
            </span>

            <h1>
              Security
            </h1>

            <p>
              Review the security controls
              protecting your short links.
            </p>

          </div>


          <button
            className="view-all-button"
            onClick={loadLinks}
          >
            ↻ Refresh
          </button>

        </header>


        {success && (
          <div className="dashboard-success">
            {success}
          </div>
        )}


        {error && (
          <div className="dashboard-error">
            {error}
          </div>
        )}


        {loading ? (

          <div className="dashboard-card empty-state">

            <div className="loading-dot">
              Loading security data...
            </div>

          </div>

        ) : (

          <>

            {/* =================================
                SECURITY SCORE
            ================================= */}

            <section className="security-hero">

              <div className="security-shield">
                🛡
              </div>


              <div className="security-hero-content">

                <span>
                  LINKORA SECURITY SCORE
                </span>

                <h2>
                  {securityScore}%
                </h2>

                <p>
                  {securityScore >= 75
                    ? "Your links have a strong security configuration."
                    : securityScore >= 40
                      ? "Your links have some protection, but there are additional controls you can enable."
                      : "Your links need more protection. Consider enabling passwords, limits, and expiration."}
                </p>

              </div>


              <div className="security-score-ring">

                <div
                  className="security-score-ring-inner"
                  style={{
                    background:
                      `conic-gradient(#2563eb ${securityScore}%, #e8eef7 ${securityScore}% 100%)`,
                  }}
                >
                  <span>
                    {securityScore}
                  </span>
                </div>

              </div>

            </section>


            {/* =================================
                SECURITY STATS
            ================================= */}

            <section className="security-stats-grid">

              <SecurityStat
                icon="🔐"
                title="Protected Links"
                value={
                  securityStats.protectedLinks
                }
                total={
                  securityStats.total
                }
                text="Password protected"
                theme="blue"
              />


              <SecurityStat
                icon="⏱"
                title="Expiring Links"
                value={
                  securityStats.expiringLinks
                }
                total={
                  securityStats.total
                }
                text="Expiration enabled"
                theme="orange"
              />


              <SecurityStat
                icon="🎯"
                title="Click Limited"
                value={
                  securityStats.limitedLinks
                }
                total={
                  securityStats.total
                }
                text="Maximum visits configured"
                theme="green"
              />


              <SecurityStat
                icon="⛔"
                title="Inactive"
                value={
                  securityStats.inactiveLinks
                }
                total={
                  securityStats.total
                }
                text="Disabled or archived"
                theme="purple"
              />

            </section>


            {/* =================================
                SECURITY CHECKLIST
            ================================= */}

            <section className="dashboard-card security-check-card">

              <div className="card-header">

                <div>

                  <span className="dashboard-eyebrow">
                    SECURITY CONTROLS
                  </span>

                  <h2>
                    Protection checklist
                  </h2>

                </div>

              </div>


              <div className="security-checklist">

                <SecurityCheck
                  icon="🔐"
                  title="Password protection"
                  description="Require a password before a visitor can access a protected link."
                  enabled={
                    securityStats.protectedLinks > 0
                  }
                />


                <SecurityCheck
                  icon="⏱"
                  title="Link expiration"
                  description="Automatically stop links after a configured expiration date."
                  enabled={
                    securityStats.expiringLinks > 0
                  }
                />


                <SecurityCheck
                  icon="🎯"
                  title="Click limits"
                  description="Restrict the maximum number of visits a link can receive."
                  enabled={
                    securityStats.limitedLinks > 0
                  }
                />


                <SecurityCheck
                  icon="🗃"
                  title="Archive control"
                  description="Archive old links to remove them from active link management."
                  enabled={
                    securityStats.inactiveLinks > 0
                  }
                />

              </div>

            </section>


            {/* =================================
                LINK SECURITY TABLE
            ================================= */}

            <section className="dashboard-card security-links-card">

              <div className="card-header">

                <div>

                  <span className="dashboard-eyebrow">
                    SECURITY OVERVIEW
                  </span>

                  <h2>
                    Link protection status
                  </h2>

                </div>


                <button
                  className="view-all-button"
                  onClick={() =>
                    navigate("/links")
                  }
                >
                  Manage links →
                </button>

              </div>


              {links.length === 0 ? (

                <div className="empty-state">

                  <div className="empty-icon">
                    🛡
                  </div>

                  <h3>
                    No links yet
                  </h3>

                  <p>
                    Create a link to start
                    using Linkora security controls.
                  </p>

                </div>

              ) : (

                <div className="security-link-list">

                  {links.map(
                    (link) => {

                      const protectedLink =
                        link.is_password_protected ===
                        true;

                      const hasExpiration =
                        Boolean(
                          link.expires_at,
                        );

                      const hasLimit =
                        link.click_limit !==
                          null &&
                        link.click_limit !==
                          undefined;

                      const active =
                        link.is_active !==
                          false &&
                        link.is_archived !==
                          true;


                      return (

                        <div
                          className=
                            "security-link-row"
                          key={link.id}
                        >

                          <div
                            className=
                              "security-link-main"
                          >

                            <div
                              className=
                                "security-link-icon"
                            >
                              {protectedLink
                                ? "🔐"
                                : "🔗"}
                            </div>


                            <div>

                              <strong>
                                {link.custom_alias ||
                                  link.short_code}
                              </strong>

                              <span>
                                {link.original_url}
                              </span>

                            </div>

                          </div>


                          <div
                            className=
                              "security-badges"
                          >

                            <SecurityBadge
                              label="Password"
                              enabled={
                                protectedLink
                              }
                            />


                            <SecurityBadge
                              label="Expiry"
                              enabled={
                                hasExpiration
                              }
                            />


                            <SecurityBadge
                              label="Limit"
                              enabled={
                                hasLimit
                              }
                            />


                            <SecurityBadge
                              label="Active"
                              enabled={
                                active
                              }
                            />

                          </div>


                          <button
                            className=
                              "security-manage-button"
                            onClick={() =>
                              navigate(
                                `/links`,
                              )
                            }
                          >
                            Manage
                          </button>

                        </div>

                      );

                    },
                  )}

                </div>

              )}

            </section>


            {/* =================================
                SECURITY TIPS
            ================================= */}

            <section className="security-tips-grid">

              <SecurityTip
                icon="🔐"
                title="Protect sensitive links"
                text="Use password protection for private documents, internal campaigns, and restricted resources."
              />


              <SecurityTip
                icon="⏱"
                title="Use expiration dates"
                text="Temporary campaign and promotional links should expire automatically."
              />


              <SecurityTip
                icon="🎯"
                title="Set click limits"
                text="Control access by limiting the maximum number of visits a link can receive."
              />

            </section>

          </>

        )}

      </main>

    </div>
  );
}


/* =========================================
   SECURITY STAT
========================================= */

function SecurityStat({
  icon,
  title,
  value,
  total,
  text,
  theme,
}) {
  return (
    <div className="security-stat-card">

      <div
        className={`security-stat-icon ${theme}`}
      >
        {icon}
      </div>


      <span>
        {title}
      </span>


      <strong>
        {value}
      </strong>


      <small>
        {total > 0
          ? `${value} of ${total} links`
          : "No links yet"}
      </small>


      <p>
        {text}
      </p>

    </div>
  );
}


/* =========================================
   SECURITY CHECK
========================================= */

function SecurityCheck({
  icon,
  title,
  description,
  enabled,
}) {
  return (
    <div className="security-check">

      <div className="security-check-icon">
        {icon}
      </div>


      <div className="security-check-content">

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>

      </div>


      <div
        className={
          enabled
            ? "security-check-status enabled"
            : "security-check-status"
        }
      >
        <span>
          {enabled ? "✓" : "○"}
        </span>

        {enabled
          ? "Configured"
          : "Not configured"}

      </div>

    </div>
  );
}


/* =========================================
   SECURITY BADGE
========================================= */

function SecurityBadge({
  label,
  enabled,
}) {
  return (
    <span
      className={
        enabled
          ? "security-badge enabled"
          : "security-badge"
      }
    >
      {enabled ? "✓" : "○"} {label}
    </span>
  );
}


/* =========================================
   SECURITY TIP
========================================= */

function SecurityTip({
  icon,
  title,
  text,
}) {
  return (
    <div className="security-tip">

      <div className="security-tip-icon">
        {icon}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>

    </div>
  );
}


export default Security;