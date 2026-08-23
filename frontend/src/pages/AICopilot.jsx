import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import api from "../services/api";
import { logoutUser } from "../services/auth";


function AICopilot() {
  const navigate = useNavigate();

  const [links, setLinks] = useState([]);
  const [selectedLinkId, setSelectedLinkId] =
    useState("");

  const [insights, setInsights] =
    useState(null);

  const [loadingLinks, setLoadingLinks] =
    useState(true);

  const [loadingAI, setLoadingAI] =
    useState(false);

  const [error, setError] =
    useState("");


  const email =
    localStorage.getItem("user_email") ||
    "LinkSnip User";


  // =====================================================
  // LOAD LINKS
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    const loadLinks = async () => {
      try {
        setLoadingLinks(true);
        setError("");

        const response =
          await api.get("/links/");

        if (cancelled) {
          return;
        }

        const userLinks =
          response.data || [];

        setLinks(userLinks);

        if (userLinks.length > 0) {
          setSelectedLinkId(
            String(
              userLinks[0].id,
            ),
          );
        }

      } catch (requestError) {
        console.error(requestError);

        if (
          requestError.response?.status === 401
        ) {
          logoutUser();
          navigate("/login");
          return;
        }

        if (!cancelled) {
          setError(
            "Unable to load your links.",
          );
        }

      } finally {
        if (!cancelled) {
          setLoadingLinks(false);
        }
      }
    };

    loadLinks();

    return () => {
      cancelled = true;
    };
  }, [navigate]);


  // =====================================================
  // AI ANALYSIS
  // =====================================================

  const runAIAnalysis = async () => {
    if (!selectedLinkId) {
      setError(
        "Please select a link first.",
      );
      return;
    }

    try {
      setLoadingAI(true);
      setError("");
      setInsights(null);

      const response =
        await api.get(
          `/analytics/links/${selectedLinkId}/ai/`,
        );

      setInsights(
        response.data,
      );

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
        requestError.response?.data?.detail ||
        requestError.response?.data?.error ||
        "Unable to generate AI insights.",
      );

    } finally {
      setLoadingAI(false);
    }
  };


  // =====================================================
  // SELECTED LINK
  // =====================================================

  const selectedLink = links.find(
    (link) =>
      String(link.id) ===
      String(selectedLinkId),
  );


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
            className="sidebar-item active"
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
            className="sidebar-item"
            onClick={() =>
              navigate("/help")
            }
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
            onClick={() => {
              logoutUser();
              navigate("/login");
            }}
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
              AI LINK INTELLIGENCE
            </span>

            <h1>
              AI Copilot
            </h1>

            <p>
              Turn your link analytics into
              clear explanations and actionable
              recommendations.
            </p>

          </div>

        </header>


        {error && (
          <div className="dashboard-error">
            {error}
          </div>
        )}


        {/* =================================================
            SELECT LINK
        ================================================= */}

        <section className="dashboard-card">

          <div className="card-header">

            <div>

              <span className="dashboard-eyebrow">
                ANALYZE A LINK
              </span>

              <h2>
                Choose a link
              </h2>

            </div>

          </div>


          {loadingLinks ? (
            <p>
              Loading your links...
            </p>
          ) : links.length === 0 ? (
            <div>

              <p>
                You don't have any links yet.
              </p>

              <button
                className="primary-button"
                onClick={() =>
                  navigate("/dashboard")
                }
              >
                Create a link
              </button>

            </div>
          ) : (
            <>

              <select
                className="analytics-select"
                value={selectedLinkId}
                onChange={(event) => {
                  setSelectedLinkId(
                    event.target.value,
                  );
                  setInsights(null);
                  setError("");
                }}
              >
                {links.map((link) => (
                  <option
                    key={link.id}
                    value={link.id}
                  >
                    {link.custom_alias ||
                      link.short_code}
                  </option>
                ))}
              </select>


              {selectedLink && (
                <p
                  style={{
                    marginTop: "12px",
                    color: "#64748b",
                  }}
                >
                  Destination:{" "}
                  {selectedLink.original_url}
                </p>
              )}


              <button
                className="ai-insight-button"
                onClick={runAIAnalysis}
                disabled={
                  loadingAI ||
                  !selectedLinkId
                }
              >
                {loadingAI
                  ? "Analyzing..."
                  : "✦ Analyze my traffic"}
              </button>

            </>
          )}

        </section>


        {/* =================================================
            AI RESULT
        ================================================= */}

        {insights && (
          <section className="dashboard-card">

            <div className="card-header">

              <div>

                <span className="dashboard-eyebrow">
                  AI ANALYSIS
                </span>

                <h2>
                  Your traffic insights
                </h2>

              </div>

            </div>


            <div className="ai-results">

              {insights.summary && (
                <div className="ai-results">

                  <strong>
                    AI Summary
                  </strong>

                  <p>
                    {insights.summary}
                  </p>

                </div>
              )}


              {Array.isArray(
                insights.recommendations,
              ) &&
                insights.recommendations.length >
                  0 && (
                  <div className="ai-recommendations">

                    <strong>
                      Recommendations
                    </strong>

                    <div>
                      {insights.recommendations.map(
                        (
                          recommendation,
                          index,
                        ) => (
                          <div
                            key={index}
                            className="ai-recommendation-item"
                          >
                            <span>
                              {index + 1}.
                            </span>

                            <p>
                              {recommendation}
                            </p>
                          </div>
                        ),
                      )}
                    </div>

                  </div>
                )}

            </div>

          </section>
        )}


        {!loadingAI &&
          !insights &&
          links.length > 0 && (
            <section className="dashboard-card">

              <span className="dashboard-eyebrow">
                HOW IT WORKS
              </span>

              <h2>
                Your AI assistant
              </h2>

              <p>
                Select a link and click
                “Analyze my traffic” to generate
                a summary and recommendations
                from your analytics.
              </p>

            </section>
          )}

      </main>

    </div>
  );
}


export default AICopilot;