type ApiRequestOptions = {
  skipAuthRefresh?: boolean;
};

type AuthRefreshHandler = () => Promise<string | null>;
type AuthExpiredCallback = () => void;

let authRefreshHandler: AuthRefreshHandler | null = null;
let onAuthExpired: AuthExpiredCallback | null = null;

export const setAuthRefreshHandler = (handler: AuthRefreshHandler) => {
  authRefreshHandler = handler;
};

export const setOnAuthExpired = (callback: AuthExpiredCallback) => {
  onAuthExpired = callback;
};

const parseErrorText = async (response: Response) => {
  const text = await response.text();
  return text || `HTTP ${response.status}`;
};

export async function apiRequest<T>(
  url: string,
  init: RequestInit = {},
  token?: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const execute = async (accessToken?: string) => {
    const requestHeaders = new Headers(headers);
    if (accessToken) {
      requestHeaders.set("Authorization", `Bearer ${accessToken}`);
    }
    return fetch(url, {
      ...init,
      headers: requestHeaders
    });
  };

  let response = await execute(token);

  if (
    response.status === 401 &&
    token &&
    !options.skipAuthRefresh &&
    authRefreshHandler
  ) {
    const nextAccessToken = await authRefreshHandler();
    if (nextAccessToken) {
      response = await execute(nextAccessToken);
    }
  }

  if (!response.ok) {
    const errorText = await parseErrorText(response);
    if (response.status === 401 && onAuthExpired) {
      onAuthExpired();
    }
    throw new Error(errorText);
  }

  return (await response.json()) as T;
}
