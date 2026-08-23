import api from "./api";


// =========================================================
// REGISTER
// =========================================================

export const registerUser = async (
  email,
  password,
) => {
  const response =
    await api.post(
      "/auth/register/",
      {
        email:
          String(email || "")
            .trim()
            .toLowerCase(),

        password,
      },
    );

  return response.data;
};


// =========================================================
// LOGIN
// =========================================================

export const loginUser = async (
  email,
  password,
) => {
  const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  // Clear an old session before creating
  // a new one.
  localStorage.removeItem(
    "access_token",
  );

  localStorage.removeItem(
    "refresh_token",
  );

  localStorage.removeItem(
    "user_email",
  );

  const response =
    await api.post(
      "/auth/login/",
      {
        email:
          normalizedEmail,
        password,
      },
    );

  const accessToken =
    response.data?.access;

  const refreshToken =
    response.data?.refresh;

  if (!accessToken) {
    throw new Error(
      "Login succeeded but no access token was returned.",
    );
  }

  localStorage.setItem(
    "access_token",
    accessToken,
  );

  if (refreshToken) {
    localStorage.setItem(
      "refresh_token",
      refreshToken,
    );
  }

  localStorage.setItem(
    "user_email",
    response.data?.email ||
      normalizedEmail,
  );

  return response.data;
};


// =========================================================
// LOGOUT
// =========================================================

export const logoutUser = () => {
  localStorage.removeItem(
    "access_token",
  );

  localStorage.removeItem(
    "refresh_token",
  );

  localStorage.removeItem(
    "user_email",
  );
};


// =========================================================
// LOGIN CHECK
// =========================================================

export const isLoggedIn = () => {
  return Boolean(
    localStorage.getItem(
      "access_token",
    ),
  );
};