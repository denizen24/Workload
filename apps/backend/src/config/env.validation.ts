type AppEnv = {
  PORT: number;
  NODE_ENV: string;
  CORS_ORIGIN: string;
  MONGO_URI: string;
  KEYCLOAK_ISSUER: string;
  KEYCLOAK_REALM: string;
  KEYCLOAK_CLIENT_ID: string;
};

export const validateEnv = (raw: Record<string, unknown>): AppEnv => {
  const port = Number(raw.PORT ?? 3000);

  if (Number.isNaN(port)) {
    throw new Error("PORT must be a number");
  }

  const keycloakIssuer = raw.KEYCLOAK_ISSUER != null ? String(raw.KEYCLOAK_ISSUER).trim() : "";
  if (!keycloakIssuer) {
    throw new Error("KEYCLOAK_ISSUER is required (set in .env)");
  }

  return {
    PORT: port,
    NODE_ENV: String(raw.NODE_ENV ?? "development"),
    CORS_ORIGIN: String(raw.CORS_ORIGIN ?? "http://localhost:5173"),
    MONGO_URI: String(raw.MONGO_URI ?? "mongodb://localhost:27017/workload"),
    KEYCLOAK_ISSUER: keycloakIssuer,
    KEYCLOAK_REALM: String(raw.KEYCLOAK_REALM ?? "workload"),
    KEYCLOAK_CLIENT_ID: String(raw.KEYCLOAK_CLIENT_ID ?? "workload-app")
  };
};
