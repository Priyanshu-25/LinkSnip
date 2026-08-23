import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";
import { logoutUser } from "../services/auth";


function MyLinks() {
  const navigate = useNavigate();

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkWorking, setBulkWorking] = useState(false);

  // Bulk CSV import
  const [bulkImportWorking, setBulkImportWorking] =
    useState(false);
  const bulkImportInputRef = useRef(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [copiedId, setCopiedId] = useState(null);

  // Edit
  const [showEdit, setShowEdit] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [editUrl, setEditUrl] = useState("");
  const [editAlias, setEditAlias] = useState("");
  const [editClickLimit, setEditClickLimit] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editRedirectType, setEditRedirectType] = useState("302");
  const [editActive, setEditActive] = useState(true);

  // Organization
  const [editFolder, setEditFolder] = useState("");
  const [editTags, setEditTags] = useState("");

  // Password editing
  const [editPasswordProtected, setEditPasswordProtected] =
    useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] =
    useState(false);

  // QR
  const [showQR, setShowQR] = useState(false);
  const [qrLink, setQrLink] = useState(null);

  const email =
    localStorage.getItem("user_email") ||
    "LinkSnip User";


  // =====================================================
  // LOAD LINKS
  // =====================================================

  const loadLinks = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/links/");
      setLinks(response.data);
    } catch (requestError) {
      console.error(requestError);

      if (requestError.response?.status === 401) {
        logoutUser();
        navigate("/login");
        return;
      }

      setError("Unable to load your links.");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadLinks();
  }, []);


  // =====================================================
  // ORGANIZATION HELPERS
  // =====================================================

  const availableFolders = useMemo(() => {
    const folders = links
      .map((link) => (link.folder || "").trim())
      .filter(Boolean);

    return [...new Set(folders)].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [links]);

  const normalizeTags = (tags) => {
    if (!Array.isArray(tags)) {
      return [];
    }

    return tags
      .map((tag) => String(tag).trim())
      .filter(Boolean);
  };


  // =====================================================
  // FILTER
  // =====================================================

  const filteredLinks = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = links.filter((link) => {
      const shortName = (
        link.custom_alias ||
        link.short_code ||
        ""
      ).toLowerCase();

      const originalUrl = (
        link.original_url ||
        ""
      ).toLowerCase();

      const tagsText = normalizeTags(link.tags)
        .join(" ")
        .toLowerCase();

      const folderName = (link.folder || "")
        .trim()
        .toLowerCase();

      const matchesSearch =
        !query ||
        shortName.includes(query) ||
        originalUrl.includes(query) ||
        folderName.includes(query) ||
        tagsText.includes(query);

      if (!matchesSearch) {
        return false;
      }

      if (filter === "active") {
        return (
          link.is_active &&
          !link.is_archived
        );
      }

      if (filter === "archived") {
        return Boolean(link.is_archived);
      }

      if (folderFilter !== "all") {
        return (
          (link.folder || "").trim() ===
          folderFilter
        );
      }

      return true;
    });

    return [...result].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return (
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
          );

        case "clicks-high":
          return (
            Number(b.click_count || 0) -
            Number(a.click_count || 0)
          );

        case "clicks-low":
          return (
            Number(a.click_count || 0) -
            Number(b.click_count || 0)
          );

        case "name":
          return (
            (
              a.custom_alias ||
              a.short_code ||
              ""
            ).localeCompare(
              b.custom_alias ||
              b.short_code ||
              "",
              undefined,
              { sensitivity: "base" },
            )
          );

        case "newest":
        default:
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
      }
    });
  }, [
    links,
    search,
    filter,
    folderFilter,
    sort,
  ]);

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) =>
        links.some((link) => link.id === id),
      ),
    );
  }, [links]);


  // =====================================================
  // SHORT URL
  // =====================================================

  const getShortUrl = (link) => {
    const code =
      link.custom_alias ||
      link.short_code;

    return (
      link.short_url ||
      `http://127.0.0.1:8000/${code}/`
    );
  };


  // =====================================================
  // COPY
  // =====================================================

  const copyLink = async (link) => {
    try {
      await navigator.clipboard.writeText(
        getShortUrl(link),
      );

      setCopiedId(link.id);
      setSuccess("Link copied.");

      setTimeout(() => {
        setCopiedId(null);
        setSuccess("");
      }, 1800);
    } catch (copyError) {
      console.error(copyError);
      setError("Unable to copy the link.");
    }
  };


  // =====================================================
  // OPEN
  // =====================================================

  const openLink = (link) => {
    window.open(
      getShortUrl(link),
      "_blank",
      "noopener,noreferrer",
    );
  };


  // =====================================================
  // ANALYTICS
  // =====================================================

  const openAnalytics = (link) => {
    navigate(`/analytics?link=${link.id}`);
  };


  // =====================================================
  // QR
  // =====================================================

  const openQR = (link) => {
    setQrLink(link);
    setShowQR(true);
    setError("");
    setSuccess("");
  };


  const closeQR = () => {
    setShowQR(false);
    setQrLink(null);
  };


  const downloadQR = () => {
    if (!qrLink) {
      return;
    }

    const canvas = document.getElementById(
      `qr-code-${qrLink.id}`,
    );

    if (!canvas) {
      setError(
        "Unable to generate the QR image.",
      );
      return;
    }

    const downloadLink =
      document.createElement("a");

    downloadLink.download =
      `${qrLink.custom_alias || qrLink.short_code}-qr.png`;

    downloadLink.href =
      canvas.toDataURL("image/png");

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    setSuccess(
      "QR code downloaded successfully.",
    );
  };


  // =====================================================
  // OPEN EDIT
  // =====================================================

  const openEdit = (link) => {
    setEditingLink(link);

    setEditUrl(link.original_url || "");
    setEditAlias(link.custom_alias || "");

    setEditRedirectType(
      String(link.redirect_type ?? 302),
    );

    setEditClickLimit(
      link.click_limit === null ||
      link.click_limit === undefined
        ? ""
        : String(link.click_limit),
    );

    setEditActive(
      link.is_active !== false &&
      link.is_archived !== true,
    );

    setEditFolder(link.folder || "");
    setEditTags(normalizeTags(link.tags).join(", "));

    setEditPasswordProtected(
      link.is_password_protected === true,
    );

    setEditPassword("");
    setShowEditPassword(false);

    if (link.expires_at) {
      const date = new Date(link.expires_at);

      if (!Number.isNaN(date.getTime())) {
        const localValue =
          new Date(
            date.getTime() -
              date.getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16);

        setEditExpiresAt(localValue);
      } else {
        setEditExpiresAt("");
      }
    } else {
      setEditExpiresAt("");
    }

    setError("");
    setSuccess("");
    setShowEdit(true);
  };


  // =====================================================
  // CLOSE EDIT
  // =====================================================

  const closeEdit = () => {
    if (savingEdit) {
      return;
    }

    setShowEdit(false);
    setEditingLink(null);

    setEditPassword("");
    setShowEditPassword(false);
    setEditFolder("");
    setEditTags("");
  };


  // =====================================================
  // SAVE EDIT
  // =====================================================

  const handleSaveEdit = async (event) => {
    event.preventDefault();

    if (!editingLink) {
      return;
    }

    setError("");
    setSuccess("");


    if (
      editPasswordProtected &&
      !editingLink.is_password_protected &&
      !editPassword.trim()
    ) {
      setError(
        "Please enter a password for this protected link.",
      );
      return;
    }


    if (
      editPasswordProtected &&
      editPassword.trim() &&
      editPassword.trim().length < 4
    ) {
      setError(
        "Password must be at least 4 characters.",
      );
      return;
    }


    try {
      setSavingEdit(true);


      const payload = {
        original_url: editUrl.trim(),
        is_active: editActive,
        is_password_protected:
          editPasswordProtected,
        redirect_type: Number(
          editRedirectType,
        ),
      };


      if (editAlias.trim()) {
        payload.custom_alias =
          editAlias.trim();
      } else {
        payload.custom_alias = null;
      }


      if (editClickLimit) {
        payload.click_limit =
          Number(editClickLimit);
      } else {
        payload.click_limit = null;
      }


      if (editExpiresAt) {
        payload.expires_at =
          new Date(
            editExpiresAt,
          ).toISOString();
      } else {
        payload.expires_at = null;
      }

      payload.folder = editFolder.trim();

      payload.tags = editTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .filter(
          (tag, index, array) =>
            array.findIndex(
              (item) =>
                item.toLowerCase() === tag.toLowerCase(),
            ) === index,
        )
        .slice(0, 10);

      // Only send password when the user
      // wants to set/change one.
      //
      // When protection is turned off,
      // the serializer will clear the hash.
      if (
        editPasswordProtected &&
        editPassword.trim()
      ) {
        payload.password =
          editPassword.trim();
      }


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


      setShowEdit(false);
      setEditingLink(null);
      setEditPassword("");
      setShowEditPassword(false);
      setEditFolder("");
      setEditTags("");

      setSuccess(
        editPasswordProtected
          ? editPassword.trim()
            ? "Link updated and password changed successfully."
            : "Link updated successfully."
          : "Link updated and password protection removed.",
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

      const backendError =
        requestError.response?.data;

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

setError(
  generalError ||
    (
      !nextFieldErrors.url &&
      !nextFieldErrors.alias &&
      !nextFieldErrors.clickLimit &&
      !nextFieldErrors.expiresAt &&
      !nextFieldErrors.password &&
      !nextFieldErrors.redirectType
    )
      ? "Unable to create the link."
      : "",
);

    } finally {
      setSavingEdit(false);
    }
  };


  // =====================================================
  // ARCHIVE
  // =====================================================

  const archiveLink = async (link) => {
    const name =
      link.custom_alias ||
      link.short_code;

    const confirmed =
      window.confirm(
        `Archive "${name}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.delete(
        `/links/${link.id}/`,
      );

      setLinks((currentLinks) =>
        currentLinks.map(
          (currentLink) =>
            currentLink.id === link.id
              ? {
                  ...currentLink,
                  is_archived: true,
                  is_active: false,
                }
              : currentLink,
        ),
      );

      setSuccess(
        "Link archived successfully.",
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
        "Unable to archive this link.",
      );
    }
  };


  // =====================================================
  // BULK SELECTION
  // =====================================================

  const visibleIds = filteredLinks.map(
    (link) => link.id,
  );

  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) =>
      selectedIds.includes(id),
    );

  const toggleSelected = (linkId) => {
    setSelectedIds((current) =>
      current.includes(linkId)
        ? current.filter((id) => id !== linkId)
        : [...current, linkId],
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter(
          (id) => !visibleIds.includes(id),
        );
      }

      return [
        ...new Set([
          ...current,
          ...visibleIds,
        ]),
      ];
    });
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // =====================================================
  // BULK CSV IMPORT
  // =====================================================

  const handleBulkImport = async (event) => {
    const file = event.target.files?.[0];

    // Allow selecting the same file again later.
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("CSV file must be 2 MB or smaller.");
      return;
    }

    try {
      setBulkImportWorking(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post(
        "/links/bulk-import/",
        formData,
      );

      const data = response.data || {};

      await loadLinks();

      if ((data.failed || 0) > 0) {
        setError(
          `${data.created || 0} created, ${data.failed} row${
            data.failed === 1 ? "" : "s"
          } rejected.`,
        );
      } else {
        setSuccess(
          `${data.created || 0} link${
            data.created === 1 ? "" : "s"
          } imported successfully.`,
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

      const backendError =
        requestError.response?.data;

      setError(
        backendError?.detail ||
          "Unable to import the CSV file.",
      );
    } finally {
      setBulkImportWorking(false);
    }
  };

  const bulkArchive = async () => {
    if (selectedIds.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Archive ${selectedIds.length} selected link${
        selectedIds.length === 1 ? "" : "s"
      }?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setBulkWorking(true);
      setError("");
      setSuccess("");

      const ids = [...selectedIds];

      await Promise.all(
        ids.map((id) =>
          api.delete(`/links/${id}/`),
        ),
      );

      setLinks((currentLinks) =>
        currentLinks.map((link) =>
          ids.includes(link.id)
            ? {
                ...link,
                is_archived: true,
                is_active: false,
              }
            : link,
        ),
      );

      setSelectedIds([]);

      setSuccess(
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
    if (selectedIds.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${selectedIds.length} selected link${
        selectedIds.length === 1 ? "" : "s"
      }? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setBulkWorking(true);
      setError("");
      setSuccess("");

      const ids = [...selectedIds];

      await Promise.all(
        ids.map((id) =>
          api.delete(
            `/links/${id}/permanent-delete/`,
          ),
        ),
      );

      setLinks((currentLinks) =>
        currentLinks.filter(
          (link) => !ids.includes(link.id),
        ),
      );

      setSelectedIds([]);

      setSuccess(
        `${ids.length} link${
          ids.length === 1 ? "" : "s"
        } permanently deleted.`,
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

      const backendError =
        requestError.response?.data;

      setError(
        backendError?.detail ||
          "Unable to permanently delete the selected links.",
      );
    } finally {
      setBulkWorking(false);
    }
  };


  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };


  return (
    <div className="dashboard-page">

      <style>{`
        .edit-link-modal-compact {
          width: min(700px, 92vw);
          box-sizing: border-box;
        }

        .edit-link-modal-compact .modal-header {
          padding-bottom: 8px;
          margin-bottom: 8px;
        }

        .edit-link-modal-compact .modal-header h2 {
          margin: 2px 0;
          font-size: 20px;
        }

        .edit-link-modal-compact .modal-header p {
          margin: 0;
          font-size: 9px;
          line-height: 1.35;
        }

        .edit-link-form {
          gap: 7px;
        }

        .edit-link-form > label {
          margin-bottom: 2px;
        }

        .edit-link-form > input {
          min-height: 36px;
          height: 36px;
          padding: 8px 10px;
          box-sizing: border-box;
        }

        .edit-link-form .organization-form-row {
          display: grid;
          grid-template-columns: 0.9fr 1.35fr;
          gap: 10px;
          align-items: start;
        }

        .edit-link-form .organization-field {
          min-width: 0;
        }

        .edit-link-form .organization-field label {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 3px;
        }

        .edit-link-form .organization-field input {
          width: 100%;
          min-height: 36px;
          height: 36px;
          padding: 8px 10px;
          box-sizing: border-box;
        }

        .edit-link-form .organization-help {
          margin-top: 3px;
          margin-bottom: 0;
          font-size: 8px;
          line-height: 1.2;
        }

        .edit-link-form .form-two-columns {
          gap: 10px;
        }

        .edit-link-form .form-two-columns input {
          min-height: 36px;
          height: 36px;
          box-sizing: border-box;
        }

        .edit-link-form .security-form-section {
          padding: 8px 10px;
          margin-top: 1px;
        }

        .edit-link-form .security-form-help {
          margin: 3px 0 0;
          font-size: 8px;
          line-height: 1.25;
        }

        .edit-link-form .edit-active-row {
          min-height: 30px;
        }

        .edit-link-form .edit-status-text {
          margin-top: -2px;
          font-size: 8px;
          line-height: 1.25;
        }

        .edit-link-form .modal-actions {
          margin-top: 4px;
          padding-top: 6px;
          gap: 8px;
        }

        @media (max-width: 700px) {
          .edit-link-modal-compact {
            width: 94vw;
          }

          .edit-link-form .organization-form-row,
          .edit-link-form .form-two-columns {
            grid-template-columns: 1fr;
          }
        }

        .links-table {
          width: 100%;
          overflow-x: hidden;
        }

        .links-table .my-link-row,
        .links-table .table-heading {
          width: 100% !important;
        }

        .links-table .link-name {
          min-width: 0;
          overflow: hidden;
        }

        .links-table .link-name > div:last-child {
          min-width: 0;
          overflow: hidden;
        }

        .links-table .link-name strong,
        .links-table .link-name a {
          display: block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 1200px) {
          .links-table .my-link-row,
          .links-table .table-heading {
            grid-template-columns:
              32px
              minmax(130px, 1fr)
              minmax(160px, 1.25fr)
              42px
              minmax(105px, 0.8fr)
              58px
              minmax(145px, 1.2fr) !important;
            gap: 8px !important;
          }

          .links-table .link-actions button {
            padding: 6px 8px !important;
            font-size: 8px !important;
          }
        }

        @media (max-width: 900px) {
          .links-table {
            overflow-x: auto;
          }

          .links-table .my-link-row,
          .links-table .table-heading {
            min-width: 930px;
          }
        }

      `}</style>

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
              LINK MANAGEMENT
            </span>

            <h1>
              My Links
            </h1>

            <p>
              Create, manage, analyze and
              organize all your short links.
            </p>

          </div>


          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <input
              ref={bulkImportInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleBulkImport}
              style={{ display: "none" }}
            />

            <button
              type="button"
              className="dashboard-create-button"
              onClick={() =>
                bulkImportInputRef.current?.click()
              }
              disabled={bulkImportWorking}
              style={{
                background: "#ffffff",
                color: "#2563eb",
                border: "1px solid #bfdbfe",
                boxShadow: "none",
              }}
            >
              <span>⇧</span>
              {bulkImportWorking
                ? "Importing..."
                : "Bulk CSV Import"}
            </button>

            <button
              className="dashboard-create-button"
              onClick={() =>
                navigate("/dashboard")
              }
            >
              <span>+</span>
              Create Link
            </button>
          </div>

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


        {/* =================================
            TOOLBAR
        ================================= */}

        <div className="links-toolbar">

          <div className="search-box">

            <span>
              🔎
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search links..."
            />

          </div>


          <select
            className="filter-select"
            value={filter}
            onChange={(event) =>
              setFilter(
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

            <option value="archived">
              Archived
            </option>
          </select>


          <select
            className="filter-select"
            value={sort}
            onChange={(event) =>
              setSort(event.target.value)
            }
          >
            <option value="newest">
              Newest first
            </option>

            <option value="oldest">
              Oldest first
            </option>

            <option value="clicks-high">
              Most clicks
            </option>

            <option value="clicks-low">
              Least clicks
            </option>

            <option value="name">
              Name A-Z
            </option>
          </select>

          {selectedIds.length > 0 && (
            <div
              className="bulk-actions"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginLeft: "auto",
                flexWrap: "wrap",
              }}
            >
              <span
                className="bulk-selection-count"
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#334155",
                  whiteSpace: "nowrap",
                }}
              >
                {selectedIds.length} selected
              </span>

              <button
                type="button"
                className="bulk-secondary-button"
                onClick={clearSelection}
                disabled={bulkWorking}
                style={{
                  padding: "9px 12px",
                  border: "1px solid #dbe5f0",
                  borderRadius: "9px",
                  background: "#ffffff",
                  color: "#475569",
                  fontSize: "10px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Clear Selection
              </button>

              <button
                type="button"
                className="bulk-secondary-button"
                onClick={bulkDelete}
                disabled={bulkWorking}
                style={{
                  padding: "9px 12px",
                  border: "1px solid #dbe5f0",
                  borderRadius: "9px",
                  background: "#ffffff",
                  color: "#475569",
                  fontSize: "10px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Delete Selected
              </button>

              <button
                type="button"
                className="bulk-primary-button"
                onClick={bulkArchive}
                disabled={bulkWorking}
                style={{
                  padding: "9px 12px",
                  border: "1px solid #2563eb",
                  borderRadius: "9px",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {bulkWorking
                  ? "Working..."
                  : "Archive Selected"}
              </button>
            </div>
          )}

        </div>


        {/* =================================
            TABLE
        ================================= */}

        <section className="dashboard-card">

          <div className="card-header">

            <div>
              <span className="dashboard-eyebrow">
                YOUR LINKS
              </span>

              <h2>
                {filteredLinks.length}{" "}
                {filteredLinks.length === 1
                  ? "link"
                  : "links"}
              </h2>
            </div>


            <button
              className="view-all-button"
              onClick={loadLinks}
            >
              ↻ Refresh
            </button>

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
                No links found
              </h3>

              <p>
                Try another search or create
                your first smart link.
              </p>

              <button
                className="empty-action"
                onClick={() =>
                  navigate("/dashboard")
                }
              >
                Create a link
              </button>

            </div>

          ) : (

            <div className="links-table">

              <div
                className="my-link-row table-heading"
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns:
                    "34px minmax(145px, 1.1fr) minmax(180px, 1.45fr) 0.45fr minmax(120px, 0.8fr) 0.55fr minmax(170px, 1.35fr)",
                  alignItems: "center",
                  gap: "12px",
                }}
              >

                <span
                  className="bulk-check-cell"
                  style={{
                    width: "34px",
                    minWidth: "34px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    disabled={
                      filteredLinks.length === 0 ||
                      bulkWorking
                    }
                    aria-label="Select all visible links"
                    style={{
                      appearance: "auto",
                      WebkitAppearance: "auto",
                      display: "block",
                      width: "17px",
                      height: "17px",
                      minWidth: "17px",
                      minHeight: "17px",
                      margin: 0,
                      opacity: 1,
                      visibility: "visible",
                      cursor: "pointer",
                      accentColor: "#2563eb",
                    }}
                  />
                </span>

                <span>LINK</span>
                <span>DESTINATION</span>
                <span>CLICKS</span>
                <span>ORGANIZATION</span>
                <span>STATUS</span>
                <span>ACTIONS</span>

              </div>


              {filteredLinks.map((link) => {

                const shortName =
                  link.custom_alias ||
                  link.short_code;


                return (

                  <div
                    className="my-link-row"
                    key={link.id}
                    style={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns:
                        "34px minmax(145px, 1.1fr) minmax(180px, 1.45fr) 0.45fr minmax(120px, 0.8fr) 0.55fr minmax(170px, 1.35fr)",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >

                    <div
                      className="bulk-check-cell"
                      style={{
                        width: "34px",
                        minWidth: "34px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(
                          link.id,
                        )}
                        onChange={() =>
                          toggleSelected(link.id)
                        }
                        disabled={bulkWorking}
                        aria-label={`Select ${shortName}`}
                        style={{
                          appearance: "auto",
                          WebkitAppearance: "auto",
                          display: "block",
                          width: "17px",
                          height: "17px",
                          minWidth: "17px",
                          minHeight: "17px",
                          margin: 0,
                          opacity: 1,
                          visibility: "visible",
                          cursor: "pointer",
                          accentColor: "#2563eb",
                        }}
                      />
                    </div>

                    <div className="link-name">

                      <div className="link-small-icon">
                        {link.is_password_protected
                          ? "🔐"
                          : "↗"}
                      </div>


                      <div>

                        <strong>
                          {shortName}
                        </strong>

                        <a
                          href={getShortUrl(link)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {getShortUrl(link)}
                        </a>

                      </div>

                    </div>


                    <div
                      className="destination"
                      style={{
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {link.original_url}
                    </div>


                    <div>
                      {link.click_count ?? 0}
                    </div>

                    <div
                      className="link-organization"
                      style={{
                        minWidth: 0,
                        maxWidth: "100%",
                        overflow: "hidden",
                      }}
                    >
                      {link.folder ? (
                        <span className="folder-badge">
                          {link.folder}
                        </span>
                      ) : (
                        <span className="folder-empty">
                          No folder
                        </span>
                      )}

                      {normalizeTags(link.tags).length > 0 && (
                        <div className="link-tag-list">
                          {normalizeTags(link.tags).slice(0, 3).map((tag) => (
                            <span className="tag-badge" key={`${link.id}-${tag}`}>
                              {tag}
                            </span>
                          ))}

                          {normalizeTags(link.tags).length > 3 && (
                            <span className="tag-more-badge">
                              +{normalizeTags(link.tags).length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>


                    <div>

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

                    </div>


                    <div
                      className="link-actions"
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        gap: "6px",
                        minWidth: 0,
                        width: "100%",
                      }}
                    >

                      <button
                        style={{
                          padding: "7px 9px",
                          fontSize: "9px",
                          whiteSpace: "nowrap",
                          flex: "0 0 auto",
                        }}
                        onClick={() =>
                          copyLink(link)
                        }
                      >
                        {copiedId === link.id
                          ? "Copied"
                          : "Copy"}
                      </button>


                      <button
                        style={{
                          padding: "7px 9px",
                          fontSize: "9px",
                          whiteSpace: "nowrap",
                          flex: "0 0 auto",
                        }}
                        onClick={() =>
                          openLink(link)
                        }
                      >
                        Open
                      </button>


                      <button
                        style={{
                          padding: "7px 9px",
                          fontSize: "9px",
                          whiteSpace: "nowrap",
                          flex: "0 0 auto",
                        }}
                        onClick={() =>
                          openAnalytics(link)
                        }
                      >
                        Analytics
                      </button>


                      <button
                        style={{
                          padding: "7px 9px",
                          fontSize: "9px",
                          whiteSpace: "nowrap",
                          flex: "0 0 auto",
                        }}
                        onClick={() =>
                          openQR(link)
                        }
                      >
                        QR
                      </button>


                      {!link.is_archived && (
                        <button
                          style={{
                            padding: "7px 9px",
                            fontSize: "9px",
                            whiteSpace: "nowrap",
                            flex: "0 0 auto",
                          }}
                          onClick={() =>
                            openEdit(link)
                          }
                        >
                          Edit
                        </button>
                      )}


                      {!link.is_archived && (
                        <button
                          className="archive-action"
                          style={{
                            padding: "7px 9px",
                            fontSize: "9px",
                            whiteSpace: "nowrap",
                            flex: "0 0 auto",
                          }}
                          onClick={() =>
                            archiveLink(link)
                          }
                        >
                          Archive
                        </button>
                      )}

                    </div>

                  </div>

                );
              })}

            </div>
          )}

        </section>

      </main>


      {/* =====================================
          EDIT MODAL
      ===================================== */}

      {showEdit && editingLink && (

        <div
          className="modal-overlay"
          onClick={closeEdit}
        >

          <div
            className="create-modal edit-link-modal edit-link-modal-compact"
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
                  Edit Link
                </h2>

                <p>
                  Update your destination,
                  controls and security.
                </p>

              </div>


              <button
                className="modal-close"
                onClick={closeEdit}
                disabled={savingEdit}
              >
                ×
              </button>

            </div>


            <form
              className="create-form edit-link-form"
              onSubmit={handleSaveEdit}
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
                <span>
                  Optional
                </span>
              </label>

              <input
                type="text"
                value={editAlias}
                onChange={(event) =>
                  setEditAlias(
                    event.target.value,
                  )
                }
                placeholder="summer-sale"
              />


              <div className="organization-form-row">

                <div className="organization-field">
                  <label>
                    Folder
                    <span>Optional</span>
                  </label>

                  <input
                    type="text"
                    value={editFolder}
                    onChange={(event) =>
                      setEditFolder(event.target.value)
                    }
                    placeholder="Marketing"
                    maxLength={50}
                  />
                </div>

                <div className="organization-field">
                  <label>
                    Tags
                    <span>Optional • comma separated</span>
                  </label>

                  <input
                    type="text"
                    value={editTags}
                    onChange={(event) =>
                      setEditTags(event.target.value)
                    }
                    placeholder="campaign, social, summer"
                  />

                  <div className="organization-help">
                    Up to 10 tags.
                  </div>
                </div>

              </div>


              <div className="form-two-columns">

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
                    value={editClickLimit}
                    onChange={(event) =>
                      setEditClickLimit(
                        event.target.value,
                      )
                    }
                    placeholder="100"
                  />

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
                    value={editExpiresAt}
                    onChange={(event) =>
                      setEditExpiresAt(
                        event.target.value,
                      )
                    }
                  />

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
                    value={editRedirectType}
                    onChange={(event) =>
                      setEditRedirectType(
                        event.target.value,
                      )
                    }
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
                    302 is recommended for editable
                    destinations.
                  </p>
                </div>
              </div>


              {/* PASSWORD PROTECTION */}

              <div className="security-form-section">

                <label className="security-checkbox-row">

                  <input
                    type="checkbox"
                    checked={
                      editPasswordProtected
                    }
                    onChange={(event) => {
                      const enabled =
                        event.target.checked;

                      setEditPasswordProtected(
                        enabled,
                      );

                      if (!enabled) {
                        setEditPassword("");
                        setShowEditPassword(false);
                      }
                    }}
                  />

                  <span>
                    🔐 Password protect this link
                  </span>

                </label>


                {editPasswordProtected && (

                  <div className="password-input-wrapper">

                    <input
                      type={
                        showEditPassword
                          ? "text"
                          : "password"
                      }
                      value={editPassword}
                      onChange={(event) =>
                        setEditPassword(
                          event.target.value,
                        )
                      }
                      placeholder={
                        editingLink.is_password_protected
                          ? "Enter new password (optional)"
                          : "Enter a secure password"
                      }
                      minLength={4}
                      required={
                        !editingLink.is_password_protected
                      }
                    />


                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowEditPassword(
                          (current) =>
                            !current,
                        )
                      }
                    >
                      {showEditPassword
                        ? "Hide"
                        : "Show"}
                    </button>

                  </div>

                )}


                <p className="security-form-help">

                  {editPasswordProtected
                    ? editingLink.is_password_protected
                      ? "Leave the password blank to keep the current password."
                      : "Visitors must enter this password before opening the link."
                    : "Turning this off removes password protection from the link."}

                </p>

              </div>


              {/* ACTIVE STATUS */}

              <label className="edit-active-row">

                <span>
                  Link status
                </span>

                <button
                  type="button"
                  className={
                    editActive
                      ? "toggle-button active"
                      : "toggle-button"
                  }
                  onClick={() =>
                    setEditActive(
                      (current) =>
                        !current,
                    )
                  }
                >
                  <span />
                </button>

              </label>


              <div className="edit-status-text">

                {editActive
                  ? "Link is active and can receive clicks."
                  : "Link is inactive and will not redirect."}

              </div>


              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeEdit}
                  disabled={savingEdit}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="modal-create-button"
                  disabled={savingEdit}
                >
                  {savingEdit
                    ? "Saving..."
                    : "Save Changes →"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =====================================
          QR MODAL
      ===================================== */}

      {showQR && qrLink && (

        <div
          className="modal-overlay"
          onClick={closeQR}
        >

          <div
            className="qr-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="qr-modal-header">

              <div>

                <span>
                  LinkSnip
                </span>

                <h2>
                  QR Code
                </h2>

                <p>
                  Scan this code to open your
                  LinkSnip short link.
                </p>

              </div>


              <button
                className="modal-close"
                onClick={closeQR}
              >
                ×
              </button>

            </div>


            <div className="qr-preview">

              <div className="qr-canvas-wrapper">

                <QRCodeCanvas
                  id={`qr-code-${qrLink.id}`}
                  value={getShortUrl(qrLink)}
                  size={240}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  level="H"
                  includeMargin
                />

              </div>


              <strong>
                {qrLink.custom_alias ||
                  qrLink.short_code}
              </strong>


              <a
                href={getShortUrl(qrLink)}
                target="_blank"
                rel="noreferrer"
              >
                {getShortUrl(qrLink)}
              </a>

            </div>


            <div className="qr-modal-actions">

              <button
                type="button"
                className="cancel-button"
                onClick={closeQR}
              >
                Close
              </button>


              <button
                type="button"
                className="modal-create-button"
                onClick={downloadQR}
              >
                Download QR ↓
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}


export default MyLinks;