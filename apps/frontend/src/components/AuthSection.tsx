import { AuthUser } from "../api/auth";

type AuthSectionProps = {
  authMode: "login" | "register";
  setAuthMode: (mode: "login" | "register") => void;
  authEmail: string;
  setAuthEmail: (email: string) => void;
  authPassword: string;
  setAuthPassword: (password: string) => void;
  authSecret: string;
  setAuthSecret: (secret: string) => void;
  currentUser: AuthUser | null;
  isAuthBusy: boolean;
  handleAuthSubmit: () => void;
  handleLogout: () => void;
};

export function AuthSection({
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authSecret,
  setAuthSecret,
  currentUser,
  isAuthBusy,
  handleAuthSubmit,
  handleLogout
}: AuthSectionProps) {
  return (
    <section
      className={`ui-card ${!currentUser ? 'border-l-[3px] border-indigo-500' : ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="7" width="10" height="7" rx="1.5" />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" />
            </svg>
            Авторизация
          </h2>
          <p className="ui-muted">
            Авторизация нужна, чтобы сохранять таблицы нагрузки и работать со снапшотами.
          </p>
        </div>
        {currentUser ? (
          <div className="flex items-center gap-2">
            <span className="ui-muted">
              {currentUser.email}
            </span>
            <button
              type="button"
              className="ui-btn"
              onClick={handleLogout}
            >
              Выйти
            </button>
          </div>
        ) : (
          <div className="ui-segmented gap-0">
            <button
              type="button"
              className={`ui-segment-btn py-1 px-3 text-[0.8125rem] ${authMode === "login" ? "ui-segment-btn-active" : ""}`}
              onClick={() => setAuthMode("login")}
            >
              Вход
            </button>
            <button
              type="button"
              className={`ui-segment-btn py-1 px-3 text-[0.8125rem] ${authMode === "register" ? "ui-segment-btn-active" : ""}`}
              onClick={() => setAuthMode("register")}
            >
              Регистрация
            </button>
          </div>
        )}
      </div>

      {!currentUser && (
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            className="ui-input"
            placeholder="Email"
            value={authEmail}
            onChange={(event) => setAuthEmail(event.target.value)}
          />
          <input
            className="ui-input"
            placeholder="Пароль"
            type="password"
            value={authPassword}
            onChange={(event) => setAuthPassword(event.target.value)}
          />
          {authMode === "register" && (
            <input
              className="ui-input"
              placeholder="Секрет регистрации"
              type="password"
              value={authSecret}
              onChange={(event) => setAuthSecret(event.target.value)}
            />
          )}
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            disabled={isAuthBusy}
            onClick={handleAuthSubmit}
          >
            {isAuthBusy && <span className="ui-spinner" aria-hidden />}
            {isAuthBusy ? "Выполняю..." : authMode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </div>
      )}
    </section>
  );
}
