import keycloak from "../keycloak";

export async function apiRequest<T>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  if (keycloak.authenticated) {
    try {
      await keycloak.updateToken(30);
    } catch {
      keycloak.login();
      throw new Error("Token refresh failed, redirecting to login");
    }
  }

  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (keycloak.token) {
    headers.set("Authorization", `Bearer ${keycloak.token}`);
  }

  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      keycloak.login();
    }
    throw new Error(text || `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}
