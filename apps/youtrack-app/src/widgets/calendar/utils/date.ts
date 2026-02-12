import { eachDayOfInterval, endOfMonth, format, parseISO } from "date-fns";

import { WorkloadResponse } from "../types";

export function getDateRange(data: WorkloadResponse | null) {
  if (!data || data.assignees.length === 0) {
    return null;
  }
  const allDates: Date[] = [];
  data.assignees.forEach((assignee) => {
    assignee.periods.forEach((period) => {
      period.days.forEach((day) => {
        allDates.push(parseISO(day.date));
      });
    });
  });
  if (!allDates.length) return null;
  const min = new Date(Math.min(...allDates.map((date) => date.getTime())));
  const max = new Date(Math.max(...allDates.map((date) => date.getTime())));
  return { start: min, end: max };
}

export function buildTimeline(start: Date, end: Date) {
  const days = eachDayOfInterval({ start, end });
  const months = days.reduce(
    (acc, day) => {
      const key = format(day, "yyyy-MM");
      if (!acc[key]) {
        acc[key] = {
          label: format(day, "MMM yyyy"),
          start: day,
          end: endOfMonth(day)
        };
      }
      return acc;
    },
    {} as Record<string, { label: string; start: Date; end: Date }>
  );
  return { days, months: Object.values(months) };
}
