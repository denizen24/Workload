import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import * as XLSX from "xlsx";
import { z } from "zod";

import { WorkloadResponseDto } from "./dto/workload.dto";
import {
  eachDay,
  inferAssignee,
  parseDateValue,
  parseEstimateToSeconds,
  parsePeriod,
  quarterBounds,
  quarterKey,
  toIsoDate
} from "./parse.utils";

const SecondsInDay = 28800;

const WorkloadSchema = z.object({
  assignees: z.array(
    z.object({
      name: z.string().min(1),
      periods: z.array(
        z.object({
          name: z.string(),
          start: z.string(),
          end: z.string(),
          days: z.array(
            z.object({
              date: z.string(),
              load: z.number(),
              tasks: z.array(z.string()),
              qaLoad: z.number().optional(),
              spLoad: z.number().optional()
            })
          )
        })
      )
    })
  ),
  releases: z.array(
    z.object({
      name: z.string(),
      date: z.string()
    })
  ),
  taskTitles: z.record(z.string(), z.string().nullable()).optional(),
  taskTypes: z.record(z.string(), z.string().nullable()).optional(),
  taskEstimates: z.record(z.string(), z.number()).optional()
});

type RawIssue = {
  issueId: string;
  title?: string | null;
  type?: string | null;
  assignee: string;
  estimateSeconds: number;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  release?: string | null;
  qaSeconds?: number | null;
  spSeconds?: number | null;
};

@Injectable()
export class ParseService {
  parseWorkbook(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet =
      workbook.Sheets["issues"] ??
      workbook.Sheets["Issues"] ??
      workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      throw new Error("Sheet 'issues' not found");
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
    if (!rows.length) {
      return this.validateResponse({ assignees: [], releases: [] });
    }

    const headers = (rows[0] as string[]).map((value) =>
      String(value ?? "").trim()
    );

    const findHeader = (options: string[]) =>
      headers.findIndex((header) =>
        options.some((opt) =>
          header.toLowerCase().replace(/\s+/g, "").includes(opt)
        )
      );

    const issueIdx = findHeader(["issueid", "issue", "id"]);
    const titleIdx = findHeader(["заголовок", "title", "summary", "name"]);
    const typeIdx = findHeader(["тип", "type", "issuetype", "issue type"]);
    const assigneeIdx = findHeader(["assignee", "owner", "исполнитель"]);
    const estimateIdx = findHeader(["оценка", "ownestimate", "estimate"]);
    const totalEstimateIdx = findHeader([
      "общаяоценка(сподзадачами)",
      "общаяоценка",
      "timeoriginalestimate",
      "originalestimate"
    ]);
    const periodIdx = findHeader(["period"]);
    const statusIdx = findHeader(["status"]);
    const createdIdx = findHeader(["created"]);
    const updatedIdx = findHeader(["updated"]);
    const releaseIdx = findHeader(["release"]);
    const qaIdx = findHeader(["qa"]);
    const spIdx = findHeader(["sp"]);

    const pickIndex = (index: number, fallback: number) =>
      index >= 0 ? index : fallback;

    const issues: RawIssue[] = [];

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i] as unknown[];
      const rawIssue = row[pickIndex(issueIdx, 0)];
      const issueId =
        typeof rawIssue === "string"
          ? rawIssue.trim()
          : String(rawIssue ?? "").trim();
      if (!issueId) continue;

      const titleCell = titleIdx >= 0 ? row[titleIdx] : null;
      const title =
        typeof titleCell === "string"
          ? titleCell.trim()
          : titleCell
            ? String(titleCell).trim()
            : null;

      const typeCell = typeIdx >= 0 ? row[typeIdx] : null;
      const type =
        typeof typeCell === "string"
          ? typeCell.trim()
          : typeCell
            ? String(typeCell).trim()
            : null;

      const assigneeCell =
        assigneeIdx >= 0
          ? row[assigneeIdx]
          : inferAssignee(String(row[pickIndex(assigneeIdx, 1)] ?? row.join(" ")));
      const assignee = inferAssignee(assigneeCell) ?? "unassigned";

      const estimateVal = parseEstimateToSeconds(row[pickIndex(estimateIdx, 2)]) ?? 0;
      const totalEstimateVal =
        totalEstimateIdx >= 0 ? parseEstimateToSeconds(row[totalEstimateIdx]) : null;
      const estimateSeconds = Math.max(estimateVal, totalEstimateVal ?? 0);
      const periodRaw = row[pickIndex(periodIdx, 3)];
      const period = parsePeriod(
        typeof periodRaw === "string" ? periodRaw : String(periodRaw ?? "")
      );

      const createdAt = parseDateValue(row[pickIndex(createdIdx, 5)]);
      const updatedAt = parseDateValue(row[pickIndex(updatedIdx, 6)]);
      const fallbackStart = createdAt ?? updatedAt ?? new Date();
      const fallbackEnd = updatedAt ?? createdAt ?? new Date();

      const startDate = period?.start ?? fallbackStart;
      const endDate = period?.end ?? fallbackEnd;

      const status =
        typeof row[pickIndex(statusIdx, 4)] === "string"
          ? (row[pickIndex(statusIdx, 4)] as string)
          : "TODO";
      const release =
        typeof row[pickIndex(releaseIdx, 7)] === "string"
          ? (row[pickIndex(releaseIdx, 7)] as string)
          : null;
      const qaSeconds = parseEstimateToSeconds(row[pickIndex(qaIdx, 8)]);
      const spSeconds = parseEstimateToSeconds(row[pickIndex(spIdx, 9)]);

      issues.push({
        issueId,
        title: title || null,
        type: type || null,
        assignee,
        estimateSeconds,
        periodStart: startDate,
        periodEnd: endDate,
        status: String(status).trim(),
        createdAt,
        updatedAt,
        release,
        qaSeconds,
        spSeconds
      });
    }

    return this.buildResponse(issues);
  }

  private buildResponse(issues: RawIssue[]) {
    const assigneeMap = new Map<
      string,
      Map<string, Map<string, { load: number; tasks: string[]; qa: number; sp: number }>>
    >();
    const releaseMap = new Map<string, string>();
    const taskTitlesMap = new Map<string, string | null>();
    const taskTypesMap = new Map<string, string | null>();
    const taskEstimatesMap = new Map<string, number>();

    for (const issue of issues) {
      // Сохраняем название задачи
      if (!taskTitlesMap.has(issue.issueId)) {
        taskTitlesMap.set(issue.issueId, issue.title || null);
      }
      // Сохраняем тип задачи
      if (!taskTypesMap.has(issue.issueId)) {
        taskTypesMap.set(issue.issueId, issue.type || null);
      }
      // Сохраняем оценку (в днях) — берём максимум из полей «оценка» и «общая оценка»
      const estimateDays = issue.estimateSeconds / SecondsInDay;
      const existing = taskEstimatesMap.get(issue.issueId);
      if (existing === undefined || estimateDays > existing) {
        taskEstimatesMap.set(issue.issueId, estimateDays);
      }

      const days = eachDay(issue.periodStart, issue.periodEnd);
      if (!days.length) continue;

      const baseLoadDays = issue.estimateSeconds / SecondsInDay;
      const qaDays = (issue.qaSeconds ?? 0) / SecondsInDay;
      const spDays = (issue.spSeconds ?? 0) / SecondsInDay;
      const totalLoad = baseLoadDays + qaDays + spDays;
      const perDayLoad = totalLoad / days.length;
      const perDayQa = qaDays / days.length;
      const perDaySp = spDays / days.length;

      const assigneeBuckets =
        assigneeMap.get(issue.assignee) ??
        new Map<
          string,
          Map<string, { load: number; tasks: string[]; qa: number; sp: number }>
        >();
      assigneeMap.set(issue.assignee, assigneeBuckets);

      for (const day of days) {
        const dateKey = toIsoDate(day);
        const quarter = quarterKey(day);
        const quarterBucket =
          assigneeBuckets.get(quarter) ??
          new Map<string, { load: number; tasks: string[]; qa: number; sp: number }>();
        assigneeBuckets.set(quarter, quarterBucket);

        const dayEntry =
          quarterBucket.get(dateKey) ?? {
            load: 0,
            tasks: [],
            qa: 0,
            sp: 0
          };
        dayEntry.load += perDayLoad;
        dayEntry.qa += perDayQa;
        dayEntry.sp += perDaySp;
        if (!dayEntry.tasks.includes(issue.issueId)) {
          dayEntry.tasks.push(issue.issueId);
        }
        quarterBucket.set(dateKey, dayEntry);
      }

      if (issue.release) {
        const releaseDate =
          issue.updatedAt ??
          new Date(issue.periodStart.getFullYear(), issue.periodStart.getMonth(), 15);
        releaseMap.set(issue.release, toIsoDate(releaseDate));
      }
    }

    const assignees = Array.from(assigneeMap.entries()).map(
      ([assignee, quarterMap]) => {
        const periods = Array.from(quarterMap.entries()).map(
          ([quarter, daysMap]) => {
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
          }
        );

        return { name: assignee, periods };
      }
    );

    const releases = Array.from(releaseMap.entries()).map(([name, date]) => ({
      name,
      date
    }));

    const taskTitles = Object.fromEntries(taskTitlesMap);
    const taskTypes = Object.fromEntries(taskTypesMap);
    const taskEstimates = Object.fromEntries(taskEstimatesMap);

    return this.validateResponse({ assignees, releases, taskTitles, taskTypes, taskEstimates });
  }

  private validateResponse(payload: unknown) {
    WorkloadSchema.parse(payload);
    const dto = plainToInstance(WorkloadResponseDto, payload);
    const errors = validateSync(dto, { whitelist: true });
    if (errors.length) {
      throw new Error("Workload response validation failed");
    }
    return payload as WorkloadResponseDto;
  }
}
