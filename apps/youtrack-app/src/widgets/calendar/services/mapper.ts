import { WorkloadResponse } from "../types";

type RawTask = {
  id: string;
  title: string;
  type: string;
  assignee: string;
  start: string;
  end: string;
  estimateDays: number;
};

export type RawMockPayload = {
  releases: Array<{ name: string; date: string }>;
  tasks: RawTask[];
};

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

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export const mapRawToWorkloadResponse = (raw: RawMockPayload): WorkloadResponse => {
  const assigneeMap = new Map<string, Map<string, Map<string, { load: number; tasks: string[] }>>>();
  const taskTitlesMap = new Map<string, string | null>();
  const taskTypesMap = new Map<string, string | null>();
  const taskEstimatesMap = new Map<string, number>();

  raw.tasks.forEach((task) => {
    const startDate = new Date(task.start);
    const endDate = new Date(task.end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return;

    const days = eachDay(startDate, endDate);
    const perDayLoad = Math.max(0.25, task.estimateDays / Math.max(1, days.length));

    taskTitlesMap.set(task.id, task.title);
    taskTypesMap.set(task.id, task.type);
    taskEstimatesMap.set(task.id, task.estimateDays);

    const assigneeBuckets =
      assigneeMap.get(task.assignee) ?? new Map<string, Map<string, { load: number; tasks: string[] }>>();
    assigneeMap.set(task.assignee, assigneeBuckets);

    days.forEach((day) => {
      const quarter = quarterKey(day);
      const dateKey = toIsoDate(day);
      const quarterBucket = assigneeBuckets.get(quarter) ?? new Map<string, { load: number; tasks: string[] }>();
      assigneeBuckets.set(quarter, quarterBucket);

      const dayEntry = quarterBucket.get(dateKey) ?? { load: 0, tasks: [] };
      dayEntry.load += perDayLoad;
      if (!dayEntry.tasks.includes(task.id)) dayEntry.tasks.push(task.id);
      quarterBucket.set(dateKey, dayEntry);
    });
  });

  const assignees = Array.from(assigneeMap.entries()).map(([assignee, quarterMap]) => {
    const periods = Array.from(quarterMap.entries()).map(([quarter, daysMap]) => {
      const [yearRaw, qRaw] = quarter.split("Q");
      const bounds = quarterBounds(Number(yearRaw), Number(qRaw));
      const days = Array.from(daysMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, payload]) => ({
          date,
          load: Number(payload.load.toFixed(4)),
          tasks: payload.tasks
        }));
      return {
        name: quarter,
        start: toIsoDate(bounds.start),
        end: toIsoDate(bounds.end),
        days
      };
    });
    return { name: assignee, periods };
  });

  return {
    assignees,
    releases: raw.releases,
    taskTitles: Object.fromEntries(taskTitlesMap),
    taskTypes: Object.fromEntries(taskTypesMap),
    taskEstimates: Object.fromEntries(taskEstimatesMap)
  };
};
