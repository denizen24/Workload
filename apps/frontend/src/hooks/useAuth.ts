import { useCallback, useEffect, useState } from "react";

import { AuthUser, getAuthUser, logoutRedirect } from "../api/auth";
import keycloak from "../keycloak";

export function useAuth(setError: (err: string | null) => void) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isKeycloakReady, setIsKeycloakReady] = useState(false);

  useEffect(() => {
    keycloak
      .init({ onLoad: "check-sso", silentCheckSsoRedirectUri: undefined })
      .then((authenticated) => {
        setIsKeycloakReady(true);
        if (authenticated) {
          setCurrentUser(getAuthUser());
        }
      })
      .catch((err) => {
        setIsKeycloakReady(true);
        setError("Keycloak initialization failed");
        console.error("Keycloak init error:", err);
      });
  }, [setError]);

  const handleLogin = useCallback(() => {
    keycloak.login();
  }, []);

  const handleLogout = useCallback(async () => {
    setError(null);
    setCurrentUser(null);
    logoutRedirect();
  }, [setError]);

  return {
    currentUser,
    isKeycloakReady,
    handleLogin,
    handleLogout
  };
}
