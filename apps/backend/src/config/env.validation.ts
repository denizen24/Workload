type AppEnv = {
  PORT: number;
  NODE_ENV: string;
  CORS_ORIGIN: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  MONGO_URI: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REGISTRATION_SECRET: string;
};

export const validateEnv = (raw: Record<string, unknown>): AppEnv => {
  const port = Number(raw.PORT ?? 3000);
  const redisPort = Number(raw.REDIS_PORT ?? 6379);

  if (Number.isNaN(port)) {
    throw new Error("PORT must be a number");
  }

  if (Number.isNaN(redisPort)) {
    throw new Error("REDIS_PORT must be a number");
  }

  const jwtAccessSecret = raw.JWT_ACCESS_SECRET != null ? String(raw.JWT_ACCESS_SECRET).trim() : "";
  const jwtRefreshSecret = raw.JWT_REFRESH_SECRET != null ? String(raw.JWT_REFRESH_SECRET).trim() : "";
  if (!jwtAccessSecret) {
    throw new Error("JWT_ACCESS_SECRET is required (set in .env)");
  }
  if (!jwtRefreshSecret) {
    throw new Error("JWT_REFRESH_SECRET is required (set in .env)");
  }

  return {
    PORT: port,
    NODE_ENV: String(raw.NODE_ENV ?? "development"),
    CORS_ORIGIN: String(raw.CORS_ORIGIN ?? "http://localhost:5173"),
    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_ACCESS_EXPIRES_IN: String(raw.JWT_ACCESS_EXPIRES_IN ?? "15m"),
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    JWT_REFRESH_EXPIRES_IN: String(raw.JWT_REFRESH_EXPIRES_IN ?? "7d"),
    MONGO_URI: String(raw.MONGO_URI ?? "mongodb://localhost:27017/workload"),
    REDIS_HOST: String(raw.REDIS_HOST ?? "localhost"),
    REDIS_PORT: redisPort,
    REGISTRATION_SECRET: (() => {
      const secret = raw.REGISTRATION_SECRET != null ? String(raw.REGISTRATION_SECRET).trim() : "";
      if (!secret) {
        throw new Error("REGISTRATION_SECRET is required (set in .env)");
      }
      return secret;
    })()
  };
};
