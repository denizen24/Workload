import * as XLSX from "xlsx";

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

const MONTH_ALIASES: Record<string, number> = MONTHS.reduce(
  (acc, month, index) => {
    acc[month] = index;
    acc[month.slice(0, 3)] = index;
    return acc;
  },
  {} as Record<string, number>
);

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  if (typeof value === "string") {
    const cleaned = value.trim();
    const parsed = new Date(cleaned);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export function parsePeriod(periodRaw: string | undefined | null) {
  if (!periodRaw) {
    return null;
  }
  const text = periodRaw.trim();
  const yearMatch = text.match(/(20\d{2})/);
  if (!yearMatch) return null;
  const year = Number(yearMatch[1]);

  const quarterMatch = text.match(/Q([1-4])/i);
  const quarter = quarterMatch ? Number(quarterMatch[1]) : null;

  const monthRangeMatch = text.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)[\s-]*(\d{1,2})?/i
  );

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
      } else {
        endMonth = startMonthIndex;
      }
    }
  }

  const start = new Date(year, startMonth, 1);
  const end = new Date(year, endMonth + 1, 0);

  return { start, end };
}

export function eachDay(start: Date, end: Date) {
  const dates: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function quarterKey(date: Date) {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}Q${quarter}`;
}

export function quarterBounds(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return { start, end };
}

export function inferAssignee(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/[a-z]+\.[a-z]+/i);
  return match ? match[0] : null;
}

export function parseNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const numeric = Number(value.replace(",", "."));
    return Number.isNaN(numeric) ? null : numeric;
  }
  return null;
}
