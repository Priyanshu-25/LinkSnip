import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import api from "../services/api";
import { logoutUser } from "../services/auth";


function Analytics() {
  const navigate = useNavigate();
  const location = useLocation();


  const [links, setLinks] = useState([]);
  const [selectedLinkId, setSelectedLinkId] =
    useState("");

  const [analytics, setAnalytics] =
    useState(null);

  const [aiInsights, setAiInsights] =
    useState(null);

  const [period, setPeriod] =
    useState(7);

  const [loadingLinks, setLoadingLinks] =
    useState(true);

  const [loadingAnalytics, setLoadingAnalytics] =
    useState(false);

  const [loadingAI, setLoadingAI] =
    useState(false);

  const [exportingCSV, setExportingCSV] =
    useState(false);

  const [error, setError] =
    useState("");

  const [aiError, setAiError] =
    useState("");


  const email =
    localStorage.getItem("user_email") ||
    "LinkSnip User";


  // =====================================================
  // LOAD USER LINKS
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


        const params =
          new URLSearchParams(
            location.search,
          );

        const requestedLinkId =
          params.get("link");


        if (requestedLinkId) {
          const matchingLink =
            userLinks.find(
              (link) =>
                String(link.id) ===
                String(requestedLinkId),
            );

          if (matchingLink) {
            setSelectedLinkId(
              String(matchingLink.id),
            );

            return;
          }
        }


        if (userLinks.length > 0) {
          setSelectedLinkId(
            String(userLinks[0].id),
          );
        } else {
          setSelectedLinkId("");
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

  }, [
    location.search,
    navigate,
  ]);


  // =====================================================
  // LOAD ANALYTICS
  // =====================================================

  useEffect(() => {
    if (!selectedLinkId) {
      setAnalytics(null);
      setAiInsights(null);
      return;
    }


    let cancelled = false;
    let firstLoad = true;


    const loadAnalytics = async () => {
      try {

        if (
          firstLoad &&
          !analytics
        ) {
          setLoadingAnalytics(true);
        }


        const response =
          await api.get(
            `/analytics/links/${selectedLinkId}/summary/?days=${period}`,
          );


        if (!cancelled) {
          setAnalytics(
            response.data,
          );

          setError("");
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
            "Unable to load analytics for this link.",
          );
        }

      } finally {

        if (
          !cancelled &&
          firstLoad
        ) {
          setLoadingAnalytics(false);
          firstLoad = false;
        }

      }
    };


    loadAnalytics();


    const refreshTimer =
      setInterval(
        loadAnalytics,
        5000,
      );


    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
    };

  }, [
    selectedLinkId,
    period,
    navigate,
  ]);


  // =====================================================
  // PERIOD DATA
  // =====================================================

  const dailyClicks =
    analytics?.daily_clicks || [];


  const filteredDailyClicks =
    useMemo(() => {
      if (
        dailyClicks.length === 0
      ) {
        return [];
      }


      const sorted = [
        ...dailyClicks,
      ].sort(
        (a, b) =>
          new Date(a.day) -
          new Date(b.day),
      );


      return sorted.slice(
        -period,
      );

    }, [
      dailyClicks,
      period,
    ]);


  const periodClicks =
    useMemo(() => {
      return filteredDailyClicks.reduce(
        (total, item) =>
          total +
          Number(
            item.total || 0,
          ),
        0,
      );
    }, [
      filteredDailyClicks,
    ]);


  const maxDailyClicks =
    useMemo(() => {
      if (
        filteredDailyClicks.length === 0
      ) {
        return 1;
      }


      return Math.max(
        ...filteredDailyClicks.map(
          (item) =>
            Number(
              item.total,
            ) || 0,
        ),
        1,
      );

    }, [
      filteredDailyClicks,
    ]);


  // =====================================================
  // TOP DATA
  // =====================================================

  const getTopItem = (
    data,
    key,
  ) => {
    if (
      !Array.isArray(data) ||
      data.length === 0
    ) {
      return {
        label: "No data",
        value: 0,
      };
    }


    const sorted = [
      ...data,
    ].sort(
      (a, b) =>
        Number(
          b.total || 0,
        ) -
        Number(
          a.total || 0,
        ),
    );


    return {
      label:
        sorted[0]?.[key] ||
        "Unknown",

      value:
        Number(
          sorted[0]?.total || 0,
        ),
    };
  };


  const topDevice =
    getTopItem(
      analytics?.devices,
      "device",
    );


  const topBrowser =
    getTopItem(
      analytics?.browsers,
      "browser",
    );


  const topCountry =
    getTopItem(
      analytics?.countries,
      "country",
    );


  const topReferrer =
    getTopItem(
      analytics?.referrers,
      "referrer",
    );


  const totalClicks =
    Number(
      analytics?.total_clicks,
    ) || 0;


  const selectedLink =
    analytics?.link || null;


  // =====================================================
  // AI
  // =====================================================

  const handleAIInsights = async () => {
    if (!selectedLinkId) {
      return;
    }


    try {
      setLoadingAI(true);
      setAiError("");

      const response =
        await api.get(
          `/analytics/links/${selectedLinkId}/ai/`,
        );

      setAiInsights(
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

      setAiError(
        "Unable to generate AI insights.",
      );

    } finally {
      setLoadingAI(false);
    }
  };


  // =====================================================
  // CSV EXPORT
  // =====================================================

  const handleExportCSV = async () => {
    if (!selectedLinkId || exportingCSV) {
      return;
    }

    try {
      setExportingCSV(true);
      setError("");

      const response = await api.get(
        `/analytics/links/${selectedLinkId}/export/?days=${period}`,
        {
          responseType: "blob",
        },
      );

      const contentDisposition =
        response.headers?.["content-disposition"] || "";

      let filename =
        `linksnip-${selectedLinkId}-${period}days.csv`;

      const filenameMatch =
        contentDisposition.match(
          /filename="?([^";]+)"?/i,
        );

      if (filenameMatch?.[1]) {
        filename = filenameMatch[1];
      }

      const blob = new Blob(
        [response.data],
        {
          type: "text/csv",
        },
      );

      const downloadUrl =
        window.URL.createObjectURL(blob);

      const downloadLink =
        document.createElement("a");

      downloadLink.href = downloadUrl;
      downloadLink.download = filename;

      document.body.appendChild(
        downloadLink,
      );

      downloadLink.click();
      downloadLink.remove();

      window.URL.revokeObjectURL(
        downloadUrl,
      );

      setError("");
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
        "Unable to export analytics as CSV.",
      );
    } finally {
      setExportingCSV(false);
    }
  };


  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };


  // =====================================================
  // PAGE
  // =====================================================

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
            LINKSNIP AI
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
            className="sidebar-item active"
          >
            <span>📊</span>
            Analytics
          </button>


          <button
            className="sidebar-item"
            onClick={() =>
              navigate(
                `/analytics${
                  selectedLinkId
                    ? `?link=${selectedLinkId}`
                    : ""
                }`,
              )
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


          <button className="sidebar-item"
          onClick={() => navigate("/help")}
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
            onClick={
              handleLogout
            }
          >
            Log out
          </button>

        </div>

      </aside>


      {/* =====================================
          MAIN
      ===================================== */}

      <main className="dashboard-main">

        <header className="analytics-header">

          <div>

            <span className="dashboard-eyebrow">
              PERFORMANCE CENTER
            </span>

            <h1>
              Analytics
            </h1>

            <p>
              Understand your link performance
              and discover what is driving clicks.
            </p>

          </div>


          <div className="analytics-controls">

            <label htmlFor="analytics-link">
              Select link
            </label>


            <select
              id="analytics-link"
              className=
                "analytics-link-select"
              value={selectedLinkId}
              onChange={(event) => {

                const newLinkId =
                  event.target.value;

                setSelectedLinkId(
                  newLinkId,
                );

                setAnalytics(null);
                setAiInsights(null);
                setAiError("");


                const params =
                  new URLSearchParams(
                    location.search,
                  );

                params.set(
                  "link",
                  newLinkId,
                );

                navigate(
                  `/analytics?${params.toString()}`,
                  {
                    replace: true,
                  },
                );

              }}
              disabled={loadingLinks}
            >

              {links.length === 0 ? (

                <option value="">
                  No links available
                </option>

              ) : (

                links.map(
                  (link) => (
                    <option
                      key={link.id}
                      value={link.id}
                    >
                      {link.custom_alias ||
                        link.short_code}
                    </option>
                  ),
                )

              )}

            </select>

          </div>

        </header>


        {/* =====================================
            LINK BANNER
        ===================================== */}

        {selectedLink && (

          <div
            className=
              "analytics-link-banner"
          >

            <div>

              <span>
                ANALYZING
              </span>

              <strong>
                {selectedLink.custom_alias ||
                  selectedLink.short_code}
              </strong>

            </div>


            <a
              href="/"
              onClick={(event) => {

                event.preventDefault();

                window.open(
                  `http://127.0.0.1:8000/${
                    selectedLink.custom_alias ||
                    selectedLink.short_code
                  }/`,
                  "_blank",
                );

              }}
            >
              Open short link →
            </a>

          </div>

        )}


        {error && (

          <div className="dashboard-error">
            {error}
          </div>

        )}


        {/* =====================================
            MAIN CONTENT
        ===================================== */}

        {loadingAnalytics &&
        !analytics ? (

          <div
            className=
              "analytics-loading-card"
          >

            <div
              className=
                "analytics-spinner"
            />

            <p>
              Loading your analytics...
            </p>

          </div>

        ) : !analytics ? (

          <div
            className=
              "dashboard-card empty-state"
          >

            <div className="empty-icon">
              📊
            </div>

            <h3>
              No analytics available
            </h3>

            <p>
              Create a link and start receiving
              clicks to see analytics here.
            </p>

          </div>

        ) : (

          <>

            {/* =================================
                PERIOD SELECTOR
            ================================= */}

            <section
              className=
                "analytics-period-toolbar"
            >

              <div>

                <span
                  className=
                    "dashboard-eyebrow"
                >
                  REPORTING PERIOD
                </span>

                <h2>
                  Traffic overview
                </h2>

              </div>


              <div
                className=
                  "analytics-period-switch"
              >

                <button
                  className={
                    period === 7
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPeriod(7)
                  }
                >
                  7 Days
                </button>


                <button
                  className={
                    period === 30
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPeriod(30)
                  }
                >
                  30 Days
                </button>


                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={
                    exportingCSV ||
                    !selectedLinkId
                  }
                  title={
                    `Export ${period}-day analytics as CSV`
                  }
                >
                  {exportingCSV
                    ? "Exporting..."
                    : "↓ Export CSV"}
                </button>

              </div>

            </section>


            {/* =================================
                STAT CARDS
            ================================= */}

            <section
              className=
                "analytics-stats"
            >

              <AnalyticsStat
                icon="↗"
                title="Total Clicks"
                value={totalClicks}
                theme="blue"
              />


              <AnalyticsStat
                icon="📈"
                title={`${period}-Day Clicks`}
                value={periodClicks}
                theme="green"
              />


              <AnalyticsStat
                icon="📱"
                title="Devices"
                value={
                  analytics.devices?.length ||
                  0
                }
                theme="orange"
              />


              <AnalyticsStat
                icon="🌍"
                title="Countries"
                value={
                  analytics.countries?.length ||
                  0
                }
                theme="purple"
              />

            </section>


            {/* =================================
                CLICK TREND
            ================================= */}

            <section
              className=
                "dashboard-card analytics-main-card"
            >

              <div
                className=
                  "analytics-section-header"
              >

                <div>

                  <span
                    className=
                      "dashboard-eyebrow"
                  >
                    TRAFFIC TREND
                  </span>

                  <h2>
                    Click activity
                  </h2>

                </div>


                <span
                  className=
                    "analytics-period"
                >
                  Live • updates every 5s
                </span>

              </div>


              {filteredDailyClicks.length === 0 ? (

                <div
                  className=
                    "analytics-empty"
                >
                  No click activity for this
                  period.
                </div>

              ) : (

                <div className="click-chart">

                  <div
                    className=
                      "chart-y-labels"
                  >

                    <span>
                      {maxDailyClicks}
                    </span>

                    <span>
                      {Math.ceil(
                        maxDailyClicks / 2,
                      )}
                    </span>

                    <span>
                      0
                    </span>

                  </div>


                  <div
                    className=
                      "chart-content"
                  >

                    <div
                      className=
                        "chart-grid-lines"
                    >
                      <div />
                      <div />
                      <div />
                    </div>


                    <div className="bars">

                      {filteredDailyClicks.map(
                        (item) => {

                          const clicks =
                            Number(
                              item.total,
                            ) || 0;


                          const height =
                            Math.max(
                              8,
                              (
                                clicks /
                                maxDailyClicks
                              ) * 100,
                            );


                          return (

                            <div
                              className=
                                "bar-column"
                              key={item.day}
                            >

                              <div
                                className=
                                  "bar-value"
                              >
                                {clicks}
                              </div>


                              <div
                                className=
                                  "bar-track"
                              >

                                <div
                                  className=
                                    "bar-fill"
                                  style={{
                                    height:
                                      `${height}%`,
                                  }}
                                />

                              </div>


                              <span
                                className=
                                  "bar-label"
                              >
                                {formatDate(
                                  item.day,
                                )}
                              </span>

                            </div>

                          );

                        },
                      )}

                    </div>

                  </div>

                </div>

              )}

            </section>


            {/* =================================
                TOP PERFORMERS
            ================================= */}

            <section
              className=
                "analytics-highlights-grid"
            >

              <HighlightCard
                icon="📱"
                title="Top Device"
                value={
                  topDevice.label
                }
                count={
                  topDevice.value
                }
                suffix="clicks"
              />


              <HighlightCard
                icon="🌐"
                title="Top Browser"
                value={
                  topBrowser.label
                }
                count={
                  topBrowser.value
                }
                suffix="clicks"
              />


              <HighlightCard
                icon="🌍"
                title="Top Country"
                value={
                  topCountry.label
                }
                count={
                  topCountry.value
                }
                suffix="clicks"
              />


              <HighlightCard
                icon="↗"
                title="Top Referrer"
                value={
                  topReferrer.label
                }
                count={
                  topReferrer.value
                }
                suffix="clicks"
              />

            </section>


            {/* =================================
                BREAKDOWNS
            ================================= */}

            <section
              className=
                "analytics-breakdown-grid"
            >

              <BreakdownCard
                title="Devices"
                subtitle=
                  "Where people are clicking"
                data={
                  analytics.devices
                }
                labelKey="device"
                icon="📱"
              />


              <BreakdownCard
                title="Browsers"
                subtitle=
                  "Browser distribution"
                data={
                  analytics.browsers
                }
                labelKey="browser"
                icon="🌐"
              />


              <BreakdownCard
                title="Countries"
                subtitle=
                  "Geographic traffic"
                data={
                  analytics.countries
                }
                labelKey="country"
                icon="🌍"
              />


              <BreakdownCard
                title="Referrers"
                subtitle=
                  "Where visitors came from"
                data={
                  analytics.referrers
                }
                labelKey="referrer"
                icon="↗"
              />

            </section>


            {/* =================================
                AI COPILOT
            ================================= */}

            <section
              className=
                "ai-insight-card"
            >

              <div
                className=
                  "ai-insight-icon"
              >
                ✦
              </div>


              <div
                className=
                  "ai-insight-content"
              >

                <span>
                  LinkSnip
                </span>


                <h2>
                  Get an intelligent explanation
                  of your traffic.
                </h2>


                <p>
                  Let Linkora analyze your real
                  click data and highlight the
                  most important patterns.
                </p>


                {aiInsights && (

                  <div
                    className="ai-results"
                  >

                    <div
                      className="ai-summary"
                    >

                      <strong>
                        AI Summary
                      </strong>

                      <p>
                        {aiInsights.summary}
                      </p>

                    </div>


                    <div
                      className=
                        "ai-recommendations"
                    >

                      <strong>
                        Recommendations
                      </strong>


                      {aiInsights
                        .recommendations
                        ?.map(
                          (
                            recommendation,
                            index,
                          ) => (

                            <div
                              className=
                                "ai-recommendation"
                              key={index}
                            >

                              <span>
                                ✓
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


                {aiError && (

                  <div
                    className="ai-error"
                  >
                    {aiError}
                  </div>

                )}

              </div>


              <div className="ai-action-buttons">

                <button
                  className="ai-insight-button"
                  onClick={handleAIInsights}
                  disabled={loadingAI}
                >
                  {loadingAI
                    ? "Analyzing..."
                    : "✦ Explain my traffic"}
                </button>

                <button
                  className="ai-secondary-button"
                  onClick={handleAIInsights}
                  disabled={loadingAI}
                >
                  {loadingAI
                    ? "Analyzing..."
                    : "✦ What should I improve?"}
                </button>

              </div>

            </section>

          </>

        )}

      </main>

    </div>
  );
}


/* =========================================
   ANALYTICS STAT
========================================= */

function AnalyticsStat({
  icon,
  title,
  value,
  theme,
}) {
  return (
    <div className="stat-card">

      <div
        className={
          `stat-icon ${theme}`
        }
      >
        {icon}
      </div>


      <span>
        {title}
      </span>


      <strong>
        {value}
      </strong>

    </div>
  );
}


/* =========================================
   HIGHLIGHT CARD
========================================= */

function HighlightCard({
  icon,
  title,
  value,
  count,
  suffix,
}) {
  return (
    <div
      className=
        "analytics-highlight-card"
    >

      <div
        className=
          "analytics-highlight-icon"
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
        {count} {suffix}
      </small>

    </div>
  );
}


/* =========================================
   BREAKDOWN CARD
========================================= */

function BreakdownCard({
  title,
  subtitle,
  data,
  labelKey,
  icon,
}) {
  const items = data || [];


  const maxValue =
    Math.max(
      ...items.map(
        (item) =>
          Number(
            item.total,
          ) || 0,
      ),
      1,
    );


  return (
    <section
      className=
        "dashboard-card breakdown-card"
    >

      <div
        className=
          "breakdown-header"
      >

        <div
          className=
            "breakdown-title-icon"
        >
          {icon}
        </div>


        <div>

          <h3>
            {title}
          </h3>

          <p>
            {subtitle}
          </p>

        </div>

      </div>


      {items.length === 0 ? (

        <div
          className=
            "analytics-empty small"
        >
          No data yet.
        </div>

      ) : (

        <div
          className=
            "breakdown-list"
        >

          {items
            .slice(0, 6)
            .map(
              (
                item,
                index,
              ) => {

                const value =
                  Number(
                    item.total,
                  ) || 0;


                const width =
                  Math.max(
                    8,
                    (
                      value /
                      maxValue
                    ) * 100,
                  );


                return (

                  <div
                    className=
                      "breakdown-row"
                    key={`${labelKey}-${index}`}
                  >

                    <div
                      className=
                        "breakdown-row-top"
                    >

                      <span>
                        {item[labelKey] ||
                          "Unknown"}
                      </span>

                      <strong>
                        {value}
                      </strong>

                    </div>


                    <div
                      className=
                        "analytics-track"
                    >

                      <div
                        className=
                          "analytics-progress"
                        style={{
                          width:
                            `${width}%`,
                        }}
                      />

                    </div>

                  </div>

                );

              },
            )}

        </div>

      )}

    </section>
  );
}


/* =========================================
   DATE FORMATTER
========================================= */

function formatDate(
  dateString,
) {
  if (!dateString) {
    return "";
  }


  const date =
    new Date(
      dateString,
    );


  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return dateString;
  }


  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
    },
  );
}


export default Analytics;