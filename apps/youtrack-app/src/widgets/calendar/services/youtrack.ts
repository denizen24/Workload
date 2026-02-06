import { AppSettings } from "./settings";

export type HostApi = {
  fetchYouTrack?: (path: string, options?: RequestInit) => Promise<Response>;
  settings?: { get?: () => Promise<unknown> };
  getAppSettings?: () => Promise<unknown>;
};

export type YouTrackIssue = {
  id: string;
  idReadable?: string;
  summary?: string;
  project?: { id?: string; name?: string };
  assignee?: { login?: string; fullName?: string } | null;
  issueType?: { name?: string } | null;
  created?: number;
  updated?: number;
  customFields?: Array<{
    id?: string;
    name: string;
    value?: unknown;
  }>;
};

const buildFieldsParam = () =>
  [
    "id",
    "idReadable",
    "summary",
    "project(id,name)",
    "assignee(login,fullName)",
    "issueType(name)",
    "created",
    "updated",
    "customFields(name,value(name,localizedName,minutes,date,duration,login,fullName,text))"
  ].join(",");

const youTrackFetch = async (
  host: HostApi,
  settings: AppSettings,
  path: string,
  options: RequestInit = {}
) => {
  if (host.fetchYouTrack) {
    return host.fetchYouTrack(path, options);
  }

  const baseUrl = settings.youtrackBaseUrl?.replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("YouTrack host API недоступен и не задан youtrackBaseUrl");
  }

  const headers = new Headers(options.headers ?? {});
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (settings.youtrackToken) {
    headers.set("Authorization", `Bearer ${settings.youtrackToken}`);
  }

  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers
  });
};

const ensureOk = async (response: Response) => {
  if (response.ok) return response;
  const text = await response.text();
  throw new Error(text || `Ошибка YouTrack API (${response.status})`);
};

export const fetchIssuesByProjectAndDates = async (
  host: HostApi,
  settings: AppSettings,
  projectId: string,
  query: string | null,
  pageSize = 200
): Promise<YouTrackIssue[]> => {
  const fields = buildFieldsParam();
  const issues: YouTrackIssue[] = [];
  let skip = 0;
  let hasMore = true;

  const baseQueryParts = [];
  if (projectId) baseQueryParts.push(`project: ${projectId}`);
  if (query) baseQueryParts.push(query);
  const queryString = baseQueryParts.join(" ").trim();

  while (hasMore) {
    const params = new URLSearchParams();
    params.set("fields", fields);
    if (queryString) {
      params.set("query", queryString);
    }
    params.set("$top", String(pageSize));
    params.set("$skip", String(skip));

    const response = await youTrackFetch(
      host,
      settings,
      `/api/issues?${params.toString()}`
    );
    await ensureOk(response);
    const chunk = (await response.json()) as YouTrackIssue[];
    issues.push(...chunk);
    if (chunk.length < pageSize || issues.length >= settings.maxIssues) {
      hasMore = false;
    } else {
      skip += pageSize;
    }
  }

  return issues.slice(0, settings.maxIssues);
};

const updateCustomField = async (
  host: HostApi,
  settings: AppSettings,
  issueId: string,
  fieldName: string,
  value: unknown
) => {
  const response = await youTrackFetch(host, settings, `/api/issues/${issueId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      customFields: [
        {
          name: fieldName,
          value
        }
      ]
    })
  });
  await ensureOk(response);
};

export const updateIssueDate = async (
  host: HostApi,
  settings: AppSettings,
  issueId: string,
  fieldName: string,
  newDate: Date
) => {
  const timestamp = newDate.getTime();
  if (Number.isNaN(timestamp)) {
    throw new Error("Некорректная дата для обновления");
  }
  await updateCustomField(host, settings, issueId, fieldName, timestamp);
};

export const updateIssueAssignee = async (
  host: HostApi,
  settings: AppSettings,
  issueId: string,
  assigneeLogin: string
) => {
  const fieldName = settings.assigneeField;
  if (!fieldName) {
    throw new Error("Не задано поле исполнителя в настройках");
  }
  await updateCustomField(host, settings, issueId, fieldName, { login: assigneeLogin });
};
