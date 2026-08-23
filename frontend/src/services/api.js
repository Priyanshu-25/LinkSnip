import axios from "axios";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api"
).replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});


// =========================================================
// REQUEST INTERCEPTOR
// =========================================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(
      "access_token",
    );

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
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
    // Only attempt refresh once.
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
          "user_email",
        );

        return Promise.reject(error);
      }

      try {
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

        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;

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
      original_url:
        originalUrl,
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