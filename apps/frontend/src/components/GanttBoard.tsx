import { endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { Assignee, CustomTask, DayLoad, Sprint, WorkloadResponse } from "../types";
import { buildTimeline, getDateRange, quarterOf } from "../utils/date";

type GanttBoardProps = {
  data: WorkloadResponse;
  sprints?: Sprint[];
  startSprintId?: string | null;
  theme?: "light" | "dark";
  customTasks?: CustomTask[];
  holidays?: string[];
  releaseDates?: string[];
};

const NAME_COLUMN_WIDTH = 180;
const SPRINT_BAR_HEIGHT = 24;
const MONTH_BAR_HEIGHT = 22;
const QUARTER_BAR_HEIGHT = 20;
const DAY_LABEL_HEIGHT = 18;
const HEADER_HEIGHT =
  SPRINT_BAR_HEIGHT + MONTH_BAR_HEIGHT + DAY_LABEL_HEIGHT + 8;
const ROW_HEIGHT = 160; // Увеличено вдвое
const DAY_WIDTH = 40;
const WEEKEND_WIDTH = 16;
const ROW_PADDING = 10;
const STACK_GAP = 36; // Увеличено вдвое

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const loadColor = (load: number, taskType: string | null | undefined = null) => {
  const lower = taskType?.toLowerCase() ?? "";

  const isFeatureOrTech =
    lower.includes("feature") ||
    lower.includes("feat") ||
    lower.includes("tech task") ||
    lower.includes("tech_task") ||
    lower === "tech";

  const isBug = lower.includes("bug");

  const isDuty = lower === "duty" || lower.includes("дежурство");

  if (isDuty) {
    // Жёлтый для дежурства
    if (load > 0.8) return "#ca8a04"; // yellow-600
    if (load > 0.5) return "#eab308"; // yellow-500
    return "#facc15"; // yellow-400
  }

  if (isFeatureOrTech) {
    // Немного темнее цвета для FEATURE и TECH TASK
    if (load > 0.8) return "#dc2626";
    if (load > 0.5) return "#ca8a04";
    return "#16a34a";
  }

  if (isBug) {
    // Оранжевый для BUG (разная насыщенность по нагрузке)
    if (load > 0.8) return "#c2410c"; // orange-700
    if (load > 0.5) return "#ea580c"; // orange-600
    return "#f97316"; // orange-500
  }

  // Обычные цвета для TASK и остальных
  if (load > 0.8) return "#f87171";
  if (load > 0.5) return "#facc15";
  return "#4ade80";
};

const isFeatureTask = (taskId: string, taskType: string | null | undefined, taskTypes?: Record<string, string | null>): boolean => {
  // Сначала проверяем тип задачи из данных (если доступен)
  const type = taskType ?? taskTypes?.[taskId];
  if (type) {
    const lowerType = type.toLowerCase();
    return (
      lowerType === "feature" ||
      lowerType === "feat" ||
      lowerType.includes("feature") ||
      lowerType.includes("feat")
    );
  }

  // Если тип не указан, проверяем по ID задачи
  const lowerId = taskId.toLowerCase();
  const upperId = taskId.toUpperCase();
  
  // Проверяем различные варианты написания feature/FEATURE
  return (
    lowerId.includes("feature") ||
    upperId.includes("FEATURE") ||
    lowerId.includes("feat") ||
    upperId.includes("FEAT") ||
    lowerId.startsWith("feat-") ||
    lowerId.startsWith("feat/") ||
    lowerId.startsWith("feat_") ||
    upperId.startsWith("FEAT-") ||
    upperId.startsWith("FEAT/") ||
    upperId.startsWith("FEAT_") ||
    lowerId.match(/^feat/i) !== null ||
    upperId.match(/^FEAT/i) !== null ||
    taskId.match(/FEATURE/i) !== null
  );
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

export function GanttBoard({
  data,
  sprints = [],
  startSprintId = null,
  theme = "dark",
  customTasks = [],
  holidays = [],
  releaseDates = []
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
  const range =
    sortedSprints.length > 0
      ? {
          start: startOfWeek(
            startSprint?.startDate ?? sortedSprints[0].startDate,
            { weekStartsOn: 1 }
          ),
          end: endOfWeek(sortedSprints[sortedSprints.length - 1].endDate, {
            weekStartsOn: 1
          })
        }
      : {
          start: startOfWeek(new Date(new Date().getFullYear(), 0, 1), {
            weekStartsOn: 1
          }),
          end: endOfWeek(dataRange?.end ?? new Date(new Date().getFullYear(), 11, 31), {
            weekStartsOn: 1
          })
        };
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

  const dayIndex = new Map(days.map((day, index) => [format(day, "yyyy-MM-dd"), index]));
  const workDayIndex = new Map(workDays.map((day, index) => [format(day, "yyyy-MM-dd"), index]));

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

    const baseTasks = Array.from(taskMap.entries()).map(([taskId, payload]) => {
      const title = data.taskTitles?.[taskId] || null;
      const type = data.taskTypes?.[taskId] || null;
      const estimateDays = data.taskEstimates?.[taskId];
      const widthDays =
        estimateDays != null && estimateDays > 0
          ? Math.max(1, Math.ceil(estimateDays))
          : Math.max(1, payload.dayCount);
      return {
        id: taskId,
        label: taskId,
        title: title,
        type: type,
        start: payload.start,
        load: payload.load,
        widthDays
      };
    });
    const custom = customTasks
      .filter((task) => task.assignee === assignee.name)
      .map((task) => ({
        id: `custom-${task.id}`,
        label: task.title,
        title: null,
        type: task.type,
        start: parseISO(task.start),
        load: task.durationDays,
        widthDays: Math.max(1, task.durationDays)
      }));
    return [...baseTasks, ...custom];
  };

  const [dragState, setDragState] = useState<{
    taskId: string | null;
    startX: number;
    startOffset: number;
  }>({ taskId: null, startX: 0, startOffset: 0 });
  const [dragOffsets, setDragOffsets] = useState<Record<string, number>>({});

  const rowLayout = useMemo(() => {
    return data.assignees.map((assignee) => {
      const tasks = buildTaskRanges(assignee).sort(
        (a, b) => a.start.getTime() - b.start.getTime()
      );
      const height = Math.max(ROW_HEIGHT, ROW_PADDING * 2 + tasks.length * STACK_GAP);
      return { assignee, tasks, height };
    });
  }, [data, customTasks]);

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

  useEffect(() => {
    if (!dragState.taskId) return;
    const handleMove = (event: PointerEvent) => {
      const deltaX = event.clientX - dragState.startX;
      const deltaDays = Math.round(deltaX / DAY_WIDTH);
      setDragOffsets((prev) => ({
        ...prev,
        [dragState.taskId as string]: dragState.startOffset + deltaDays
      }));
    };
    const handleUp = () => {
      setDragState({ taskId: null, startX: 0, startOffset: 0 });
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragState]);

  const headerTextColor = theme === "dark" ? "#c7d2fe" : "#1e1b4b";
  const sprintFill = theme === "dark" ? "#818cf8" : "#a5b4fc";
  const monthFill = theme === "dark" ? "#0f172a" : "#e2e8f0";
  const gridStroke = theme === "dark" ? "rgba(148, 163, 184, 0.25)" : "rgba(15, 23, 42, 0.12)";
  const rowStroke = theme === "dark" ? "rgba(148, 163, 184, 0.2)" : "rgba(15, 23, 42, 0.08)";
  const weekendFill = theme === "dark" ? "rgba(30, 41, 59, 0.35)" : "rgba(100, 116, 139, 0.12)";

  const dayWidth = DAY_WIDTH;

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

  return (
    <div className="relative w-full overflow-auto rounded-2xl border border-slate-700/20 bg-white/70 p-4 shadow-sm dark:bg-slate-900/60">
      <div className="pointer-events-none absolute left-0 top-0 z-20 w-[180px]">
        <div
          className="sticky left-0 top-0 h-full bg-white/90 backdrop-blur-sm dark:bg-slate-900/90"
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

        <g>
          {sortedSprints.map((sprint) => {
            const startIndex =
              dayIndex.get(format(sprint.startDate, "yyyy-MM-dd")) ?? 0;
            const endIndex =
              dayIndex.get(format(sprint.endDate, "yyyy-MM-dd")) ?? 0;
            const x = xForIndex(startIndex);
            const width = endXForIndex(endIndex) - x;
            return (
              <g key={sprint.id}>
                <rect
                  x={x}
                  y={0}
                  width={width}
                  height={SPRINT_BAR_HEIGHT}
                  fill={sprintFill}
                  opacity={0.35}
                  rx={6}
                />
                <text x={x + 6} y={16} fontSize={11} fill={headerTextColor}>
                  {sprint.name || "Спринт"}
                </text>
              </g>
            );
          })}

          {months.map((month) => {
            const startIndex = dayIndex.get(format(month.start, "yyyy-MM-dd")) ?? 0;
            const endIndex = dayIndex.get(format(month.end, "yyyy-MM-dd")) ?? startIndex;
            const x = xForIndex(startIndex);
            const width = endXForIndex(endIndex) - x;
            return (
              <g key={month.label}>
                <rect
                  x={x}
                  y={SPRINT_BAR_HEIGHT + 2}
                  width={width}
                  height={MONTH_BAR_HEIGHT}
                  fill={monthFill}
                  opacity={0.12}
                />
                <text
                  x={x + 8}
                  y={SPRINT_BAR_HEIGHT + 2 + 15}
                  fontSize={12}
                  fill="#94a3b8"
                >
                  {month.label}
                </text>
              </g>
            );
          })}


          {dayMeta.meta.map(({ day, x }) => {
            return (
              <text
                key={`day-${day.toISOString()}`}
                x={NAME_COLUMN_WIDTH + x + 6}
                y={HEADER_HEIGHT - 6}
                fontSize={9}
                fill="#94a3b8"
              >
                {format(day, "d")}
              </text>
            );
          })}
          {weekendPositions.map(({ x, day }) => {
            const lineMidY = (HEADER_HEIGHT - 8 + totalHeight) / 2;
            const textX = NAME_COLUMN_WIDTH + x + 8;
            return (
              <text
                key={`weekend-text-${day.toISOString()}`}
                x={textX}
                y={lineMidY}
                fontSize={10}
                fill="#ef4444"
                opacity={0.7}
                transform={`rotate(-90 ${textX} ${lineMidY})`}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                ***выходные***
              </text>
            );
          })}
        </g>

        <g transform={`translate(${offsetX}, 0)`}>
          {releaseDayMeta.map(({ day, x }) => (
            <rect
              key={`release-bg-${day.toISOString()}`}
              x={NAME_COLUMN_WIDTH + x}
              y={HEADER_HEIGHT - 8}
              width={DAY_WIDTH}
              height={totalHeight - (HEADER_HEIGHT - 8)}
              fill="#fef3c7"
              opacity={0.4}
            />
          ))}
          {dayMeta.meta.map(({ day, x }) => (
            <line
              key={day.toISOString()}
              x1={NAME_COLUMN_WIDTH + x}
              x2={NAME_COLUMN_WIDTH + x}
              y1={HEADER_HEIGHT - 8}
              y2={totalHeight}
              stroke={gridStroke}
            />
          ))}
          {releaseDayMeta.map(({ day, x }) => (
            <line
              key={`release-line-${day.toISOString()}`}
              x1={NAME_COLUMN_WIDTH + x + DAY_WIDTH / 2}
              x2={NAME_COLUMN_WIDTH + x + DAY_WIDTH / 2}
              y1={HEADER_HEIGHT - 8}
              y2={totalHeight}
              stroke="#d97706"
              strokeWidth={2}
              opacity={0.9}
            />
          ))}
          {weekendPositions.map(({ x, day }) => (
            <line
              key={`weekend-line-${day.toISOString()}`}
              x1={NAME_COLUMN_WIDTH + x}
              x2={NAME_COLUMN_WIDTH + x}
              y1={HEADER_HEIGHT - 8}
              y2={totalHeight}
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.7}
            />
          ))}
          {holidayPositions.map(({ x, day }) => (
            <line
              key={`holiday-line-${day.toISOString()}`}
              x1={NAME_COLUMN_WIDTH + x}
              x2={NAME_COLUMN_WIDTH + x}
              y1={HEADER_HEIGHT - 8}
              y2={totalHeight}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={0.5}
            />
          ))}

          {rowOffsets.map((row) => {
            const y = HEADER_HEIGHT + row.offset;
            return (
              <g key={row.assignee.name}>
                <line
                  x1={NAME_COLUMN_WIDTH}
                  x2={totalWidth}
                  y1={y}
                  y2={y}
                  stroke={rowStroke}
                />
                <line
                  x1={NAME_COLUMN_WIDTH}
                  x2={totalWidth}
                  y1={y + row.height}
                  y2={y + row.height}
                  stroke={rowStroke}
                />

                {row.tasks.map((task, taskIndex) => {
                  const taskId = `${row.assignee.name}::${task.id}`;
                  const startKey = format(task.start, "yyyy-MM-dd");
                  const startIndex = dayIndex.get(startKey);
                  if (startIndex === undefined) return null;
                  const baseOffset = dragOffsets[taskId] ?? 0;
                  const widthDays = task.widthDays;
                  const endIndex = computeEndIndex(startIndex, widthDays);
                  const maxOffset = days.length - 1 - endIndex;
                  const minOffset = -startIndex;
                  const offset = clamp(baseOffset, minOffset, maxOffset);
                  const adjustedStartIndex = clamp(
                    startIndex + offset,
                    0,
                    days.length - 1
                  );
                  const adjustedEndIndex = computeEndIndex(adjustedStartIndex, widthDays);
                  const x = xForIndex(adjustedStartIndex) + 2;
                  const width = Math.max(
                    8,
                    endXForIndex(adjustedEndIndex) - xForIndex(adjustedStartIndex) - 4
                  );
                  const barHeight = 32; // Увеличено вдвое
                  const barY = y + ROW_PADDING + taskIndex * STACK_GAP;
                  const intensity = task.load / Math.max(1, widthDays);
                  const taskType = 'type' in task ? task.type : null;
                  const taskTitle = 'title' in task ? task.title : null;
                  const tooltipText = taskTitle ? `${task.label}\n${taskTitle}` : task.label;
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
                      style={{ cursor: "grab" }}
                    >
                      <title>{tooltipText}</title>
                      <rect
                        x={x}
                        y={barY}
                        width={width}
                        height={barHeight}
                        rx={4}
                        fill={loadColor(intensity, taskType)}
                        opacity={0.85}
                        stroke={noteColor(row.assignee.name)}
                        strokeWidth={1}
                      />
                      {/* Первая строка - тип и ID задачи */}
                      <text x={x + 6} y={barY + 12} fontSize={9} fill="#0f172a" fontWeight="600">
                        {taskType ? `${taskType} · ${task.label}` : task.label}
                      </text>
                      {/* Вторая строка - название задачи (если есть) */}
                      {taskTitle && (
                        <text
                          x={x + 6}
                          y={barY + 24}
                          fontSize={8}
                          fill="#475569"
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
                  stroke="#6366f1"
                  strokeOpacity={0.6}
                  strokeDasharray="4 4"
                />
                <line
                  x1={endX}
                  x2={endX}
                  y1={HEADER_HEIGHT - 8}
                  y2={totalHeight}
                  stroke="#6366f1"
                  strokeOpacity={0.4}
                  strokeDasharray="4 4"
                />
              </g>
            );
          })}
        </g>
      </svg>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-500/20 pt-4 text-xs text-slate-600 dark:text-slate-400">
        <span className="font-medium text-slate-700 dark:text-slate-300">Легенда:</span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-4 rounded"
            style={{ backgroundColor: "#16a34a" }}
            aria-hidden
          />
          FEATURE / TECH TASK
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-4 rounded"
            style={{ backgroundColor: "#f97316" }}
            aria-hidden
          />
          BUG
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-4 rounded"
            style={{ backgroundColor: "#4ade80" }}
            aria-hidden
          />
          TASK
        </span>
      </div>
    </div>
  );
}
