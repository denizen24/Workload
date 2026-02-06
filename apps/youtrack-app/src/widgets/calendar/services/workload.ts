import { format } from "date-fns";

import { WorkloadResponse } from "../types";
import { AppSettings } from "./settings";
import { YouTrackIssue } from "./youtrack";

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 28800;
const SECONDS_PER_WEEK = 5 * SECONDS_PER_DAY;

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const eachDay = (start: Date, end: Date) => {
  const dates: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const quarterKey = (date: Date) => {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}Q${quarter}`;
};

const quarterBounds = (year: number, quarter: number) => {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return { start, end };
};

const parseEstimateToSeconds = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value * 60;
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    const numeric = Number(s.replace(",", "."));
    if (!Number.isNaN(numeric)) return numeric * 60;

    const wMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(н|w)/i);
    const dMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(д|d)/i);
    const hMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(ч|h)/i);
    const weeks = wMatch ? Number(wMatch[1].replace(",", ".")) : 0;
    const days = dMatch ? Number(dMatch[1].replace(",", ".")) : 0;
    const hours = hMatch ? Number(hMatch[1].replace(",", ".")) : 0;
    if (weeks === 0 && days === 0 && hours === 0) return null;
    return weeks * SECONDS_PER_WEEK + days * SECONDS_PER_DAY + hours * SECONDS_PER_HOUR;
  }
  if (typeof value === "object" && value) {
    const record = value as Record<string, unknown>;
    if (typeof record.minutes === "number") {
      return record.minutes * 60;
    }
    if (typeof record.duration === "number") {
      return record.duration * 60;
    }
  }
  return null;
};

const parseDateValue = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const ms = value < 1_000_000_000_000 ? value * 1000 : value;
    const parsed = new Date(ms);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.date === "number") {
      return parseDateValue(record.date);
    }
    if (typeof record.timestamp === "number") {
      return parseDateValue(record.timestamp);
    }
  }
  return null;
};

const extractCustomField = (issue: YouTrackIssue, fieldName?: string) => {
  if (!fieldName) return null;
  const lower = fieldName.toLowerCase();
  return issue.customFields?.find((field) => field.name.toLowerCase() === lower)?.value ?? null;
};

const extractTextValue = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const first = value.map(extractTextValue).find(Boolean);
    return first ?? null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.name === "string") return record.name;
    if (typeof record.localizedName === "string") return record.localizedName;
    if (typeof record.text === "string") return record.text;
    if (typeof record.login === "string") return record.login;
    if (typeof record.fullName === "string") return record.fullName;
  }
  return null;
};

const extractDate = (issue: YouTrackIssue, fieldName?: string) => {
  return parseDateValue(extractCustomField(issue, fieldName));
};

const extractEstimateSeconds = (issue: YouTrackIssue, fieldName?: string) => {
  return parseEstimateToSeconds(extractCustomField(issue, fieldName));
};

const extractReleaseValues = (issue: YouTrackIssue, fieldName?: string): string[] => {
  const value = extractCustomField(issue, fieldName);
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(extractTextValue).filter((entry): entry is string => Boolean(entry));
  }
  const single = extractTextValue(value);
  return single ? [single] : [];
};

const extractIssueType = (issue: YouTrackIssue, settings: AppSettings): string | null => {
  const fromField = extractTextValue(extractCustomField(issue, settings.typeField));
  if (fromField) return fromField;
  return issue.issueType?.name ?? null;
};

const resolveAssignee = (issue: YouTrackIssue, settings: AppSettings): string => {
  const fromField = extractTextValue(extractCustomField(issue, settings.assigneeField));
  if (fromField) return fromField;
  return issue.assignee?.login ?? issue.assignee?.fullName ?? "unassigned";
};

export const buildWorkloadResponse = (
  issues: YouTrackIssue[],
  settings: AppSettings
): WorkloadResponse => {
  const assigneeMap = new Map<
    string,
    Map<string, Map<string, { load: number; tasks: string[]; qa: number; sp: number }>>
  >();
  const releaseMap = new Map<string, string>();
  const taskTitlesMap = new Map<string, string | null>();
  const taskTypesMap = new Map<string, string | null>();
  const taskEstimatesMap = new Map<string, number>();

  for (const issue of issues) {
    const issueId = issue.idReadable ?? issue.id;
    if (!issueId) continue;

    const assignee = resolveAssignee(issue, settings);
    const title = issue.summary ?? null;
    const type = extractIssueType(issue, settings);
    const estimateSeconds = extractEstimateSeconds(issue, settings.estimateField) ?? 0;
    const qaSeconds = extractEstimateSeconds(issue, settings.qaField) ?? 0;
    const spSeconds = extractEstimateSeconds(issue, settings.spField) ?? 0;
    const createdAt = issue.created ? new Date(issue.created) : null;
    const updatedAt = issue.updated ? new Date(issue.updated) : null;
    const startDate = extractDate(issue, settings.startDateField) ?? createdAt ?? updatedAt ?? new Date();

    let endDate = extractDate(issue, settings.endDateField);
    if (!endDate) {
      const estimateDays = Math.max(1, Math.ceil(estimateSeconds / SECONDS_PER_DAY));
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.max(0, estimateDays - 1));
    }

    if (!taskTitlesMap.has(issueId)) {
      taskTitlesMap.set(issueId, title);
    }
    if (!taskTypesMap.has(issueId)) {
      taskTypesMap.set(issueId, type ?? null);
    }
    const estimateDays = estimateSeconds / SECONDS_PER_DAY;
    const existing = taskEstimatesMap.get(issueId);
    if (existing === undefined || estimateDays > existing) {
      taskEstimatesMap.set(issueId, estimateDays);
    }

    const days = eachDay(startDate, endDate);
    if (!days.length) continue;

    const baseLoadDays = estimateSeconds / SECONDS_PER_DAY;
    const qaDays = qaSeconds / SECONDS_PER_DAY;
    const spDays = spSeconds / SECONDS_PER_DAY;
    const totalLoad = baseLoadDays + qaDays + spDays;
    const perDayLoad = totalLoad / days.length;
    const perDayQa = qaDays / days.length;
    const perDaySp = spDays / days.length;

    const assigneeBuckets =
      assigneeMap.get(assignee) ??
      new Map<string, Map<string, { load: number; tasks: string[]; qa: number; sp: number }>>();
    assigneeMap.set(assignee, assigneeBuckets);

    for (const day of days) {
      const dateKey = toIsoDate(day);
      const quarter = quarterKey(day);
      const quarterBucket =
        assigneeBuckets.get(quarter) ??
        new Map<string, { load: number; tasks: string[]; qa: number; sp: number }>();
      assigneeBuckets.set(quarter, quarterBucket);

      const dayEntry =
        quarterBucket.get(dateKey) ?? { load: 0, tasks: [], qa: 0, sp: 0 };
      dayEntry.load += perDayLoad;
      dayEntry.qa += perDayQa;
      dayEntry.sp += perDaySp;
      if (!dayEntry.tasks.includes(issueId)) {
        dayEntry.tasks.push(issueId);
      }
      quarterBucket.set(dateKey, dayEntry);
    }

    const releases = extractReleaseValues(issue, settings.releaseField);
    if (releases.length > 0) {
      const releaseDate =
        updatedAt ??
        new Date(startDate.getFullYear(), startDate.getMonth(), 15);
      releases.forEach((release) => releaseMap.set(release, toIsoDate(releaseDate)));
    }
  }

  const assignees = Array.from(assigneeMap.entries()).map(
    ([assignee, quarterMap]) => {
      const periods = Array.from(quarterMap.entries()).map(([quarter, daysMap]) => {
        const [yearRaw, qRaw] = quarter.split("Q");
        const bounds = quarterBounds(Number(yearRaw), Number(qRaw));
        const days = Array.from(daysMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, payload]) => ({
            date,
            load: Number(payload.load.toFixed(4)),
            tasks: payload.tasks,
            qaLoad: payload.qa ? Number(payload.qa.toFixed(4)) : undefined,
            spLoad: payload.sp ? Number(payload.sp.toFixed(4)) : undefined
          }));
        return {
          name: quarter,
          start: toIsoDate(bounds.start),
          end: toIsoDate(bounds.end),
          days
        };
      });

      return { name: assignee, periods };
    }
  );

  const releases = Array.from(releaseMap.entries()).map(([name, date]) => ({
    name,
    date
  }));

  return {
    assignees,
    releases,
    taskTitles: Object.fromEntries(taskTitlesMap),
    taskTypes: Object.fromEntries(taskTypesMap),
    taskEstimates: Object.fromEntries(taskEstimatesMap)
  };
};

export const filterIssuesByDates = (
  issues: YouTrackIssue[],
  startDate: Date,
  endDate: Date,
  settings: AppSettings
) => {
  const start = format(startDate, "yyyy-MM-dd");
  const end = format(endDate, "yyyy-MM-dd");

  return issues.filter((issue) => {
    const startField = extractDate(issue, settings.startDateField);
    const endField = extractDate(issue, settings.endDateField);
    if (!startField && !endField) return true;
    const startKey = startField ? format(startField, "yyyy-MM-dd") : start;
    const endKey = endField ? format(endField, "yyyy-MM-dd") : end;
    return startKey <= end && endKey >= start;
  });
};
