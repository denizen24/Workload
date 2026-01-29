"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toIsoDate = toIsoDate;
exports.parseDateValue = parseDateValue;
exports.parsePeriod = parsePeriod;
exports.eachDay = eachDay;
exports.quarterKey = quarterKey;
exports.quarterBounds = quarterBounds;
exports.inferAssignee = inferAssignee;
exports.parseNumber = parseNumber;
exports.parseEstimateToSeconds = parseEstimateToSeconds;
const XLSX = require("xlsx");
const MONTHS = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
];
const MONTH_ALIASES = MONTHS.reduce((acc, month, index) => {
    acc[month] = index;
    acc[month.slice(0, 3)] = index;
    return acc;
}, {});
function toIsoDate(date) {
    return date.toISOString().slice(0, 10);
}
function parseDateValue(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return value;
    if (typeof value === "number") {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (!parsed)
            return null;
        return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
    if (typeof value === "string") {
        const cleaned = value.trim();
        const parsed = new Date(cleaned);
        if (!Number.isNaN(parsed.getTime()))
            return parsed;
    }
    return null;
}
function parsePeriod(periodRaw) {
    if (!periodRaw) {
        return null;
    }
    const text = periodRaw.trim();
    const yearMatch = text.match(/(20\d{2})/);
    if (!yearMatch)
        return null;
    const year = Number(yearMatch[1]);
    const quarterMatch = text.match(/Q([1-4])/i);
    const quarter = quarterMatch ? Number(quarterMatch[1]) : null;
    const monthRangeMatch = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)[\s-]*(\d{1,2})?/i);
    let startMonth = quarter ? (quarter - 1) * 3 : 0;
    let endMonth = quarter ? startMonth + 2 : 11;
    if (monthRangeMatch) {
        const monthName = monthRangeMatch[1].toLowerCase();
        const startMonthIndex = MONTH_ALIASES[monthName];
        const monthCountRaw = monthRangeMatch[2];
        if (startMonthIndex !== undefined) {
            startMonth = startMonthIndex;
            if (monthCountRaw) {
                const monthCount = Math.max(1, Number(monthCountRaw));
                endMonth = Math.min(11, startMonthIndex + monthCount - 1);
            }
            else {
                endMonth = startMonthIndex;
            }
        }
    }
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, endMonth + 1, 0);
    return { start, end };
}
function eachDay(start, end) {
    const dates = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (cursor <= end) {
        dates.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
}
function quarterKey(date) {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `${date.getFullYear()}Q${quarter}`;
}
function quarterBounds(year, quarter) {
    const startMonth = (quarter - 1) * 3;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 0);
    return { start, end };
}
function inferAssignee(value) {
    if (typeof value !== "string")
        return null;
    const match = value.match(/[a-z]+\.[a-z]+/i);
    return match ? match[0] : null;
}
function parseNumber(value) {
    if (typeof value === "number")
        return value;
    if (typeof value === "string") {
        const numeric = Number(value.replace(",", "."));
        return Number.isNaN(numeric) ? null : numeric;
    }
    return null;
}
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 28800;
const SECONDS_PER_WEEK = 5 * SECONDS_PER_DAY;
function parseEstimateToSeconds(value) {
    if (value === null || value === undefined)
        return null;
    if (typeof value === "number")
        return Number.isNaN(value) ? null : value * 60;
    if (typeof value !== "string")
        return null;
    const s = value.trim();
    if (!s)
        return null;
    const plain = parseNumber(s);
    if (plain !== null)
        return plain * 60;
    const nMatch = s.match(/(\d+(?:[.,]\d+)?)\s*н/);
    const dMatch = s.match(/(\d+(?:[.,]\d+)?)\s*д/);
    const hMatch = s.match(/(\d+(?:[.,]\d+)?)\s*ч/);
    const weeks = nMatch ? Number(nMatch[1].replace(",", ".")) : 0;
    const days = dMatch ? Number(dMatch[1].replace(",", ".")) : 0;
    const hours = hMatch ? Number(hMatch[1].replace(",", ".")) : 0;
    if (weeks === 0 && days === 0 && hours === 0)
        return null;
    return weeks * SECONDS_PER_WEEK + days * SECONDS_PER_DAY + hours * SECONDS_PER_HOUR;
}
//# sourceMappingURL=parse.utils.js.map