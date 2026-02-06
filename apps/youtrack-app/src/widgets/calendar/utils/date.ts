import { addDays, endOfMonth, endOfWeek, format, startOfWeek } from "date-fns";

import { WorkloadResponse } from "../types";

export const buildTimeline = (start: Date, end: Date) => {
  const days: Date[] = [];
  const months: Array<{ label: string; start: Date; end: Date }> = [];

  let cursor = startOfWeek(start, { weekStartsOn: 1 });
  const endCursor = endOfWeek(end, { weekStartsOn: 1 });
  let monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);

  while (cursor <= endCursor) {
    days.push(new Date(cursor));
    if (cursor.getDate() === 1) {
      monthStart = new Date(cursor);
    }
    if (cursor.getDate() === endOfMonth(cursor).getDate()) {
      months.push({
        label: format(cursor, "LLLL yyyy"),
        start: monthStart,
        end: new Date(cursor)
      });
    }
    cursor = addDays(cursor, 1);
  }

  return { days, months };
};

export const getDateRange = (data: WorkloadResponse | null) => {
  if (!data) return null;
  const dates = data.assignees.flatMap((assignee) =>
    assignee.periods.flatMap((period) => period.days.map((day) => day.date))
  );
  if (!dates.length) return null;
  const sorted = dates.sort();
  return {
    start: new Date(sorted[0]),
    end: new Date(sorted[sorted.length - 1])
  };
};

export const quarterOf = (date: Date) => {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}Q${quarter}`;
};
