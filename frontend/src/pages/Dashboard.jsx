import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";
import { logoutUser } from "../services/auth";


function Dashboard() {
  const navigate = useNavigate();

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [clickLimit, setClickLimit] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [redirectType, setRedirectType] = useState("302");

  const [passwordProtected, setPasswordProtected] =
    useState(false);

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [message, setMessage] =
  useState("");

const [error, setError] =
  useState("");

const [fieldErrors, setFieldErrors] = useState({
  url: "",
  alias: "",
  clickLimit: "",
  expiresAt: "",
  password: "",
  redirectType: "",
});

  const email =
    localStorage.getItem("user_email") ||
    "LinkSnip user";


  // =====================================================
  // LOAD LINKS
  // =====================================================

  const loadLinks = async () => {
    try {
      setLoading(true);

      const response =
        await api.get("/links/");

      setLinks(response.data);
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
        "Unable to load your links.",
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadLinks();
  }, []);


  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };


  // =====================================================
  // RESET CREATE FORM
  // =====================================================

  const resetCreateForm = () => {
    setUrl("");
    setAlias("");
    setClickLimit("");
    setExpiresAt("");
    setRedirectType("302");

    setPasswordProtected(false);
    setPassword("");
    setShowPassword(false);
  };


  // =====================================================
  // CREATE LINK
  // =====================================================

  const handleCreateLink = async (
    event,
  ) => {
    event.preventDefault();

    setMessage("");
    setError("");

setFieldErrors({
  url: "",
  alias: "",
  clickLimit: "",
  expiresAt: "",
  password: "",
  redirectType: "",
});

    if (!url.trim()) {
  setFieldErrors((current) => ({
    ...current,
    url: "Please enter a destination URL.",
  }));
  return;
}


   if (
  passwordProtected &&
  !password.trim()
) {
  setFieldErrors((current) => ({
    ...current,
    password:
      "Please enter a password for this protected link.",
  }));
  return;
}


    try {
      setCreating(true);


      const payload = {
        original_url:
          url.trim(),
      };


      if (alias.trim()) {
        payload.custom_alias =
          alias.trim();
      }


      if (clickLimit) {
        payload.click_limit =
          Number(clickLimit);
      }


      if (expiresAt) {
        payload.expires_at =
          new Date(
            expiresAt,
          ).toISOString();
      }


      payload.redirect_type =
        Number(redirectType);


      if (passwordProtected) {
        payload.password =
          password;

        payload.is_password_protected =
          true;

      } else {
        payload.is_password_protected =
          false;
      }


      const response =
        await api.post(
          "/links/",
          payload,
        );


      setLinks(
        (currentLinks) => [
          response.data,
          ...currentLinks,
        ],
      );


      setMessage(
        passwordProtected
          ? "Password-protected smart link created successfully."
          : "Smart link created successfully.",
      );


      resetCreateForm();
      setShowCreate(false);

    } catch (requestError) {
  console.error(requestError);

  const backendError =
    requestError.response?.data || {};

  const nextFieldErrors = {
    url:
      backendError?.original_url?.[0] || "",
    alias:
      backendError?.custom_alias?.[0] || "",
    clickLimit:
      backendError?.click_limit?.[0] || "",
    expiresAt:
      backendError?.expires_at?.[0] || "",
    password:
      backendError?.password?.[0] || "",
    redirectType:
      backendError?.redirect_type?.[0] || "",
  };

  setFieldErrors(nextFieldErrors);

  const generalError =
    backendError?.detail ||
    backendError?.error ||
    "";

  const hasFieldError =
    Object.values(nextFieldErrors).some(
      (value) => Boolean(value),
    );

  setError(
    hasFieldError
      ? ""
      : generalError ||
        "Unable to create the link.",
  );
}finally {
      setCreating(false);
    }
  };


  // =====================================================
  // DASHBOARD STATS
  // =====================================================

  const totalClicks =
    links.reduce(
      (total, link) =>
        total +
        Number(
          link.click_count || 0,
        ),
      0,
    );


  const activeLinks =
    links.filter(
      (link) =>
        link.is_active !== false &&
        link.is_archived !== true,
    ).length;


  const protectedLinks =
    links.filter(
      (link) =>
        link.is_password_protected === true,
    ).length;


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
            LinkSnip
          </span>

        </div>


        <div className="workspace-label">
          WORKSPACE
        </div>


        <nav className="sidebar-nav">

          <button
            className="sidebar-item active"
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

        <header className="dashboard-header">

          <div>

            <span className="dashboard-eyebrow">
              LINKSNIP WORKSPACE
            </span>

            <h1>
              Good to see you 👋
            </h1>

            <p>
              Here's what's happening with
              your links.
            </p>

          </div>


          <button
            className="dashboard-create-button"
           onClick={() => {
  setShowCreate(true);
  setError("");
  setMessage("");

  setFieldErrors({
    url: "",
    alias: "",
    clickLimit: "",
    expiresAt: "",
    password: "",
    redirectType: "",
  });

  resetCreateForm();
}}
          >
            <span>+</span>
            Create Smart Link
          </button>

        </header>


        {/* =====================================
            MESSAGES
        ===================================== */}

        {message && (
          <div className="dashboard-success">
            {message}
          </div>
        )}


        {error && (
          <div className="dashboard-error">
            {error}
          </div>
        )}


        {/* =====================================
            STATS
        ===================================== */}

        <section className="stats-grid">

          <StatCard
            icon="🔗"
            title="Total Links"
            value={links.length}
            theme="blue"
          />


          <StatCard
            icon="↗"
            title="Total Clicks"
            value={totalClicks}
            theme="green"
          />


          <StatCard
            icon="●"
            title="Active Links"
            value={activeLinks}
            theme="orange"
          />


          <StatCard
            icon="🔐"
            title="Protected Links"
            value={protectedLinks}
            theme="purple"
          />

        </section>


        {/* =====================================
            RECENT LINKS
        ===================================== */}

        <section className="dashboard-card">

          <div className="card-header">

            <div>

              <span className="dashboard-eyebrow">
                LINK MANAGEMENT
              </span>

              <h2>
                Recent links
              </h2>

            </div>


            <button
              className="view-all-button"
              onClick={() =>
                navigate("/links")
              }
            >
              View all →
            </button>

          </div>


          {loading ? (

            <div className="empty-state">
              Loading your links...
            </div>

          ) : links.length === 0 ? (

            <div className="empty-state">

              <div className="empty-icon">
                🔗
              </div>

              <h3>
                No links yet
              </h3>

              <p>
                Create your first smart link
                and start tracking performance.
              </p>


              <button
                className="empty-action"
                onClick={() =>
                  setShowCreate(true)
                }
              >
                Create your first link
                <span>→</span>
              </button>

            </div>

          ) : (

            <div className="links-table">

              <div
                className=
                  "table-row table-heading"
              >

                <span>
                  Link
                </span>

                <span>
                  Destination
                </span>

                <span>
                  Clicks
                </span>

                <span>
                  Status
                </span>

              </div>


              {links
                .slice(0, 5)
                .map(
                  (link) => {

                    const publicCode =
                      link.custom_alias ||
                      link.short_code;


                    return (

                      <div
                        className="table-row"
                        key={link.id}
                      >

                        <div className="link-name">

                          <div
                            className=
                              "link-small-icon"
                          >
                            {link.is_password_protected
                              ? "🔐"
                              : "↗"}
                          </div>


                          <div>

                            <strong>
                              {publicCode}
                            </strong>


                            {link.is_password_protected && (
                              <small
                                style={{
                                  display:
                                    "block",

                                  marginTop:
                                    "3px",

                                  color:
                                    "#2563eb",

                                  fontSize:
                                    "9px",

                                  fontWeight:
                                    "700",
                                }}
                              >
                                🔐 Password protected
                              </small>
                            )}


                            <span>
                              {link.short_url ||
                                `http://127.0.0.1:8000/${publicCode}/`}
                            </span>

                          </div>

                        </div>


                        <span
                          className=
                            "destination"
                        >
                          {link.original_url}
                        </span>


                        <strong>
                          {link.click_count || 0}
                        </strong>


                        <span>

                          <span
                            className={
                              link.is_active &&
                              !link.is_archived
                                ? "status-pill"
                                : "status-pill inactive"
                            }
                          >
                            {link.is_archived
                              ? "Archived"
                              : link.is_active
                                ? "Active"
                                : "Inactive"}
                          </span>

                        </span>

                      </div>

                    );
                  },
                )}

            </div>

          )}

        </section>


        {/* =====================================
            QUICK ACTIONS
        ===================================== */}

        <section className="quick-grid">

          <QuickCard
            icon="✦"
            title="AI Copilot"
            text=
              "Turn link data into useful recommendations."
            onClick={() =>
              navigate("/ai-copilot")
            }
          />


          <QuickCard
            icon="📊"
            title="Advanced Analytics"
            text=
              "Understand clicks, devices and traffic sources."
            onClick={() =>
              navigate("/analytics")
            }
          />


          <QuickCard
            icon="🛡"
            title="Link Security"
            text=
              "Protect links with passwords and expiration."
            onClick={() =>
              navigate("/security")
            }
          />

        </section>

      </main>


      {/* =====================================
          CREATE MODAL
      ===================================== */}

      {showCreate && (

        <div
          className="modal-overlay"
          onClick={() => {

            if (!creating) {
              setShowCreate(false);
            }

          }}
        >

          <div
            className="create-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <span>
                  LinkSnip
                </span>

                <h2>
                  Create Smart Link
                </h2>

                <p>
                  Create a short link with
                  optional security controls.
                </p>

              </div>


              <button
                className="modal-close"
                onClick={() =>
                  setShowCreate(false)
                }
                disabled={creating}
              >
                ×
              </button>

            </div>


            <form
              className="create-form"
              onSubmit={
                handleCreateLink
              }
            >

              {/* DESTINATION */}

              <label>
                Destination URL
              </label>


              <input
                type="url"
                placeholder=
                  "https://example.com/your-page"
                value={url}
                onChange={(event) => {
  setUrl(event.target.value);

  setFieldErrors((current) => ({
    ...current,
    url: "",
  }));
}}
                required
              />{fieldErrors.url && (
  <div className="field-error">
    <span>!</span>
    {fieldErrors.url}
  </div>
)}


              {/* ALIAS */}

              <label>
                Custom alias

                <span>
                  Optional
                </span>
              </label>


              <input
                type="text"
                placeholder="summer-sale"
                value={alias}
                onChange={(event) => {
  setAlias(event.target.value);

  setFieldErrors((current) => ({
    ...current,
    alias: "",
  }));
}}
              />

{fieldErrors.alias && (
  <div className="field-error">
    <span>!</span>
    {fieldErrors.alias}
  </div>
)}
              {/* LIMIT + EXPIRATION */}

              <div
                className=
                  "form-two-columns"
              >

                <div>

                  <label>
                    Click limit

                    <span>
                      Optional
                    </span>
                  </label>


                  <input
                    type="number"
                    min="1"
                    placeholder="100"
                    value={clickLimit}
                   onChange={(event) => {
  setClickLimit(event.target.value);

  setFieldErrors((current) => ({
    ...current,
    clickLimit: "",
  }));
}}
                  />
{fieldErrors.clickLimit && (
  <div className="field-error">
    <span>!</span>
    {fieldErrors.clickLimit}
  </div>
)}
                </div>


                <div>

                  <label>
                    Expiration

                    <span>
                      Optional
                    </span>
                  </label>


                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(event) =>
                      setExpiresAt(
                        event.target.value,
                      )
                    }
                  />
{fieldErrors.expiresAt && (
  <div className="field-error">
    <span>!</span>
    {fieldErrors.expiresAt}
  </div>
)}
                </div>

              </div>


              {/* REDIRECT TYPE */}

              <div
                className="form-two-columns"
                style={{
                  marginTop: "8px",
                  marginBottom: "2px",
                }}
              >
                <div>

                  <label>
                    Redirect type

                    <span>
                      Required
                    </span>
                  </label>

                  <select
                    value={redirectType}
                    onChange={(event) => {
  setRedirectType(event.target.value);

  setFieldErrors((current) => ({
    ...current,
    redirectType: "",
  }));
}}
                    style={{
                      width: "100%",
                      minHeight: "36px",
                      height: "36px",
                      padding: "8px 10px",
                      border: "1px solid #dbe5f0",
                      borderRadius: "9px",
                      background: "#ffffff",
                      color: "#334155",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="302">
                      302 Temporary
                    </option>

                    <option value="301">
                      301 Permanent
                    </option>
                  </select>
{fieldErrors.redirectType && (
  <div className="field-error">
    <span>!</span>
    {fieldErrors.redirectType}
  </div>
)}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    paddingBottom: "2px",
                  }}
                >

                  <p
                    style={{
                      margin: 0,
                      fontSize: "8px",
                      lineHeight: 1.35,
                      color: "#64748b",
                    }}
                  >
                    302 is recommended when
                    you may change the destination later.
                  </p>

                </div>

              </div>


              {/* PASSWORD */}

              <div
                className=
                  "security-form-section"
              >

                <label
                  className=
                    "security-checkbox-row"
                >

                  <input
                    type="checkbox"
                    checked={
                      passwordProtected
                    }
                    onChange={(event) => {

                      const enabled =
                        event.target.checked;

                      setPasswordProtected(
                        enabled,
                      );


                      if (!enabled) {
                        setPassword("");
                        setShowPassword(false);
                      }

                    }}
                  />


                  <span>
                    🔐 Password protect this link
                  </span>

                </label>


                {passwordProtected && (

                  <div
                    className=
                      "password-input-wrapper"
                  >

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value,
                        )
                      }
                      placeholder=
                        "Enter a secure password"
                      minLength={4}
                      required
                    />


                    <button
                      type="button"
                      className=
                        "password-toggle"
                      onClick={() =>
                        setShowPassword(
                          (current) =>
                            !current,
                        )
                      }
                    >
                      {showPassword
                        ? "Hide"
                        : "Show"}
                    </button>

                  </div>

                )}


                {passwordProtected && (

                  <p
                    className=
                      "security-form-help"
                  >
                    Visitors will need this
                    password before they can
                    open the link.
                  </p>

                )}

              </div>


              {/* ACTIONS */}

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    setShowCreate(false)
                  }
                  disabled={creating}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className=
                    "modal-create-button"
                  disabled={creating}
                >
                  {creating
                    ? "Creating..."
                    : "Create Smart Link →"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}


/* =========================================
   STAT CARD
========================================= */

function StatCard({
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
   QUICK CARD
========================================= */

function QuickCard({
  icon,
  title,
  text,
  onClick,
}) {
  return (
    <div className="quick-card">

      <div className="quick-icon">
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
        disabled={!onClick}
      >
        Explore →
      </button>

    </div>
  );
}


export default Dashboard;