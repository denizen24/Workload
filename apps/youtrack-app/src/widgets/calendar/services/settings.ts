import { Sprint } from "../types";

export type AppSettings = {
  projects: string[];
  issueQuery?: string;
  startDateField: string;
  endDateField: string;
  estimateField?: string;
  qaField?: string;
  spField?: string;
  releaseField?: string;
  typeField?: string;
  statusField?: string;
  assigneeField?: string;
  maxIssues: number;
  defaultHorizonDays: number;
  youtrackBaseUrl?: string;
  youtrackToken?: string;
  defaultSprints?: Sprint[];
};

export const defaultSettings: AppSettings = {
  projects: [],
  issueQuery: "",
  startDateField: "Start date",
  endDateField: "Due date",
  estimateField: "Estimation",
  qaField: "QA",
  spField: "SP",
  releaseField: "Release",
  typeField: "Type",
  statusField: "State",
  assigneeField: "Assignee",
  maxIssues: 500,
  defaultHorizonDays: 90,
  youtrackBaseUrl: "",
  youtrackToken: "",
  defaultSprints: []
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry).trim()).filter(Boolean);
};

const normalizeSprintArray = (value: unknown): Sprint[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const name = String(record.name ?? "").trim();
      const start = String(record.start ?? "").trim();
      const end = String(record.end ?? "").trim();
      if (!name || !start || !end) return null;
      return { id: `${name}-${start}-${end}`, name, start, end };
    })
    .filter((entry): entry is Sprint => Boolean(entry));
};

export const resolveSettings = (value: unknown): AppSettings => {
  if (!value || typeof value !== "object") return { ...defaultSettings };
  const record = value as Record<string, unknown>;
  const maxIssuesRaw = Number(record.maxIssues ?? defaultSettings.maxIssues);
  const horizonRaw = Number(
    record.defaultHorizonDays ?? defaultSettings.defaultHorizonDays
  );

  return {
    projects: normalizeStringArray(record.projects),
    issueQuery: String(record.issueQuery ?? defaultSettings.issueQuery ?? "").trim(),
    startDateField: String(record.startDateField ?? defaultSettings.startDateField),
    endDateField: String(record.endDateField ?? defaultSettings.endDateField),
    estimateField: String(record.estimateField ?? defaultSettings.estimateField ?? "").trim(),
    qaField: String(record.qaField ?? defaultSettings.qaField ?? "").trim(),
    spField: String(record.spField ?? defaultSettings.spField ?? "").trim(),
    releaseField: String(record.releaseField ?? defaultSettings.releaseField ?? "").trim(),
    typeField: String(record.typeField ?? defaultSettings.typeField ?? "").trim(),
    statusField: String(record.statusField ?? defaultSettings.statusField ?? "").trim(),
    assigneeField: String(record.assigneeField ?? defaultSettings.assigneeField ?? "").trim(),
    maxIssues: Number.isFinite(maxIssuesRaw) ? maxIssuesRaw : defaultSettings.maxIssues,
    defaultHorizonDays: Number.isFinite(horizonRaw)
      ? horizonRaw
      : defaultSettings.defaultHorizonDays,
    youtrackBaseUrl: String(record.youtrackBaseUrl ?? defaultSettings.youtrackBaseUrl ?? "").trim(),
    youtrackToken: String(record.youtrackToken ?? defaultSettings.youtrackToken ?? "").trim(),
    defaultSprints: normalizeSprintArray(record.defaultSprints)
  };
};
