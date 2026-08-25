import axios from "axios";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api"
).replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// =========================================================
// REQUEST INTERCEPTOR
// =========================================================

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("access_token");

    // -----------------------------------------------------
    // AUTHORIZATION
    // -----------------------------------------------------

    if (token) {
      config.headers =
        config.headers || {};

      if (
        typeof config.headers.set === "function"
      ) {
        config.headers.set(
          "Authorization",
          `Bearer ${token}`,
        );
      } else {
        config.headers.Authorization =
          `Bearer ${token}`;
      }
    }

    // -----------------------------------------------------
    // CONTENT TYPE
    // -----------------------------------------------------
    //
    // IMPORTANT:
    // FormData requests MUST NOT have a manually
    // assigned Content-Type.
    //
    // The browser will automatically generate:
    //
    // multipart/form-data; boundary=...
    //
    // For normal JSON requests we explicitly use:
    //
    // application/json
    // -----------------------------------------------------

    const isFormData =
      typeof FormData !== "undefined" &&
      config.data instanceof FormData;

    if (isFormData) {
      if (
        typeof config.headers.delete ===
        "function"
      ) {
        config.headers.delete(
          "Content-Type",
        );
      } else {
        delete config.headers[
          "Content-Type"
        ];

        delete config.headers[
          "content-type"
        ];
      }
    } else {
      if (
        typeof config.headers.set ===
        "function"
      ) {
        config.headers.set(
          "Content-Type",
          "application/json",
        );
      } else {
        config.headers[
          "Content-Type"
        ] = "application/json";
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// =========================================================
// RESPONSE INTERCEPTOR
// =========================================================

let refreshPromise = null;

api.interceptors.response.use(
  (response) => {
    return response;
  },

  async (error) => {
    const originalRequest =
      error.config;

    const status =
      error.response?.status;

    console.error(
      "API ERROR:",
      status,
      error.response?.data,
      error.message,
    );

    // -----------------------------------------------------
    // TOKEN REFRESH
    // -----------------------------------------------------

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes(
        "/auth/login/",
      ) &&
      !originalRequest.url?.includes(
        "/auth/token/refresh/",
      )
    ) {
      originalRequest._retry = true;

      const refreshToken =
        localStorage.getItem(
          "refresh_token",
        );

      if (!refreshToken) {
        localStorage.removeItem(
          "access_token",
        );

        localStorage.removeItem(
          "refresh_token",
        );

        localStorage.removeItem(
          "user_email",
        );

        return Promise.reject(error);
      }

      try {
        // -------------------------------------------------
        // PREVENT MULTIPLE REFRESH REQUESTS
        // -------------------------------------------------

        if (!refreshPromise) {
          refreshPromise = axios.post(
            `${API_BASE_URL}/auth/token/refresh/`,
            {
              refresh: refreshToken,
            },
            {
              headers: {
                "Content-Type":
                  "application/json",
              },
              timeout: 10000,
            },
          );
        }

        const refreshResponse =
          await refreshPromise;

        refreshPromise = null;

        const newAccessToken =
          refreshResponse.data?.access;

        if (!newAccessToken) {
          throw new Error(
            "Refresh succeeded but no access token was returned.",
          );
        }

        localStorage.setItem(
          "access_token",
          newAccessToken,
        );

        originalRequest.headers =
          originalRequest.headers || {};

        if (
          typeof originalRequest.headers
            .set === "function"
        ) {
          originalRequest.headers.set(
            "Authorization",
            `Bearer ${newAccessToken}`,
          );
        } else {
          originalRequest.headers.Authorization =
            `Bearer ${newAccessToken}`;
        }

        // -------------------------------------------------
        // IMPORTANT FOR FORMDATA RETRY
        // -------------------------------------------------

        const isFormData =
          typeof FormData !== "undefined" &&
          originalRequest.data instanceof
            FormData;

        if (isFormData) {
          if (
            typeof originalRequest.headers
              .delete === "function"
          ) {
            originalRequest.headers.delete(
              "Content-Type",
            );
          } else {
            delete originalRequest.headers[
              "Content-Type"
            ];

            delete originalRequest.headers[
              "content-type"
            ];
          }
        }

        return api(
          originalRequest,
        );
      } catch (refreshError) {
        refreshPromise = null;

        console.error(
          "Token refresh failed:",
          refreshError.response?.data ||
            refreshError.message,
        );

        localStorage.removeItem(
          "access_token",
        );

        localStorage.removeItem(
          "refresh_token",
        );

        localStorage.removeItem(
          "user_email",
        );

        return Promise.reject(
          refreshError,
        );
      }
    }

    return Promise.reject(error);
  },
);

// =========================================================
// PUBLIC SHORT LINK CREATION
// =========================================================

export const createShortLink = async (
  originalUrl,
) => {
  const response = await axios.post(
    `${API_BASE_URL}/links/`,
    {
      original_url: originalUrl,
    },
    {
      headers: {
        "Content-Type":
          "application/json",
      },
      timeout: 15000,
    },
  );

  return response.data;
};

// =========================================================
// DEFAULT API
// =========================================================

export default api;