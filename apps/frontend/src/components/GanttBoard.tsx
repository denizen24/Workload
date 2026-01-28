import { select } from "d3-selection";
import { zoom, ZoomTransform } from "d3-zoom";
import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";

import { Assignee, DayLoad, ReleaseMarker, WorkloadResponse } from "../types";
import { buildTimeline, getDateRange, quarterOf } from "../utils/date";

type GanttBoardProps = {
  data: WorkloadResponse;
};

const NAME_COLUMN_WIDTH = 180;
const HEADER_HEIGHT = 70;
const ROW_HEIGHT = 60;
const DAY_WIDTH = 26;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const loadColor = (load: number) => {
  if (load > 0.8) return "#f87171";
  if (load > 0.5) return "#facc15";
  return "#4ade80";
};

const noteColor = (assignee: string) => {
  if (assignee.startsWith("a.")) return "#fef08a";
  if (assignee.startsWith("s.")) return "#bbf7d0";
  return "#fbcfe8";
};

const collectDays = (assignee: Assignee) => {
  const map = new Map<string, DayLoad>();
  assignee.periods.forEach((period) => {
    period.days.forEach((day) => {
      map.set(day.date, day);
    });
  });
  return map;
};

export function GanttBoard({ data }: GanttBoardProps) {
  const zoomRef = useRef<SVGSVGElement | null>(null);
  const [transform, setTransform] = useState<ZoomTransform>({
    x: 0,
    y: 0,
    k: 1
  } as ZoomTransform);

  const range = getDateRange(data);
  const timeline = useMemo(() => {
    if (!range) return null;
    return buildTimeline(range.start, range.end);
  }, [range]);

  useEffect(() => {
    if (!zoomRef.current) return;
    const svg = select(zoomRef.current);
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.6, 2.8])
      .on("zoom", (event) => {
        setTransform(event.transform);
      });
    svg.call(zoomBehavior as never);
  }, []);

  if (!timeline) {
    return <div className="text-sm text-slate-500">Нет данных для рендера.</div>;
  }

  const { days, months } = timeline;
  const totalWidth = NAME_COLUMN_WIDTH + days.length * DAY_WIDTH;
  const totalHeight = HEADER_HEIGHT + data.assignees.length * ROW_HEIGHT + 40;

  const quarterBlocks = days.reduce((acc, day) => {
    const quarterKey = `${day.getFullYear()}Q${quarterOf(day)}`;
    const last = acc[acc.length - 1];
    if (!last || last.label !== quarterKey) {
      acc.push({ label: quarterKey, start: day, end: day });
    } else {
      last.end = day;
    }
    return acc;
  }, [] as { label: string; start: Date; end: Date }[]);

  const dayIndex = new Map(days.map((day, index) => [format(day, "yyyy-MM-dd"), index]));

  return (
    <div className="relative w-full overflow-auto rounded-2xl border border-slate-700/20 bg-white/70 p-4 shadow-sm dark:bg-slate-900/60">
      <svg
        ref={zoomRef}
        width={totalWidth}
        height={totalHeight}
        className="min-w-full"
      >
        <rect width={totalWidth} height={totalHeight} fill="transparent" />

        <g>
          {months.map((month) => {
            const startIndex = dayIndex.get(format(month.start, "yyyy-MM-dd")) ?? 0;
            const endIndex =
              dayIndex.get(format(month.end, "yyyy-MM-dd")) ?? startIndex;
            const x = NAME_COLUMN_WIDTH + startIndex * DAY_WIDTH;
            const width = (endIndex - startIndex + 1) * DAY_WIDTH;
            return (
              <g key={month.label}>
                <rect
                  x={x}
                  y={0}
                  width={width}
                  height={28}
                  fill="#0f172a"
                  opacity={0.08}
                />
                <text x={x + 8} y={18} fontSize={12} fill="#94a3b8">
                  {month.label}
                </text>
              </g>
            );
          })}

          {quarterBlocks.map((quarter) => {
            const startIndex = dayIndex.get(format(quarter.start, "yyyy-MM-dd")) ?? 0;
            const endIndex = dayIndex.get(format(quarter.end, "yyyy-MM-dd")) ?? 0;
            const x = NAME_COLUMN_WIDTH + startIndex * DAY_WIDTH;
            const width = (endIndex - startIndex + 1) * DAY_WIDTH;
            return (
              <rect
                key={quarter.label}
                x={x}
                y={30}
                width={width}
                height={22}
                fill="#7c3aed"
                opacity={0.25}
              />
            );
          })}
        </g>

        <g
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
        >
          {days.map((day, index) => (
            <line
              key={day.toISOString()}
              x1={NAME_COLUMN_WIDTH + index * DAY_WIDTH}
              x2={NAME_COLUMN_WIDTH + index * DAY_WIDTH}
              y1={HEADER_HEIGHT - 10}
              y2={totalHeight}
              stroke="#1e293b"
              strokeOpacity={0.06}
            />
          ))}

          {data.releases.map((release) => {
            const index = dayIndex.get(release.date);
            if (index === undefined) return null;
            const x = NAME_COLUMN_WIDTH + index * DAY_WIDTH;
            return (
              <g key={release.name}>
                <line
                  x1={x}
                  x2={x}
                  y1={HEADER_HEIGHT - 10}
                  y2={totalHeight}
                  stroke="#ef4444"
                  strokeWidth={2}
                />
                <text x={x + 4} y={HEADER_HEIGHT - 16} fontSize={11} fill="#ef4444">
                  {release.name}
                </text>
              </g>
            );
          })}

          {data.assignees.map((assignee, rowIndex) => {
            const y = HEADER_HEIGHT + rowIndex * ROW_HEIGHT;
            const dayMap = collectDays(assignee);
            return (
              <g key={assignee.name}>
                <rect
                  x={0}
                  y={y}
                  width={NAME_COLUMN_WIDTH}
                  height={ROW_HEIGHT}
                  fill="transparent"
                />
                <text x={16} y={y + 34} fontSize={14} fill="#e2e8f0">
                  {assignee.name}
                </text>

                {days.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const cell = dayMap.get(dateKey);
                  if (!cell || cell.load <= 0) return null;
                  const index = dayIndex.get(dateKey) ?? 0;
                  const x = NAME_COLUMN_WIDTH + index * DAY_WIDTH + 2;
                  const height = clamp(cell.load * 42, 10, ROW_HEIGHT - 12);
                  const noteY = y + (ROW_HEIGHT - height) / 2;
                  const color = loadColor(cell.load);
                  const label = cell.tasks[0] ?? "";
                  return (
                    <g key={`${assignee.name}-${dateKey}`}>
                      <rect
                        x={x}
                        y={noteY}
                        width={DAY_WIDTH - 4}
                        height={height}
                        rx={4}
                        fill={color}
                        opacity={0.85}
                        stroke={noteColor(assignee.name)}
                        strokeWidth={1}
                      />
                      <text x={x + 4} y={noteY + 12} fontSize={9} fill="#0f172a">
                        {label}
                      </text>
                      {cell.qaLoad && cell.qaLoad > 0 && (
                        <line
                          x1={x}
                          x2={x + DAY_WIDTH - 4}
                          y1={y + ROW_HEIGHT - 8}
                          y2={y + ROW_HEIGHT - 8}
                          stroke="#38bdf8"
                          strokeWidth={2}
                        />
                      )}
                      {cell.spLoad && cell.spLoad > 0 && (
                        <line
                          x1={x}
                          x2={x + DAY_WIDTH - 4}
                          y1={y + ROW_HEIGHT - 4}
                          y2={y + ROW_HEIGHT - 4}
                          stroke="#a855f7"
                          strokeWidth={2}
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
