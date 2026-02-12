import { Sprint } from "../types";

export type HostApi = {
  settings?: { get?: () => Promise<unknown> };
  getAppSettings?: () => Promise<unknown>;
  setTitle?: (title: string) => void;
  setLoadingAnimationEnabled?: (enabled: boolean) => void;
  setError?: (error: Error) => void;
  clearError?: () => void;
};

export type WidgetSettings = {
  mockDataset: string;
  defaultSprints: Sprint[];
  defaultHolidays: string[];
  defaultReleaseDates: string[];
};

const defaultSettings: WidgetSettings = {
  mockDataset: "default",
  defaultSprints: [
    { id: "spr-1", name: "Sprint 1", start: "2026-02-02", end: "2026-02-15" },
    { id: "spr-2", name: "Sprint 2", start: "2026-02-16", end: "2026-03-01" }
  ],
  defaultHolidays: [],
  defaultReleaseDates: []
};

const parseCsvDates = (value: unknown) => {
  if (typeof value !== "string") return [];
  return value
    .split(/[,\n;]/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const parseSprints = (value: unknown): Sprint[] => {
  if (typeof value !== "string") return defaultSettings.defaultSprints;
  const raw = value.trim();
  if (!raw) return defaultSettings.defaultSprints;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultSettings.defaultSprints;
    const normalized = parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const record = entry as Record<string, unknown>;
        const name = String(record.name ?? "").trim();
        const start = String(record.start ?? "").trim();
        const end = String(record.end ?? "").trim();
        if (!name || !start || !end) return null;
        return {
          id: String(record.id ?? `${name}-${start}-${end}`),
          name,
          start,
          end
        };
      })
      .filter((entry): entry is Sprint => Boolean(entry));
    return normalized.length ? normalized : defaultSettings.defaultSprints;
  } catch {
    return defaultSettings.defaultSprints;
  }
};

export const resolveSettings = (value: unknown): WidgetSettings => {
  if (!value || typeof value !== "object") {
    return { ...defaultSettings };
  }

  const record = value as Record<string, unknown>;
  return {
    mockDataset: String(record.mockDataset ?? defaultSettings.mockDataset).trim() || "default",
    defaultSprints: parseSprints(record.defaultSprints),
    defaultHolidays: parseCsvDates(record.defaultHolidays),
    defaultReleaseDates: parseCsvDates(record.defaultReleaseDates)
  };
};

export const loadWidgetSettings = async (host: HostApi): Promise<WidgetSettings> => {
  const rawSettings = host.settings?.get
    ? await host.settings.get()
    : host.getAppSettings
      ? await host.getAppSettings()
      : null;
  return resolveSettings(rawSettings);
};
