import { apiRequest, setAuthRefreshHandler } from "./http";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  name: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export const ACCESS_TOKEN_KEY = "workload_access_token";
export const REFRESH_TOKEN_KEY = "workload_refresh_token";

export const saveAuthTokens = (tokens: AuthTokens) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

export const clearAuthTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const isAuthenticated = () => Boolean(getAccessToken());

export const register = async (payload: RegisterPayload) =>
  apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const login = async (payload: LoginPayload) =>
  apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const refresh = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("Refresh token is missing");
  }

  return apiRequest<AuthTokens>(
    "/api/auth/refresh",
    {
      method: "POST"
    },
    refreshToken,
    { skipAuthRefresh: true }
  );
};

export const me = async () => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("Access token is missing");
  }

  return apiRequest<AuthUser>("/api/auth/me", {}, accessToken);
};

export const logout = async () => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    clearAuthTokens();
    return { success: true };
  }

  const result = await apiRequest<{ success: boolean }>(
    "/api/auth/logout",
    { method: "POST" },
    accessToken
  );
  clearAuthTokens();
  return result;
};

let refreshInFlight: Promise<AuthTokens> | null = null;

setAuthRefreshHandler(async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthTokens();
    return null;
  }

  if (!refreshInFlight) {
    refreshInFlight = refresh().finally(() => {
      refreshInFlight = null;
    });
  }

  try {
    const tokens = await refreshInFlight;
    saveAuthTokens(tokens);
    return tokens.accessToken;
  } catch {
    clearAuthTokens();
    return null;
  }
});
