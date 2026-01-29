"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseService = void 0;
const common_1 = require("@nestjs/common");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const XLSX = require("xlsx");
const zod_1 = require("zod");
const workload_dto_1 = require("./dto/workload.dto");
const parse_utils_1 = require("./parse.utils");
const SecondsInDay = 28800;
const WorkloadSchema = zod_1.z.object({
    assignees: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().min(1),
        periods: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            start: zod_1.z.string(),
            end: zod_1.z.string(),
            days: zod_1.z.array(zod_1.z.object({
                date: zod_1.z.string(),
                load: zod_1.z.number(),
                tasks: zod_1.z.array(zod_1.z.string()),
                qaLoad: zod_1.z.number().optional(),
                spLoad: zod_1.z.number().optional()
            }))
        }))
    })),
    releases: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        date: zod_1.z.string()
    })),
    taskTitles: zod_1.z.record(zod_1.z.string(), zod_1.z.string().nullable()).optional(),
    taskTypes: zod_1.z.record(zod_1.z.string(), zod_1.z.string().nullable()).optional(),
    taskEstimates: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional()
});
let ParseService = class ParseService {
    parseWorkbook(buffer) {
        const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
        const sheet = workbook.Sheets["issues"] ??
            workbook.Sheets["Issues"] ??
            workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) {
            throw new Error("Sheet 'issues' not found");
        }
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
        if (!rows.length) {
            return this.validateResponse({ assignees: [], releases: [] });
        }
        const headers = rows[0].map((value) => String(value ?? "").trim());
        const findHeader = (options) => headers.findIndex((header) => options.some((opt) => header.toLowerCase().replace(/\s+/g, "").includes(opt)));
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
        const pickIndex = (index, fallback) => index >= 0 ? index : fallback;
        const issues = [];
        for (let i = 1; i < rows.length; i += 1) {
            const row = rows[i];
            const rawIssue = row[pickIndex(issueIdx, 0)];
            const issueId = typeof rawIssue === "string"
                ? rawIssue.trim()
                : String(rawIssue ?? "").trim();
            if (!issueId)
                continue;
            const titleCell = titleIdx >= 0 ? row[titleIdx] : null;
            const title = typeof titleCell === "string"
                ? titleCell.trim()
                : titleCell
                    ? String(titleCell).trim()
                    : null;
            const typeCell = typeIdx >= 0 ? row[typeIdx] : null;
            const type = typeof typeCell === "string"
                ? typeCell.trim()
                : typeCell
                    ? String(typeCell).trim()
                    : null;
            const assigneeCell = assigneeIdx >= 0
                ? row[assigneeIdx]
                : (0, parse_utils_1.inferAssignee)(String(row[pickIndex(assigneeIdx, 1)] ?? row.join(" ")));
            const assignee = (0, parse_utils_1.inferAssignee)(assigneeCell) ?? "unassigned";
            const estimateVal = (0, parse_utils_1.parseEstimateToSeconds)(row[pickIndex(estimateIdx, 2)]) ?? 0;
            const totalEstimateVal = totalEstimateIdx >= 0 ? (0, parse_utils_1.parseEstimateToSeconds)(row[totalEstimateIdx]) : null;
            const estimateSeconds = Math.max(estimateVal, totalEstimateVal ?? 0);
            const periodRaw = row[pickIndex(periodIdx, 3)];
            const period = (0, parse_utils_1.parsePeriod)(typeof periodRaw === "string" ? periodRaw : String(periodRaw ?? ""));
            const createdAt = (0, parse_utils_1.parseDateValue)(row[pickIndex(createdIdx, 5)]);
            const updatedAt = (0, parse_utils_1.parseDateValue)(row[pickIndex(updatedIdx, 6)]);
            const fallbackStart = createdAt ?? updatedAt ?? new Date();
            const fallbackEnd = updatedAt ?? createdAt ?? new Date();
            const startDate = period?.start ?? fallbackStart;
            const endDate = period?.end ?? fallbackEnd;
            const status = typeof row[pickIndex(statusIdx, 4)] === "string"
                ? row[pickIndex(statusIdx, 4)]
                : "TODO";
            const release = typeof row[pickIndex(releaseIdx, 7)] === "string"
                ? row[pickIndex(releaseIdx, 7)]
                : null;
            const qaSeconds = (0, parse_utils_1.parseEstimateToSeconds)(row[pickIndex(qaIdx, 8)]);
            const spSeconds = (0, parse_utils_1.parseEstimateToSeconds)(row[pickIndex(spIdx, 9)]);
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
    buildResponse(issues) {
        const assigneeMap = new Map();
        const releaseMap = new Map();
        const taskTitlesMap = new Map();
        const taskTypesMap = new Map();
        const taskEstimatesMap = new Map();
        for (const issue of issues) {
            if (!taskTitlesMap.has(issue.issueId)) {
                taskTitlesMap.set(issue.issueId, issue.title || null);
            }
            if (!taskTypesMap.has(issue.issueId)) {
                taskTypesMap.set(issue.issueId, issue.type || null);
            }
            const estimateDays = issue.estimateSeconds / SecondsInDay;
            const existing = taskEstimatesMap.get(issue.issueId);
            if (existing === undefined || estimateDays > existing) {
                taskEstimatesMap.set(issue.issueId, estimateDays);
            }
            const days = (0, parse_utils_1.eachDay)(issue.periodStart, issue.periodEnd);
            if (!days.length)
                continue;
            const baseLoadDays = issue.estimateSeconds / SecondsInDay;
            const qaDays = (issue.qaSeconds ?? 0) / SecondsInDay;
            const spDays = (issue.spSeconds ?? 0) / SecondsInDay;
            const totalLoad = baseLoadDays + qaDays + spDays;
            const perDayLoad = totalLoad / days.length;
            const perDayQa = qaDays / days.length;
            const perDaySp = spDays / days.length;
            const assigneeBuckets = assigneeMap.get(issue.assignee) ??
                new Map();
            assigneeMap.set(issue.assignee, assigneeBuckets);
            for (const day of days) {
                const dateKey = (0, parse_utils_1.toIsoDate)(day);
                const quarter = (0, parse_utils_1.quarterKey)(day);
                const quarterBucket = assigneeBuckets.get(quarter) ??
                    new Map();
                assigneeBuckets.set(quarter, quarterBucket);
                const dayEntry = quarterBucket.get(dateKey) ?? {
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
                const releaseDate = issue.updatedAt ??
                    new Date(issue.periodStart.getFullYear(), issue.periodStart.getMonth(), 15);
                releaseMap.set(issue.release, (0, parse_utils_1.toIsoDate)(releaseDate));
            }
        }
        const assignees = Array.from(assigneeMap.entries()).map(([assignee, quarterMap]) => {
            const periods = Array.from(quarterMap.entries()).map(([quarter, daysMap]) => {
                const [yearRaw, qRaw] = quarter.split("Q");
                const bounds = (0, parse_utils_1.quarterBounds)(Number(yearRaw), Number(qRaw));
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
                    start: (0, parse_utils_1.toIsoDate)(bounds.start),
                    end: (0, parse_utils_1.toIsoDate)(bounds.end),
                    days
                };
            });
            return { name: assignee, periods };
        });
        const releases = Array.from(releaseMap.entries()).map(([name, date]) => ({
            name,
            date
        }));
        const taskTitles = Object.fromEntries(taskTitlesMap);
        const taskTypes = Object.fromEntries(taskTypesMap);
        const taskEstimates = Object.fromEntries(taskEstimatesMap);
        return this.validateResponse({ assignees, releases, taskTitles, taskTypes, taskEstimates });
    }
    validateResponse(payload) {
        WorkloadSchema.parse(payload);
        const dto = (0, class_transformer_1.plainToInstance)(workload_dto_1.WorkloadResponseDto, payload);
        const errors = (0, class_validator_1.validateSync)(dto, { whitelist: true });
        if (errors.length) {
            throw new Error("Workload response validation failed");
        }
        return payload;
    }
};
exports.ParseService = ParseService;
exports.ParseService = ParseService = __decorate([
    (0, common_1.Injectable)()
], ParseService);
//# sourceMappingURL=parse.service.js.map