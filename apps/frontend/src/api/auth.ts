import keycloak from "../keycloak";
import { apiRequest } from "./http";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export const isAuthenticated = () => Boolean(keycloak.authenticated);

export const getAuthUser = (): AuthUser | null => {
  if (!keycloak.authenticated || !keycloak.tokenParsed) {
    return null;
  }
  const token = keycloak.tokenParsed;
  return {
    id: token.sub ?? "",
    email: (token as Record<string, unknown>).email as string ?? "",
    name: (token as Record<string, unknown>).name as string ??
      (token as Record<string, unknown>).preferred_username as string ?? ""
  };
};

export const me = async () => apiRequest<AuthUser>("/api/auth/me");

export const loginRedirect = () => keycloak.login();

export const logoutRedirect = () =>
  keycloak.logout({ redirectUri: window.location.origin });
