import { useEffect, useState } from "react";

import {
  AuthUser,
  clearAuthTokens,
  isAuthenticated,
  login,
  logout,
  me,
  register,
  saveAuthTokens
} from "../api/auth";
import { setOnAuthExpired } from "../api/http";

export function useAuth(setError: (err: string | null) => void) {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authSecret, setAuthSecret] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthBusy, setIsAuthBusy] = useState(false);

  useEffect(() => {
    setOnAuthExpired(() => {
      clearAuthTokens();
      setCurrentUser(null);
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) return;
    me()
      .then((user) => setCurrentUser(user))
      .catch(() => {
        clearAuthTokens();
        setCurrentUser(null);
      });
  }, []);

  const handleAuthSubmit = async () => {
    setIsAuthBusy(true);
    setError(null);
    try {
      const trimmedEmail = authEmail.trim().toLowerCase();
      const response =
        authMode === "register"
          ? await register({
              email: trimmedEmail,
              password: authPassword,
              registrationSecret: authSecret || undefined
            })
          : await login({
              email: trimmedEmail,
              password: authPassword
            });
      saveAuthTokens(response);
      setCurrentUser(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка авторизации");
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setError(null);
    try {
      await logout();
    } catch {
      clearAuthTokens();
    } finally {
      setCurrentUser(null);
    }
  };

  return {
    authMode,
    setAuthMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authSecret,
    setAuthSecret,
    currentUser,
    setCurrentUser,
    isAuthBusy,
    handleAuthSubmit,
    handleLogout
  };
}
