import { AuthUser } from "../api/auth";

type AuthSectionProps = {
  currentUser: AuthUser | null;
  isKeycloakReady: boolean;
  handleLogin: () => void;
  handleLogout: () => void;
};

export function AuthSection({
  currentUser,
  isKeycloakReady,
  handleLogin,
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
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            disabled={!isKeycloakReady}
            onClick={handleLogin}
          >
            {!isKeycloakReady && <span className="ui-spinner" aria-hidden />}
            Войти
          </button>
        )}
      </div>
    </section>
  );
}
