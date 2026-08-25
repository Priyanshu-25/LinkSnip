import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";
import { logoutUser } from "../services/auth";


function MyLinks() {
  const navigate = useNavigate();

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkWorking, setBulkWorking] = useState(false);

  const bulkImportInputRef = useRef(null);

  const [editingLink, setEditingLink] = useState(null);

  const [editUrl, setEditUrl] = useState("");
  const [editAlias, setEditAlias] = useState("");
  const [editClickLimit, setEditClickLimit] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const email =
    localStorage.getItem("user_email") ||
    "LinkSnip User";


  const loadLinks = async () => {
    try {
      setLoading(true);

      const response = await api.get("/links/");

      setLinks(response.data);
      setError("");
    } catch (requestError) {
      console.error(requestError);

      if (requestError.response?.status === 401) {
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

  const handleBulkImport = async (event) => {
    const file = event.target.files?.[0];

    // Allow the same file to be selected again after an attempt.
    event.target.value = "";

    if (!file) {
      return;
    }

    setMessage("");
    setError("");

    // The file picker is intentionally not restricted to .csv so that
    // Windows does not hide files because of an extension/display issue.
    // We still enforce the CSV requirement here.
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post(
        "/links/bulk-import/",
        formData,
      );

      const data = response.data || {};
      const created = Number(data.created || 0);
      const failed = Number(data.failed || 0);

      if (failed > 0) {
        setMessage(
          `${created} link${created === 1 ? "" : "s"} imported successfully. ` +
            `${failed} row${failed === 1 ? "" : "s"} failed.`,
        );
      } else {
        setMessage(
          `${created} link${created === 1 ? "" : "s"} imported successfully.`,
        );
      }

      await loadLinks();
    } catch (requestError) {
      console.error("Bulk CSV import failed:", requestError);

      const backendError = requestError.response?.data || {};

      // Your backend returns row-level details in `results`.
      if (Array.isArray(backendError.results)) {
        const failedRows = backendError.results
          .filter((item) => item.status === "error")
          .map(
            (item) =>
              `Row ${item.row}: ${item.message || "Invalid row."}`,
          );

        if (failedRows.length > 0) {
          setError(failedRows.join(" | "));
        } else if (backendError.detail) {
          setError(String(backendError.detail));
        } else {
          setError("Unable to import the CSV file.");
        }

        return;
      }

      if (backendError.detail) {
        setError(String(backendError.detail));
        return;
      }

      setError("Unable to import the CSV file.");
    }
  };


  useEffect(() => {
    loadLinks();
  }, []);


  const openEdit = (link) => {
    setEditingLink(link);

    setEditUrl(link.original_url || "");
    setEditAlias(link.custom_alias || "");
    setEditClickLimit(
      link.click_limit
        ? String(link.click_limit)
        : "",
    );

    if (link.expires_at) {
      const date = new Date(
        link.expires_at,
      );

      if (!Number.isNaN(date.getTime())) {
        setEditExpiresAt(
          date.toISOString().slice(0, 16),
        );
      } else {
        setEditExpiresAt("");
      }
    } else {
      setEditExpiresAt("");
    }

    setMessage("");
    setError("");
  };


  const closeEdit = () => {
    setEditingLink(null);
    setEditUrl("");
    setEditAlias("");
    setEditClickLimit("");
    setEditExpiresAt("");
  };


  const saveEdit = async (event) => {
    event.preventDefault();

    if (!editingLink) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        original_url: editUrl.trim(),
        custom_alias: editAlias.trim()
          ? editAlias.trim()
          : null,
        click_limit: editClickLimit
          ? Number(editClickLimit)
          : null,
        expires_at: editExpiresAt
          ? new Date(
              editExpiresAt,
            ).toISOString()
          : null,
      };

      const response = await api.patch(
        `/links/${editingLink.id}/`,
        payload,
      );

      setLinks((currentLinks) =>
        currentLinks.map((link) =>
          link.id === editingLink.id
            ? response.data
            : link,
        ),
      );

      closeEdit();

      setMessage(
        "Link updated successfully.",
      );
    } catch (requestError) {
      console.error(requestError);

      const backendError =
        requestError.response?.data || {};

      setError(
        backendError.original_url?.[0] ||
          backendError.custom_alias?.[0] ||
          backendError.click_limit?.[0] ||
          "Unable to update the link.",
      );
    } finally {
      setSaving(false);
    }
  };


  const archiveLink = async (link) => {
    const name =
      link.custom_alias ||
      link.short_code;

    const confirmed = window.confirm(
      `Archive "${name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/links/${link.id}/`,
      );

      setLinks((currentLinks) =>
        currentLinks.filter(
          (item) =>
            item.id !== link.id,
        ),
      );

      setMessage(
        "Link archived successfully.",
      );
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Unable to archive the link.",
      );
    }
  };


  const toggleSelected = (linkId) => {
    setSelectedIds((current) =>
      current.includes(linkId)
        ? current.filter((id) => id !== linkId)
        : [...current, linkId],
    );
  };

  const activeFilteredIds = filteredLinks.map(
    (link) => link.id,
  );

  const allVisibleSelected =
    activeFilteredIds.length > 0 &&
    activeFilteredIds.every(
      (id) => selectedIds.includes(id),
    );

  const toggleSelectAll = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter(
          (id) => !activeFilteredIds.includes(id),
        );
      }

      return [
        ...new Set([
          ...current,
          ...activeFilteredIds,
        ]),
      ];
    });
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const bulkArchive = async () => {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `Archive ${selectedIds.length} selected link${
        selectedIds.length === 1 ? "" : "s"
      }?`,
    );

    if (!confirmed) return;

    try {
      setBulkWorking(true);
      setError("");
      setMessage("");

      const ids = [...selectedIds];

      await Promise.all(
        ids.map((id) =>
          api.delete(`/links/${id}/`),
        ),
      );

      setLinks((currentLinks) =>
        currentLinks.filter(
          (link) => !ids.includes(link.id),
        ),
      );

      setSelectedIds([]);

      setMessage(
        `${ids.length} link${
          ids.length === 1 ? "" : "s"
        } archived successfully.`,
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
        "Unable to archive the selected links.",
      );
    } finally {
      setBulkWorking(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected link${
        selectedIds.length === 1 ? "" : "s"
      }? The current API archives links when deleted.`,
    );

    if (!confirmed) return;

    await bulkArchive();
  };


  const filteredLinks = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return links.filter((link) => {
      const code = (
        link.custom_alias ||
        link.short_code ||
        ""
      ).toLowerCase();

      const destination = (
        link.original_url ||
        ""
      ).toLowerCase();

      const matchesSearch =
        !query ||
        code.includes(query) ||
        destination.includes(query);

      const active =
        link.is_active !== false &&
        link.is_archived !== true;

      let matchesStatus = true;

      if (statusFilter === "active") {
        matchesStatus = active;
      }

      if (statusFilter === "inactive") {
        matchesStatus = !active;
      }

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    links,
    search,
    statusFilter,
  ]);


  return (
    <div className="dashboard-page">

      <aside className="sidebar">

        <div className="sidebar-brand">
          <span className="sidebar-logo">
            L
          </span>

          <span>LinkSnip</span>
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
            className="sidebar-item active"
          >
            <span>🔗</span>
            My Links
          </button>

          <button className="sidebar-item">
            <span>📊</span>
            Analytics
          </button>

          <button className="sidebar-item">
            <span>✦</span>
            AI Copilot
          </button>

          <button className="sidebar-item">
            <span>🛡</span>
            Security
          </button>

          <button className="sidebar-item">
            <span>⚙</span>
            Settings
          </button>

          <button className="sidebar-item">
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

      <input
        ref={bulkImportInputRef}
        type="file"
        accept="*/*"
        onChange={handleBulkImport}
        style={{ display: "none" }}
      />

      <main className="dashboard-main">

        <header className="dashboard-header">

          <div>
            <span className="dashboard-eyebrow">
              LINK MANAGEMENT
            </span>

            <h1>My Links</h1>

            <p>
              Manage, search and optimize
              all your short links.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="dashboard-create-button"
              onClick={() =>
                bulkImportInputRef.current?.click()
              }
            >
              <span>↥</span>
              Bulk CSV Import
            </button>

            <button
              type="button"
              className="dashboard-create-button"
              onClick={() =>
                navigate("/")
              }
            >
              <span>+</span>
              Create Smart Link
            </button>
          </div>

        </header>


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


        <section className="links-toolbar">

          <div className="search-box">
            <span>⌕</span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search links or destinations..."
            />
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value,
              )
            }
          >
            <option value="all">
              All links
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>
          </select>

          {selectedIds.length > 0 && (
            <div className="bulk-actions">
              <span className="bulk-selection-count">
                {selectedIds.length} selected
              </span>

              <button
                type="button"
                className="bulk-secondary-button"
                onClick={clearSelection}
                disabled={bulkWorking}
              >
                Clear
              </button>

              <button
                type="button"
                className="bulk-secondary-button"
                onClick={bulkDelete}
                disabled={bulkWorking}
              >
                Delete Selected
              </button>

              <button
                type="button"
                className="bulk-primary-button"
                onClick={bulkArchive}
                disabled={bulkWorking}
              >
                {bulkWorking
                  ? "Working..."
                  : "Archive Selected"}
              </button>
            </div>
          )}

        </section>


        <section className="dashboard-card">

          <div className="card-header">

            <div>
              <span className="dashboard-eyebrow">
                {filteredLinks.length} LINKS
              </span>

              <h2>
                Your link library
              </h2>
            </div>

          </div>


          {loading ? (
            <div className="empty-state">
              Loading your links...
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="empty-state">

              <div className="empty-icon">
                🔗
              </div>

              <h3>
                No matching links
              </h3>

              <p>
                Try changing your search
                or create a new smart link.
              </p>

              <button
                className="empty-action"
                onClick={() =>
                  navigate("/")
                }
              >
                Create a link
                <span>→</span>
              </button>

            </div>
          ) : (
            <div className="links-table">

              <div className="table-row table-heading">
                <span className="bulk-check-cell">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    disabled={
                      filteredLinks.length === 0 ||
                      bulkWorking
                    }
                    aria-label="Select all visible links"
                  />
                </span>
                <span>Link</span>
                <span>Destination</span>
                <span>Clicks</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {filteredLinks.map((link) => {
                const publicCode =
                  link.custom_alias ||
                  link.short_code;

                const active =
                  link.is_active !== false &&
                  link.is_archived !== true;

                return (
                  <div
                    className="my-link-row"
                    key={link.id}
                  >

                    <div className="bulk-check-cell">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(
                          link.id,
                        )}
                        onChange={() =>
                          toggleSelected(link.id)
                        }
                        disabled={bulkWorking}
                        aria-label={`Select ${publicCode}`}
                      />
                    </div>

                    <div className="link-name">

                      <div className="link-small-icon">
                        ↗
                      </div>

                      <div>
                        <strong>
                          {publicCode}
                        </strong>

                        <a
                          href={link.short_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open link →
                        </a>
                      </div>

                    </div>

                    <span className="destination">
                      {link.original_url}
                    </span>

                    <strong>
                      {link.click_count || 0}
                    </strong>

                    <span>
                      <span
                        className={
                          active
                            ? "status-pill"
                            : "status-pill inactive"
                        }
                      >
                        {active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </span>

                    <div className="link-actions">

                      <button
                        onClick={() =>
                          openEdit(link)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="archive-action"
                        onClick={() =>
                          archiveLink(link)
                        }
                      >
                        Archive
                      </button>

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </section>

      </main>


      {editingLink && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!saving) {
              closeEdit();
            }
          }}
        >

          <div
            className="create-modal"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >

            <div className="modal-header">

              <div>
                <span>LinkSnip</span>

                <h2>
                  Edit Link
                </h2>

                <p>
                  Update your link settings.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeEdit}
                disabled={saving}
              >
                ×
              </button>

            </div>


            <form
              className="create-form"
              onSubmit={saveEdit}
            >

              <label>
                Destination URL
              </label>

              <input
                type="url"
                value={editUrl}
                onChange={(event) =>
                  setEditUrl(
                    event.target.value,
                  )
                }
                required
              />


              <label>
                Custom alias
                <span>Optional</span>
              </label>

              <input
                type="text"
                value={editAlias}
                onChange={(event) =>
                  setEditAlias(
                    event.target.value,
                  )
                }
              />


              <div className="form-two-columns">

                <div>
                  <label>
                    Click limit
                    <span>Optional</span>
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={editClickLimit}
                    onChange={(event) =>
                      setEditClickLimit(
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <label>
                    Expiration
                    <span>Optional</span>
                  </label>

                  <input
                    type="datetime-local"
                    value={editExpiresAt}
                    onChange={(event) =>
                      setEditExpiresAt(
                        event.target.value,
                      )
                    }
                  />
                </div>

              </div>


              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="modal-create-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes →"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}


export default MyLinks;