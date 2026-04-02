import { endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";

import { Assignee, CustomTask, DayLoad, Sprint, WorkloadResponse } from "../types";
import {
  boardPalette,
  getAssigneeNoteColor,
  getTaskColor,
  type ThemeMode
} from "../theme/boardPalette";
import { buildTimeline, getDateRange } from "../utils/date";
import { GanttLegend } from "./GanttLegend";

type GanttBoardProps = {
  data: WorkloadResponse;
  sprints?: Sprint[];
  startSprintId?: string | null;
  theme?: ThemeMode;
  customTasks?: CustomTask[];
  holidays?: string[];
  releaseDates?: string[];
  taskStartDates?: Record<string, string>;
  onTaskStartDatesChange?: (next: Record<string, string>) => void;
};

const NAME_COLUMN_WIDTH = 180;
const SPRINT_BAR_HEIGHT = 24;
const MONTH_BAR_HEIGHT = 22;
const DAY_LABEL_HEIGHT = 18;
const HEADER_HEIGHT =
  SPRINT_BAR_HEIGHT + MONTH_BAR_HEIGHT + DAY_LABEL_HEIGHT + 8;
const ROW_HEIGHT = 160; // Увеличено вдвое
const DAY_WIDTH = 40;
const ROW_PADDING = 10;
const STACK_GAP = 36; // Увеличено вдвое

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const collectDays = (assignee: Assignee) => {
  const map = new Map<string, DayLoad>();
  assignee.periods.forEach((period) => {
    period.days.forEach((day) => {
      map.set(day.date, day);
    });
  });
  return map;
};

export function GanttBoard({
  data,
  sprints = [],
  startSprintId = null,
  theme = "dark",
  customTasks = [],
  holidays = [],
  releaseDates = [],
  taskStartDates = {},
  onTaskStartDatesChange
}: GanttBoardProps) {
  const holidaysSet = useMemo(() => new Set(holidays), [holidays]);
  const releaseDatesSet = useMemo(() => new Set(releaseDates), [releaseDates]);
  const offsetX = 0;

  const validSprints = sprints
    .map((sprint) => ({
      ...sprint,
      startDate: parseISO(sprint.start),
      endDate: parseISO(sprint.end)
    }))
    .filter(
      (sprint) =>
        sprint.start &&
        sprint.end &&
        !Number.isNaN(sprint.startDate.getTime()) &&
        !Number.isNaN(sprint.endDate.getTime()) &&
        sprint.startDate <= sprint.endDate
    );

  const sortedSprints = [...validSprints].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );
  const startSprint =
    (startSprintId && sortedSprints.find((sprint) => sprint.id === startSprintId)) ||
    sortedSprints[0];
  const dataRange = getDateRange(data);
  const range = (() => {
    const sprintStart = startSprint?.startDate ?? sortedSprints[0]?.startDate;
    const sprintEnd = sortedSprints.length > 0
      ? sortedSprints[sortedSprints.length - 1].endDate
      : null;

    // When sprints are defined, use sprint boundaries for the calendar range.
    // Task bars are already clamped to the sprint start in buildTaskRanges(),
    // so there is no need to extend the calendar to accommodate old task dates.
    const earliest = sprintStart
      ? sprintStart
      : dataRange?.start ?? new Date(new Date().getFullYear(), 0, 1);
    const latest = sprintEnd
      ? new Date(Math.max(sprintEnd.getTime(), dataRange?.end?.getTime() ?? 0))
      : dataRange?.end ?? new Date(new Date().getFullYear(), 11, 31);

    return {
      start: startOfWeek(earliest, { weekStartsOn: 1 }),
      end: endOfWeek(latest, { weekStartsOn: 1 })
    };
  })();
  const timeline = useMemo(() => {
    if (!range) return null;
    return buildTimeline(range.start, range.end);
  }, [range]);

  // Пан/зум отключены, сетка закреплена.

  if (!timeline) {
    return <div className="text-sm text-slate-500">Нет данных для рендера.</div>;
  }

  const { days, months } = timeline;
  const workDays = useMemo(
    () =>
      days.filter(
        (day) =>
          ![0, 6].includes(day.getDay()) && !holidaysSet.has(format(day, "yyyy-MM-dd"))
      ),
    [days, holidaysSet]
  );
  const { weekendPositions, holidayPositions } = useMemo(() => {
    let workdayX = 0;
    const weekend: Array<{ x: number; day: Date }> = [];
    const holiday: Array<{ x: number; day: Date }> = [];
    days.forEach((day) => {
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      const isHol = holidaysSet.has(format(day, "yyyy-MM-dd"));
      if (isWeekend) {
        weekend.push({ x: workdayX, day });
      } else if (isHol) {
        holiday.push({ x: workdayX, day });
      } else {
        workdayX += DAY_WIDTH;
      }
    });
    return { weekendPositions: weekend, holidayPositions: holiday };
  }, [days, holidaysSet]);

  const dayMeta = useMemo(() => {
    let acc = 0;
    const meta = workDays.map((day) => {
      const x = acc;
      acc += DAY_WIDTH;
      return { day, x, width: DAY_WIDTH };
    });
    return { meta, totalWidth: acc };
  }, [workDays]);

  const releaseDayMeta = useMemo(
    () =>
      dayMeta.meta.filter((m) =>
        releaseDatesSet.has(format(m.day, "yyyy-MM-dd"))
      ),
    [dayMeta.meta, releaseDatesSet]
  );

  const totalWidth = NAME_COLUMN_WIDTH + dayMeta.totalWidth;

  const dayIndex = useMemo(
    () => new Map(days.map((day, index) => [format(day, "yyyy-MM-dd"), index])),
    [days]
  );
  const workDayIndex = useMemo(
    () => new Map(workDays.map((day, index) => [format(day, "yyyy-MM-dd"), index])),
    [workDays]
  );

  const buildTaskRanges = (assignee: Assignee) => {
    const dayMap = collectDays(assignee);
    const taskMap = new Map<
      string,
      { start: Date; load: number; tasks: string[]; dayCount: number }
    >();

    dayMap.forEach((day) => {
      if (!day.tasks.length) return;
      const date = parseISO(day.date);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const share = day.load / day.tasks.length;
      day.tasks.forEach((task) => {
        const existing = taskMap.get(task);
        if (!existing) {
          taskMap.set(task, { start: date, load: share, tasks: [task], dayCount: 1 });
          return;
        }
        if (date < existing.start) existing.start = date;
        existing.load += share;
        if (
          ![0, 6].includes(date.getDay()) &&
          !holidaysSet.has(format(date, "yyyy-MM-dd"))
        ) {
          existing.dayCount += 1;
        }
      });
    });

    // If a sprint is defined, clamp task start dates so they begin no earlier
    // than the start of the first visible sprint. This prevents tasks with
    // Period dates far in the past from floating off-screen to the left.
    const earliestSprintStart = startSprint?.startDate ?? sortedSprints[0]?.startDate;

    const baseTasks = Array.from(taskMap.entries()).map(([taskId, payload]) => {
      const title = data.taskTitles?.[taskId] || null;
      const type = data.taskTypes?.[taskId] || null;
      const estimateDays = data.taskEstimates?.[taskId];
      const widthDays =
        estimateDays != null && estimateDays > 0
          ? Math.max(1, Math.ceil(estimateDays))
          : Math.max(1, payload.dayCount);
      const taskStart =
        earliestSprintStart && payload.start < earliestSprintStart
          ? earliestSprintStart
          : payload.start;
      return {
        id: taskId,
        label: taskId,
        title: title,
        type: type,
        start: taskStart,
        load: payload.load,
        widthDays
      };
    });
    const custom = customTasks
      .filter((task) => task.assignee === assignee.name)
      .map((task) => ({
        id: `custom-${task.id}`,
        label: task.type === "task" ? task.taskIdentifier ?? task.title : task.title,
        title: task.type === "task" ? task.title : null,
        type: task.type === "task" ? task.taskKind ?? "TASK" : task.type,
        start: parseISO(task.start),
        load: task.durationDays,
        widthDays: Math.max(1, Math.ceil(task.estimateDays ?? task.durationDays))
      }));
    return [...baseTasks, ...custom];
  };

  const [dragState, setDragState] = useState<{
    taskId: string | null;
    startX: number;
    startOffset: number;
  }>({ taskId: null, startX: 0, startOffset: 0 });
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;
  const [dragOffsets, setDragOffsets] = useState<Record<string, number>>({});
  const dragOffsetsRef = useRef(dragOffsets);
  dragOffsetsRef.current = dragOffsets;
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const rowLayout = useMemo(() => {
    return data.assignees.map((assignee) => {
      const tasks = buildTaskRanges(assignee).sort(
        (a, b) => a.start.getTime() - b.start.getTime()
      );
      const height = Math.max(ROW_HEIGHT, ROW_PADDING * 2 + tasks.length * STACK_GAP);
      return { assignee, tasks, height };
    });
  }, [data, customTasks, sortedSprints, startSprintId]);

  const rowOffsets = useMemo(() => {
    let acc = 0;
    return rowLayout.map((row) => {
      const offset = acc;
      acc += row.height;
      return { ...row, offset };
    });
  }, [rowLayout]);

  const totalHeight =
    HEADER_HEIGHT + rowLayout.reduce((sum, row) => sum + row.height, 0) + 40;

  const taskPlacementMeta = useMemo(() => {
    const meta = new Map<string, { baseStartIndex: number; widthDays: number }>();
    rowLayout.forEach((row) => {
      row.tasks.forEach((task) => {
        const taskId = `${row.assignee.name}::${task.id}`;
        const startKey = taskStartDates[taskId] ?? format(task.start, "yyyy-MM-dd");
        const baseStartIndex = dayIndex.get(startKey);
        if (baseStartIndex === undefined) {
          return;
        }
        meta.set(taskId, {
          baseStartIndex,
          widthDays: task.widthDays
        });
      });
    });
    return meta;
  }, [dayIndex, rowLayout, taskStartDates]);

  const taskPlacementMetaRef = useRef(taskPlacementMeta);
  taskPlacementMetaRef.current = taskPlacementMeta;
  const taskStartDatesRef = useRef(taskStartDates);
  taskStartDatesRef.current = taskStartDates;
  const onTaskStartDatesChangeRef = useRef(onTaskStartDatesChange);
  onTaskStartDatesChangeRef.current = onTaskStartDatesChange;

  useEffect(() => {
    if (!dragState.taskId) return;
    const handleMove = (event: PointerEvent) => {
      const ds = dragStateRef.current;
      const deltaX = event.clientX - ds.startX;
      const deltaDays = Math.round(deltaX / DAY_WIDTH);
      setDragOffsets((prev) => ({
        ...prev,
        [ds.taskId as string]: ds.startOffset + deltaDays
      }));
    };
    const handleUp = () => {
      const ds = dragStateRef.current;
      const taskId = ds.taskId;
      const onChange = onTaskStartDatesChangeRef.current;
      if (taskId && onChange) {
        const placement = taskPlacementMetaRef.current.get(taskId);
        if (placement) {
          const rawOffset = dragOffsetsRef.current[taskId] ?? 0;
          const adjustedStartIndex = applyWorkdayOffset(placement.baseStartIndex, rawOffset);
          const adjustedDay = days[adjustedStartIndex];
          if (adjustedDay) {
            onChange({
              ...taskStartDatesRef.current,
              [taskId]: format(adjustedDay, "yyyy-MM-dd")
            });
          }
        }
      }
      setDragOffsets((prev) => {
        if (!ds.taskId) return prev;
        const next = { ...prev };
        delete next[ds.taskId];
        return next;
      });
      setDragState({ taskId: null, startX: 0, startOffset: 0 });
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [days, dragState.taskId, holidaysSet]);

  const boardColors = boardPalette[theme];

  const xForIndex = (index: number) => {
    const day = days[index];
    const workIndex = workDayIndex.get(format(day, "yyyy-MM-dd"));
    if (workIndex === undefined) {
      let workdayX = 0;
      for (let i = 0; i < index; i += 1) {
        const d = days[i];
        if (
          ![0, 6].includes(d.getDay()) &&
          !holidaysSet.has(format(d, "yyyy-MM-dd"))
        ) {
          workdayX += DAY_WIDTH;
        }
      }
      return NAME_COLUMN_WIDTH + workdayX;
    }
    return NAME_COLUMN_WIDTH + dayMeta.meta[workIndex].x;
  };
  const endXForIndex = (index: number) => {
    const day = days[index];
    const workIndex = workDayIndex.get(format(day, "yyyy-MM-dd"));
    if (workIndex === undefined) {
      return xForIndex(index);
    }
    return NAME_COLUMN_WIDTH + dayMeta.meta[workIndex].x + dayMeta.meta[workIndex].width;
  };

  const computeEndIndex = (startIndex: number, workdayCount: number) => {
    let remaining = Math.max(1, Math.round(workdayCount));
    let index = startIndex;
    while (index < days.length && remaining > 0) {
      const day = days[index];
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      const isHol = holidaysSet.has(format(day, "yyyy-MM-dd"));
      if (!isWeekend && !isHol) {
        remaining -= 1;
      }
      if (remaining > 0) {
        index += 1;
      }
    }
    return Math.min(days.length - 1, index);
  };

  const applyWorkdayOffset = (fromIndex: number, workdayDelta: number): number => {
    if (workdayDelta === 0) return fromIndex;
    let index = fromIndex;
    let remaining = Math.abs(workdayDelta);
    const step = workdayDelta > 0 ? 1 : -1;
    while (remaining > 0) {
      index += step;
      if (index < 0 || index >= days.length) {
        return clamp(index, 0, days.length - 1);
      }
      const day = days[index];
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      const isHol = holidaysSet.has(format(day, "yyyy-MM-dd"));
      if (!isWeekend && !isHol) {
        remaining -= 1;
      }
    }
    return index;
  };

  const headerElements = useMemo(() => (
    <g>
      {sortedSprints.map((sprint) => {
        const si = dayIndex.get(format(sprint.startDate, "yyyy-MM-dd")) ?? 0;
        const ei = dayIndex.get(format(sprint.endDate, "yyyy-MM-dd")) ?? 0;
        const x = xForIndex(si);
        const w = endXForIndex(ei) - x;
        return (
          <g key={sprint.id}>
            <rect x={x} y={0} width={w} height={SPRINT_BAR_HEIGHT} fill={boardColors.sprintFill} opacity={0.5} rx={8} />
            <text x={x + 6} y={16} fontSize={11} fill={boardColors.headerText}>{sprint.name || "Спринт"}</text>
          </g>
        );
      })}
      {months.map((month) => {
        const si = dayIndex.get(format(month.start, "yyyy-MM-dd")) ?? 0;
        const ei = dayIndex.get(format(month.end, "yyyy-MM-dd")) ?? si;
        const x = xForIndex(si);
        const w = endXForIndex(ei) - x;
        return (
          <g key={month.label}>
            <rect x={x} y={SPRINT_BAR_HEIGHT + 2} width={w} height={MONTH_BAR_HEIGHT} fill={boardColors.monthFill} opacity={0.12} />
            <text x={x + 8} y={SPRINT_BAR_HEIGHT + 2 + 15} fontSize={12} fill={boardColors.metaText}>{month.label}</text>
          </g>
        );
      })}
      {dayMeta.meta.map(({ day, x }) => (
        <text key={`day-${day.toISOString()}`} x={NAME_COLUMN_WIDTH + x + 6} y={HEADER_HEIGHT - 6} fontSize={9} fill={boardColors.metaText}>
          {format(day, "d")}
        </text>
      ))}
      {weekendPositions.map(({ x, day }) => (
        <text key={`weekend-text-${day.toISOString()}`} x={NAME_COLUMN_WIDTH + x + 8} y={HEADER_HEIGHT - 6} fontSize={9} fill={boardColors.weekendText} opacity={0.7}>
          {format(day, "d")}
        </text>
      ))}
    </g>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [sortedSprints, months, dayMeta.meta, weekendPositions, dayIndex, boardColors]);

  const gridElements = useMemo(() => (
    <>
      {releaseDayMeta.map(({ day, x }) => (
        <rect key={`release-bg-${day.toISOString()}`} x={NAME_COLUMN_WIDTH + x} y={HEADER_HEIGHT - 8} width={DAY_WIDTH} height={totalHeight - (HEADER_HEIGHT - 8)} fill={boardColors.releaseBg} opacity={0.4} />
      ))}
      {dayMeta.meta.map(({ day, x }) => (
        <line key={day.toISOString()} x1={NAME_COLUMN_WIDTH + x} x2={NAME_COLUMN_WIDTH + x} y1={HEADER_HEIGHT - 8} y2={totalHeight} stroke={boardColors.gridStroke} />
      ))}
      {releaseDayMeta.map(({ day, x }) => (
        <line key={`release-line-${day.toISOString()}`} x1={NAME_COLUMN_WIDTH + x + DAY_WIDTH / 2} x2={NAME_COLUMN_WIDTH + x + DAY_WIDTH / 2} y1={HEADER_HEIGHT - 8} y2={totalHeight} stroke={boardColors.releaseLine} strokeWidth={2} opacity={0.9} />
      ))}
      {weekendPositions.map(({ x, day }) => (
        <line key={`weekend-line-${day.toISOString()}`} x1={NAME_COLUMN_WIDTH + x} x2={NAME_COLUMN_WIDTH + x} y1={HEADER_HEIGHT - 8} y2={totalHeight} stroke={boardColors.weekendLine} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.7} />
      ))}
      {holidayPositions.map(({ x, day }) => (
        <line key={`holiday-line-${day.toISOString()}`} x1={NAME_COLUMN_WIDTH + x} x2={NAME_COLUMN_WIDTH + x} y1={HEADER_HEIGHT - 8} y2={totalHeight} stroke={boardColors.holidayLine} strokeWidth={1} strokeDasharray="2 2" opacity={0.5} />
      ))}
    </>
  ), [releaseDayMeta, dayMeta.meta, weekendPositions, holidayPositions, totalHeight, boardColors]);

  return (
    <div className="relative w-full overflow-auto rounded-card border border-slate-700/20 bg-white/70 p-4 shadow-soft dark:bg-slate-900/60">
      <div className="pointer-events-none absolute left-0 top-0 z-20 w-[180px]">
        <div
          className="sticky left-0 top-0 h-full bg-surface-card backdrop-blur-sm dark:bg-surface-card"
          style={{ paddingTop: HEADER_HEIGHT }}
        >
          {rowOffsets.map((row) => (
            <div
              key={row.assignee.name}
              className="flex items-center border-b border-slate-500/10 px-4 text-sm text-slate-700 dark:text-slate-200"
              style={{ height: row.height }}
            >
              <span className="rounded-lg border border-slate-400/30 bg-slate-100/50 px-3 py-1 dark:border-slate-600/40 dark:bg-slate-800/50">
                {row.assignee.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      <svg width={totalWidth} height={totalHeight} className="min-w-full">
        <rect width={totalWidth} height={totalHeight} fill="transparent" />

        {headerElements}

        <g transform={`translate(${offsetX}, 0)`}>
          {gridElements}

          {rowOffsets.map((row) => {
            const y = HEADER_HEIGHT + row.offset;
            return (
              <g key={row.assignee.name}>
                <line
                  x1={NAME_COLUMN_WIDTH}
                  x2={totalWidth}
                  y1={y}
                  y2={y}
                  stroke={boardColors.rowStroke}
                />
                <line
                  x1={NAME_COLUMN_WIDTH}
                  x2={totalWidth}
                  y1={y + row.height}
                  y2={y + row.height}
                  stroke={boardColors.rowStroke}
                />

                {row.tasks.map((task, taskIndex) => {
                  const taskId = `${row.assignee.name}::${task.id}`;
                  const startKey = taskStartDates[taskId] ?? format(task.start, "yyyy-MM-dd");
                  const startIndex = dayIndex.get(startKey);
                  if (startIndex === undefined) return null;
                  const baseOffset = dragOffsets[taskId] ?? 0;
                  const widthDays = task.widthDays;
                  const adjustedStartIndex = applyWorkdayOffset(startIndex, baseOffset);
                  const adjustedEndIndex = computeEndIndex(adjustedStartIndex, widthDays);
                  const x = xForIndex(adjustedStartIndex) + 2;
                  const width = Math.max(
                    8,
                    endXForIndex(adjustedEndIndex) - xForIndex(adjustedStartIndex) - 4
                  );
                  const barHeight = 32; // Увеличено вдвое
                  const barY = y + ROW_PADDING + taskIndex * STACK_GAP;
                  const taskType = 'type' in task ? task.type : null;
                  const taskTitle = 'title' in task ? task.title : null;
                  const tooltipText = taskTitle ? `${task.label}\n${taskTitle}` : task.label;
                  const isActiveDrag = dragState.taskId === taskId;
                  const isHovered = hoveredTaskId === taskId;
                  return (
                    <g
                      key={taskId}
                      onPointerDown={(event) =>
                        setDragState({
                          taskId,
                          startX: event.clientX,
                          startOffset: baseOffset
                        })
                      }
                      onPointerEnter={() => setHoveredTaskId(taskId)}
                      onPointerLeave={() => setHoveredTaskId((prev) => (prev === taskId ? null : prev))}
                      style={{ cursor: isActiveDrag ? "grabbing" : "grab" }}
                    >
                      <title>{tooltipText}</title>
                      <rect
                        x={x}
                        y={barY}
                        width={width}
                        height={barHeight}
                        rx={6}
                        fill={getTaskColor(taskType)}
                        opacity={isActiveDrag ? 1 : isHovered ? 0.95 : 0.85}
                        stroke={getAssigneeNoteColor(row.assignee.name)}
                        strokeWidth={isActiveDrag ? 2 : isHovered ? 1.5 : 1}
                      />
                      {/* Первая строка - тип и ID задачи */}
                      <text
                        x={x + 6}
                        y={barY + 12}
                        fontSize={10}
                        fill={boardColors.taskPrimaryText}
                        fontWeight="600"
                      >
                        {taskType ? `${taskType} · ${task.label}` : task.label}
                      </text>
                      {/* Вторая строка - название задачи (если есть) */}
                      {taskTitle && (
                        <text
                          x={x + 6}
                          y={barY + 24}
                          fontSize={9}
                          fill={boardColors.taskSecondaryText}
                          width={width - 12}
                        >
                          {(() => {
                            // Обрезаем текст в зависимости от ширины задачи
                            const maxChars = Math.floor((width - 12) / 5); // Примерно 5px на символ для fontSize 8
                            return taskTitle.length > maxChars
                              ? `${taskTitle.substring(0, maxChars - 3)}...`
                              : taskTitle;
                          })()}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>

        <g>
          {sortedSprints.map((sprint) => {
            const startIndex =
              dayIndex.get(format(sprint.startDate, "yyyy-MM-dd")) ?? 0;
            const endIndex =
              dayIndex.get(format(sprint.endDate, "yyyy-MM-dd")) ?? 0;
            const startX = xForIndex(startIndex);
            const endX = endXForIndex(endIndex);
            return (
              <g key={`${sprint.id}-bounds-static`}>
                <line
                  x1={startX}
                  x2={startX}
                  y1={HEADER_HEIGHT - 8}
                  y2={totalHeight}
                  stroke={boardColors.sprintBoundary}
                  strokeOpacity={0.6}
                  strokeDasharray="4 4"
                />
                <line
                  x1={endX}
                  x2={endX}
                  y1={HEADER_HEIGHT - 8}
                  y2={totalHeight}
                  stroke={boardColors.sprintBoundary}
                  strokeOpacity={0.4}
                  strokeDasharray="4 4"
                />
              </g>
            );
          })}
        </g>
      </svg>

      <GanttLegend />
    </div>
  );
}
