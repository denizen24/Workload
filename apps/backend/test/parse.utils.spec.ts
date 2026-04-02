import {
  toIsoDate,
  parseDateValue,
  parsePeriod,
  eachDay,
  quarterKey,
  quarterBounds,
  inferAssignee,
  parseNumber,
  parseEstimateToSeconds
} from "../src/parse/parse.utils";

describe("toIsoDate", () => {
  it("formats a standard date as YYYY-MM-DD", () => {
    expect(toIsoDate(new Date(Date.UTC(2026, 5, 15)))).toBe("2026-06-15");
  });

  it("formats January 1st correctly", () => {
    expect(toIsoDate(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-01-01");
  });

  it("formats December 31st correctly", () => {
    expect(toIsoDate(new Date(Date.UTC(2026, 11, 31)))).toBe("2026-12-31");
  });

  it("zero-pads single-digit months and days", () => {
    expect(toIsoDate(new Date(Date.UTC(2026, 2, 5)))).toBe("2026-03-05");
  });
});

describe("parseDateValue", () => {
  it("returns null for null", () => {
    expect(parseDateValue(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseDateValue(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseDateValue("")).toBeNull();
  });

  it("returns null for zero", () => {
    expect(parseDateValue(0)).toBeNull();
  });

  it("returns the same Date object when given a Date", () => {
    const d = new Date(2026, 3, 15);
    expect(parseDateValue(d)).toBe(d);
  });

  it("parses a numeric Excel date code", () => {
    // Excel serial 44927 = 2023-01-01
    const result = parseDateValue(44927);
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2023);
    expect(result!.getMonth()).toBe(0);
    expect(result!.getDate()).toBe(1);
  });

  it("parses a valid ISO date string", () => {
    const result = parseDateValue("2026-06-15");
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2026);
  });

  it("parses a date string with surrounding whitespace", () => {
    const result = parseDateValue("  2026-06-15  ");
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2026);
  });

  it("returns null for an invalid date string", () => {
    expect(parseDateValue("not-a-date")).toBeNull();
  });

  it("returns null for a non-date non-string non-number value", () => {
    expect(parseDateValue({})).toBeNull();
    expect(parseDateValue([])).toBeNull();
    expect(parseDateValue(true)).toBeNull();
  });
});

describe("parsePeriod", () => {
  it("returns null for null", () => {
    expect(parsePeriod(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parsePeriod(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parsePeriod("")).toBeNull();
  });

  it("returns null when year is missing", () => {
    expect(parsePeriod("Q1 January-2")).toBeNull();
  });

  it("parses '2026Q1 January-2' as January + February", () => {
    const result = parsePeriod("2026Q1 January-2");
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date(2026, 0, 1));
    expect(result!.end).toEqual(new Date(2026, 1, 28)); // Feb 28, 2026
  });

  it("parses quarter only '2026Q1'", () => {
    const result = parsePeriod("2026Q1");
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date(2026, 0, 1));
    expect(result!.end).toEqual(new Date(2026, 2, 31));
  });

  it("parses quarter only '2026Q2'", () => {
    const result = parsePeriod("2026Q2");
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date(2026, 3, 1));
    expect(result!.end).toEqual(new Date(2026, 5, 30));
  });

  it("parses quarter only '2026Q3'", () => {
    const result = parsePeriod("2026Q3");
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date(2026, 6, 1));
    expect(result!.end).toEqual(new Date(2026, 8, 30));
  });

  it("parses quarter only '2026Q4'", () => {
    const result = parsePeriod("2026Q4");
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date(2026, 9, 1));
    expect(result!.end).toEqual(new Date(2026, 11, 31));
  });

  it("parses month only '2026 March'", () => {
    const result = parsePeriod("2026 March");
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date(2026, 2, 1));
    expect(result!.end).toEqual(new Date(2026, 2, 31));
  });

  it("parses month range '2026Q2 April-3'", () => {
    const result = parsePeriod("2026Q2 April-3");
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date(2026, 3, 1));
    expect(result!.end).toEqual(new Date(2026, 5, 30));
  });

  it("handles case-insensitive quarter", () => {
    const result = parsePeriod("2026q1");
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date(2026, 0, 1));
  });

  it("handles whitespace in input", () => {
    const result = parsePeriod("  2026Q1  ");
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date(2026, 0, 1));
  });
});

describe("eachDay", () => {
  it("returns all days in a range", () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 3);
    const days = eachDay(start, end);
    expect(days).toHaveLength(3);
    expect(days[0]).toEqual(new Date(2026, 0, 1));
    expect(days[1]).toEqual(new Date(2026, 0, 2));
    expect(days[2]).toEqual(new Date(2026, 0, 3));
  });

  it("returns a single day when start equals end", () => {
    const date = new Date(2026, 5, 15);
    const days = eachDay(date, date);
    expect(days).toHaveLength(1);
    expect(days[0]).toEqual(new Date(2026, 5, 15));
  });

  it("returns an empty array when start is after end", () => {
    const start = new Date(2026, 0, 5);
    const end = new Date(2026, 0, 1);
    expect(eachDay(start, end)).toHaveLength(0);
  });

  it("spans across month boundaries", () => {
    const start = new Date(2026, 0, 30);
    const end = new Date(2026, 1, 2);
    const days = eachDay(start, end);
    expect(days).toHaveLength(4);
    expect(days[2]).toEqual(new Date(2026, 1, 1));
  });
});

describe("quarterKey", () => {
  it("returns Q1 for January", () => {
    expect(quarterKey(new Date(2026, 0, 15))).toBe("2026Q1");
  });

  it("returns Q1 for March", () => {
    expect(quarterKey(new Date(2026, 2, 31))).toBe("2026Q1");
  });

  it("returns Q2 for April", () => {
    expect(quarterKey(new Date(2026, 3, 1))).toBe("2026Q2");
  });

  it("returns Q3 for July", () => {
    expect(quarterKey(new Date(2026, 6, 1))).toBe("2026Q3");
  });

  it("returns Q4 for December", () => {
    expect(quarterKey(new Date(2026, 11, 31))).toBe("2026Q4");
  });
});

describe("quarterBounds", () => {
  it("returns correct bounds for Q1", () => {
    const { start, end } = quarterBounds(2026, 1);
    expect(start).toEqual(new Date(2026, 0, 1));
    expect(end).toEqual(new Date(2026, 2, 31));
  });

  it("returns correct bounds for Q2", () => {
    const { start, end } = quarterBounds(2026, 2);
    expect(start).toEqual(new Date(2026, 3, 1));
    expect(end).toEqual(new Date(2026, 5, 30));
  });

  it("returns correct bounds for Q3", () => {
    const { start, end } = quarterBounds(2026, 3);
    expect(start).toEqual(new Date(2026, 6, 1));
    expect(end).toEqual(new Date(2026, 8, 30));
  });

  it("returns correct bounds for Q4", () => {
    const { start, end } = quarterBounds(2026, 4);
    expect(start).toEqual(new Date(2026, 9, 1));
    expect(end).toEqual(new Date(2026, 11, 31));
  });
});

describe("inferAssignee", () => {
  it("extracts 'a.pushkin' pattern", () => {
    expect(inferAssignee("a.pushkin")).toBe("a.pushkin");
  });

  it("extracts assignee from surrounding text", () => {
    expect(inferAssignee("Assigned to i.ivanov in project")).toBe("i.ivanov");
  });

  it("returns null when no match found", () => {
    expect(inferAssignee("no-dots-here")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(inferAssignee(123)).toBeNull();
    expect(inferAssignee(null)).toBeNull();
    expect(inferAssignee(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(inferAssignee("")).toBeNull();
  });
});

describe("parseNumber", () => {
  it("returns the number when given a number", () => {
    expect(parseNumber(42)).toBe(42);
  });

  it("returns zero when given zero", () => {
    expect(parseNumber(0)).toBe(0);
  });

  it("parses a string number", () => {
    expect(parseNumber("123")).toBe(123);
  });

  it("parses a comma-decimal string '3,5' as 3.5", () => {
    expect(parseNumber("3,5")).toBe(3.5);
  });

  it("returns null for a non-numeric string", () => {
    expect(parseNumber("abc")).toBeNull();
  });

  it("returns null for null", () => {
    expect(parseNumber(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseNumber(undefined)).toBeNull();
  });

  it("returns null for objects", () => {
    expect(parseNumber({})).toBeNull();
  });
});

describe("parseEstimateToSeconds", () => {
  it("returns null for null", () => {
    expect(parseEstimateToSeconds(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseEstimateToSeconds(undefined)).toBeNull();
  });

  it("treats a number as minutes and converts to seconds (60 -> 3600)", () => {
    expect(parseEstimateToSeconds(60)).toBe(3600);
  });

  it("treats a string number as minutes ('120' -> 7200)", () => {
    expect(parseEstimateToSeconds("120")).toBe(7200);
  });

  it("returns null for NaN number", () => {
    expect(parseEstimateToSeconds(NaN)).toBeNull();
  });

  it("parses weeks '3н' (3 weeks = 3 * 5 * 8h = 120h = 432000s)", () => {
    expect(parseEstimateToSeconds("3н")).toBe(3 * 5 * 28800);
  });

  it("parses days '5д' (5 days = 5 * 8h = 144000s)", () => {
    expect(parseEstimateToSeconds("5д")).toBe(5 * 28800);
  });

  it("parses hours '3ч' (3 hours = 10800s)", () => {
    expect(parseEstimateToSeconds("3ч")).toBe(3 * 3600);
  });

  it("parses combined '1н 2д 3ч'", () => {
    const expected = 1 * 5 * 28800 + 2 * 28800 + 3 * 3600;
    expect(parseEstimateToSeconds("1н 2д 3ч")).toBe(expected);
  });

  it("parses decimal values '1,5ч'", () => {
    expect(parseEstimateToSeconds("1,5ч")).toBe(1.5 * 3600);
  });

  it("returns null for empty string", () => {
    expect(parseEstimateToSeconds("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseEstimateToSeconds("   ")).toBeNull();
  });

  it("returns null for an invalid string with no recognized units", () => {
    expect(parseEstimateToSeconds("abc")).toBeNull();
  });

  it("returns null for non-string non-number types", () => {
    expect(parseEstimateToSeconds({})).toBeNull();
    expect(parseEstimateToSeconds([])).toBeNull();
    expect(parseEstimateToSeconds(true)).toBeNull();
  });

  it("handles comma-decimal string as minutes ('3,5' -> 3.5 * 60)", () => {
    expect(parseEstimateToSeconds("3,5")).toBe(3.5 * 60);
  });
});
