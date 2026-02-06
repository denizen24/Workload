import { addDays, endOfMonth, parseISO } from "date-fns";
import html2canvas from "html2canvas";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GanttBoard, TaskMovePayload } from "./components/GanttBoard";
import {
  CustomTask,
  CustomTaskType,
  Sprint,
  WorkloadResponse
} from "./types";
import { resolveSettings } from "./services/settings";
import {
  fetchIssuesByProjectAndDates,
  HostApi,
  updateIssueDate
} from "./services/youtrack";
import { buildWorkloadResponse, filterIssuesByDates } from "./services/workload";

type AppProps = {
  host: HostApi;
};

const formatEstimate = (days: number): string => {
  const totalHours = days * 8;
  const weeks = Math.floor(totalHours / 40);
  const rem = totalHours % 40;
  const d = Math.floor(rem / 8);
  const h = Math.round(rem % 8);
  const parts: string[] = [];
  if (weeks > 0) parts.push(`${weeks}н`);
  if (d > 0) parts.push(`${d}д`);
  if (h > 0 || parts.length === 0) parts.push(`${h}ч`);
  return parts.join(" ");
};

const normalizeAssignee = (value: string) => value.trim().toLowerCase();

export function App({ host }: AppProps) {
  const [settings, setSettings] = useState(() => resolveSettings(null));
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [data, setData] = useState<WorkloadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [startSprintId, setStartSprintId] = useState<string | null>(null);
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [releaseDates, setReleaseDates] = useState<string[]>([]);
  const [holidayInput, setHolidayInput] = useState("");
  const [dateMarkerType, setDateMarkerType] = useState<"holiday" | "release">(
    "holiday"
  );
  const [taskDraft, setTaskDraft] = useState<{
    assignee: string;
    type: CustomTaskType;
    start: string;
    end: string;
  }>({
    assignee: "",
    type: "duty",
    start: "",
    end: ""
  });
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");

  const typeLabel: Record<CustomTaskType, string> = {
    duty: "Дежурство",
    vacation: "Отпуск",
    sick: "Болезнь"
  };

  const calendarRef = useRef<HTMLDivElement>(null);
  const [screenshotMenuOpen, setScreenshotMenuOpen] = useState(false);

  const assigneeFilterList = useMemo(
    () =>
      assigneeFilter
        .split(",")
        .map(normalizeAssignee)
        .filter(Boolean),
    [assigneeFilter]
  );

  const resolveAssignee = useCallback(
    (issue: { assignee?: { login?: string; fullName?: string } | null; customFields?: { name: string; value?: unknown }[] }) => {
      const fieldName = settings.assigneeField?.toLowerCase();
      if (fieldName) {
        const custom = issue.customFields?.find((field) => field.name.toLowerCase() === fieldName)?.value;
        if (custom) {
          if (typeof custom === "string") return custom;
          if (typeof custom === "object") {
            const record = custom as Record<string, unknown>;
            if (typeof record.login === "string") return record.login;
            if (typeof record.fullName === "string") return record.fullName;
            if (typeof record.name === "string") return record.name;
          }
        }
      }
      return issue.assignee?.login ?? issue.assignee?.fullName ?? "unassigned";
    },
    [settings.assigneeField]
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (!screenshotMenuOpen) return;
    const close = () => setScreenshotMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [screenshotMenuOpen]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rawSettings = host.settings?.get
          ? await host.settings.get()
          : host.getAppSettings
            ? await host.getAppSettings()
            : null;
        if (cancelled) return;
        const resolved = resolveSettings(rawSettings);
        setSettings(resolved);
        setSettingsLoaded(true);
        setSprints(resolved.defaultSprints ?? []);
        if (resolved.defaultSprints?.length) {
          setStartSprintId(resolved.defaultSprints[0]?.id ?? null);
        }
        if (resolved.projects.length > 0) {
          setSelectedProject(resolved.projects[0]);
        }
        if (!rangeStart || !rangeEnd) {
          const start = new Date();
          start.setDate(start.getDate() - 14);
          const end = addDays(start, Math.max(30, resolved.defaultHorizonDays));
          setRangeStart(start.toISOString().slice(0, 10));
          setRangeEnd(end.toISOString().slice(0, 10));
        }
      } catch (e) {
        if (!cancelled) {
          setSettingsLoaded(true);
          setError(e instanceof Error ? e.message : "Ошибка загрузки настроек");
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [host, rangeStart, rangeEnd]);

  const loadData = useCallback(async () => {
    if (!settingsLoaded) return;
    if (!selectedProject) {
      setError("Выберите проект в настройках или фильтрах");
      return;
    }
    if (!rangeStart || !rangeEnd) {
      setError("Укажите период для загрузки задач");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const issues = await fetchIssuesByProjectAndDates(
        host,
        settings,
        selectedProject,
        settings.issueQuery || null
      );
      const filteredByDates = filterIssuesByDates(
        issues,
        parseISO(rangeStart),
        parseISO(rangeEnd),
        settings
      );
      const filteredByAssignees =
        assigneeFilterList.length === 0
          ? filteredByDates
          : filteredByDates.filter((issue) => {
              const assignee = resolveAssignee(issue);
              return assigneeFilterList.includes(normalizeAssignee(assignee));
            });
      const response = buildWorkloadResponse(filteredByAssignees, settings);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки задач");
    } finally {
      setIsLoading(false);
    }
  }, [
    assigneeFilterList,
    host,
    rangeEnd,
    rangeStart,
    selectedProject,
    settings,
    settingsLoaded
  ]);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (!selectedProject) return;
    loadData();
  }, [loadData, selectedProject, settingsLoaded]);

  const handleSaveScreenshot = useCallback(
    async (format: "png" | "jpeg") => {
      const el = calendarRef.current;
      if (!el) return;
      const scrollContainer = el.firstElementChild as HTMLElement | null;
      if (!scrollContainer) return;

      const savedOverflow = scrollContainer.style.overflow;
      const savedWidth = scrollContainer.style.width;
      const savedHeight = scrollContainer.style.height;
      const savedBgEl = (el as HTMLElement).style.backgroundColor;
      const savedBgScroll = scrollContainer.style.backgroundColor;

      try {
        scrollContainer.style.overflow = "visible";
        scrollContainer.style.width = `${scrollContainer.scrollWidth}px`;
        scrollContainer.style.height = `${scrollContainer.scrollHeight}px`;
        (el as HTMLElement).style.backgroundColor = "#ffffff";
        scrollContainer.style.backgroundColor = "#ffffff";

        const fullWidth = scrollContainer.scrollWidth;
        const fullHeight = scrollContainer.scrollHeight;

        const canvas = await html2canvas(el, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          scale: window.devicePixelRatio || 1,
          logging: false,
          width: fullWidth,
          height: fullHeight,
          windowWidth: fullWidth,
          windowHeight: fullHeight,
          onclone(_, clonedEl) {
            const root = clonedEl as HTMLElement;
            root.style.backgroundColor = "#ffffff";
            const scroll = root.firstElementChild as HTMLElement;
            if (scroll) scroll.style.backgroundColor = "#ffffff";
            root.querySelectorAll("[class*='backdrop-blur'],[class*='bg-white/']").forEach((node) => {
              (node as HTMLElement).style.backgroundColor = "#ffffff";
              (node as HTMLElement).style.backdropFilter = "none";
            });
          }
        });

        (el as HTMLElement).style.backgroundColor = savedBgEl;
        scrollContainer.style.backgroundColor = savedBgScroll;
        scrollContainer.style.overflow = savedOverflow;
        scrollContainer.style.width = savedWidth;
        scrollContainer.style.height = savedHeight;

        const mime = format === "png" ? "image/png" : "image/jpeg";
        const ext = format === "png" ? "png" : "jpg";
        canvas.toBlob(
          (blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `workload-calendar-${new Date().toISOString().slice(0, 10)}.${ext}`;
            a.click();
            URL.revokeObjectURL(url);
          },
          mime,
          format === "jpeg" ? 0.92 : undefined
        );
      } catch (e) {
        (el as HTMLElement).style.backgroundColor = savedBgEl;
        scrollContainer.style.backgroundColor = savedBgScroll;
        scrollContainer.style.overflow = savedOverflow;
        scrollContainer.style.width = savedWidth;
        scrollContainer.style.height = savedHeight;
        setError(e instanceof Error ? e.message : "Ошибка сохранения скриншота");
      }
    },
    []
  );

  const addSprint = () => {
    const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    setSprints((prev) => [
      ...prev,
      {
        id,
        name: "",
        start: "",
        end: ""
      }
    ]);
    if (!startSprintId) {
      setStartSprintId(id);
    }
  };

  const updateSprint = (id: string, patch: Partial<Sprint>) => {
    setSprints((prev) =>
      prev.map((sprint) => {
        if (sprint.id !== id) return sprint;
        if (patch.start && !patch.end) {
          const startDate = new Date(patch.start);
          if (!Number.isNaN(startDate.getTime())) {
            return {
              ...sprint,
              ...patch,
              end: sprint.end || endOfMonth(startDate).toISOString().slice(0, 10)
            };
          }
        }
        return { ...sprint, ...patch };
      })
    );
  };

  const countWorkingDays = (start: Date, end: Date) => {
    let count = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) count += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    return Math.max(1, count);
  };

  const addWorkingDays = (start: Date, durationDays: number) => {
    let remaining = Math.max(1, durationDays);
    const cursor = new Date(start);
    while (remaining > 0) {
      const day = cursor.getDay();
      const key = cursor.toISOString().slice(0, 10);
      if (day !== 0 && day !== 6 && !holidays.includes(key)) {
        remaining -= 1;
      }
      if (remaining > 0) {
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return cursor;
  };

  const updateTaskDraft = (patch: Partial<typeof taskDraft>) => {
    setTaskDraft((prev) => ({ ...prev, ...patch }));
  };

  const addCustomTask = () => {
    if (!taskDraft.assignee || !taskDraft.start || !taskDraft.end) {
      setError("Заполните сотрудника и период задачи");
      return;
    }
    const startDate = parseISO(taskDraft.start);
    const endDate = parseISO(taskDraft.end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setError("Некорректные даты");
      return;
    }
    const durationDays = countWorkingDays(startDate, endDate);
    const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    setCustomTasks((prev) => [
      ...prev,
      {
        id,
        assignee: taskDraft.assignee,
        type: taskDraft.type,
        start: taskDraft.start,
        end: taskDraft.end,
        durationDays,
        title: typeLabel[taskDraft.type]
      }
    ]);
  };

  const removeCustomTask = (id: string) => {
    setCustomTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const removeSprint = (id: string) => {
    setSprints((prev) => prev.filter((sprint) => sprint.id !== id));
    setStartSprintId((current) => (current === id ? null : current));
  };

  const handleTaskMove = useCallback(
    async (payload: TaskMovePayload) => {
      try {
        if (!settings.startDateField) {
          throw new Error("Не задано поле даты начала в настройках");
        }
        const startDate = parseISO(payload.newStartDate);
        await updateIssueDate(host, settings, payload.issueId, settings.startDateField, startDate);
        if (settings.endDateField) {
          const endDate = addWorkingDays(startDate, payload.durationDays);
          await updateIssueDate(host, settings, payload.issueId, settings.endDateField, endDate);
        }
        await loadData();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка обновления задачи");
        throw e;
      }
    },
    [addWorkingDays, host, loadData, settings]
  );

  return (
    <div className="min-h-screen bg-surface-light px-6 py-8 text-slate-900 dark:bg-surface-dark dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Workload Board</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Визуализация нагрузки разработчиков в формате YouTrack App
            </p>
          </div>
          <button
            className="rounded-full border border-slate-500/40 px-4 py-2 text-sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "Светлая тема" : "Темная тема"}
          </button>
        </header>

        <section className="rounded-2xl border border-slate-500/20 bg-white/70 p-4 shadow-sm dark:bg-slate-900/50">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[220px]">
              <label className="text-xs text-slate-500 dark:text-slate-400">Проект</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                value={selectedProject}
                onChange={(event) => setSelectedProject(event.target.value)}
              >
                <option value="">Выберите проект</option>
                {settings.projects.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Старт</label>
              <input
                className="mt-1 rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                type="date"
                lang="ru"
                value={rangeStart}
                onChange={(event) => setRangeStart(event.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Финиш</label>
              <input
                className="mt-1 rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                type="date"
                lang="ru"
                value={rangeEnd}
                onChange={(event) => setRangeEnd(event.target.value)}
              />
            </div>
            <div className="min-w-[220px]">
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Исполнители (логины, через запятую)
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
              />
            </div>
            <button
              className="rounded-full border border-slate-500/40 px-4 py-2 text-sm"
              onClick={loadData}
              disabled={isLoading}
            >
              {isLoading ? "Загрузка..." : "Обновить"}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-rose-500">{error}</p>
          )}
        </section>

        {data && (
          <div className="flex flex-col gap-3">
            <div
              ref={calendarRef}
              className="rounded-2xl border border-slate-500/30 bg-white/80 p-4 shadow-lg dark:bg-slate-900/50"
            >
              <GanttBoard
                data={data}
                sprints={sprints}
                startSprintId={startSprintId}
                theme={theme}
                customTasks={customTasks}
                holidays={holidays}
                releaseDates={releaseDates}
                onTaskMove={handleTaskMove}
              />
            </div>
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-500/40 bg-slate-100 px-4 py-2 text-sm dark:bg-slate-800 dark:border-slate-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setScreenshotMenuOpen((v) => !v);
                }}
              >
                Сохранить скриншот
              </button>
              {screenshotMenuOpen && (
                <div
                  className="absolute left-0 top-full z-30 mt-1 flex flex-col rounded-lg border border-slate-500/30 bg-white py-1 shadow-lg dark:bg-slate-800 dark:border-slate-600"
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveScreenshot("png");
                      setScreenshotMenuOpen(false);
                    }}
                  >
                    PNG
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveScreenshot("jpeg");
                      setScreenshotMenuOpen(false);
                    }}
                  >
                    JPG
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {!data && settingsLoaded && (
          <div className="rounded-2xl border border-dashed border-slate-500/40 bg-white/50 p-6 text-sm text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
            Настройте фильтры и загрузите задачи, чтобы увидеть календарь.
          </div>
        )}

        <section className="rounded-2xl border border-slate-500/20 bg-white/70 p-4 shadow-sm dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Спринты</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Укажите спринты и периоды — календарь начнется со стартового спринта.
              </p>
            </div>
            <button
              className="rounded-full border border-slate-500/40 px-4 py-2 text-sm"
              onClick={addSprint}
            >
              Добавить спринт
            </button>
          </div>

          {sprints.length === 0 && (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Пока нет спринтов. Добавьте хотя бы один для точной шкалы.
            </p>
          )}

          <div className="mt-4 grid gap-3">
            {sprints.map((sprint) => (
              <div
                key={sprint.id}
                className="grid gap-3 rounded-xl border border-slate-500/20 p-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto_auto]"
              >
                <input
                  className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Название спринта"
                  value={sprint.name}
                  onChange={(event) => updateSprint(sprint.id, { name: event.target.value })}
                />
                <input
                  className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                  type="date"
                  lang="ru"
                  value={sprint.start}
                  onChange={(event) => updateSprint(sprint.id, { start: event.target.value })}
                />
                <input
                  className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                  type="date"
                  lang="ru"
                  value={sprint.end}
                  onChange={(event) => updateSprint(sprint.id, { end: event.target.value })}
                />
                <button
                  className={`rounded-full border px-3 py-2 text-sm ${
                    startSprintId === sprint.id
                      ? "border-purple-400 text-purple-300"
                      : "border-slate-500/40"
                  }`}
                  onClick={() => setStartSprintId(sprint.id)}
                >
                  Стартовый
                </button>
                <button
                  className="rounded-full border border-slate-500/40 px-3 py-2 text-sm"
                  onClick={() => removeSprint(sprint.id)}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-500/20 bg-white/70 p-4 shadow-sm dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Праздничные и релизные дни</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Праздники скрываются из календаря; день релиза выделяется золотистым.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
              value={dateMarkerType}
              onChange={(e) => setDateMarkerType(e.target.value as "holiday" | "release")}
            >
              <option value="holiday">Праздничный день</option>
              <option value="release">День релиза</option>
            </select>
            <input
              className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
              type="date"
              lang="ru"
              value={holidayInput}
              onChange={(e) => setHolidayInput(e.target.value)}
            />
            <button
              type="button"
              className="rounded-full border border-slate-500/40 px-4 py-2 text-sm"
              onClick={() => {
                if (!holidayInput) return;
                const key = holidayInput.trim();
                if (dateMarkerType === "holiday") {
                  if (holidays.includes(key)) return;
                  setHolidays((prev) => [...prev, key].sort());
                } else {
                  if (releaseDates.includes(key)) return;
                  setReleaseDates((prev) => [...prev, key].sort());
                }
                setHolidayInput("");
              }}
            >
              Добавить
            </button>
          </div>
          {holidays.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Праздники:</span>
              {holidays.map((date) => (
                <span
                  key={`h-${date}`}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-500/20 bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800 dark:border-slate-600"
                >
                  {date}
                  <button
                    type="button"
                    className="ml-1 rounded-full p-0.5 hover:bg-slate-300 dark:hover:bg-slate-600"
                    onClick={() => setHolidays((prev) => prev.filter((d) => d !== date))}
                    aria-label={`Удалить ${date}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {releaseDates.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Релизы:</span>
              {releaseDates.map((date) => (
                <span
                  key={`r-${date}`}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-50 px-3 py-1 text-sm dark:bg-amber-900/20 dark:border-amber-600/40"
                >
                  {date}
                  <button
                    type="button"
                    className="ml-1 rounded-full p-0.5 hover:bg-amber-200 dark:hover:bg-amber-700"
                    onClick={() => setReleaseDates((prev) => prev.filter((d) => d !== date))}
                    aria-label={`Удалить ${date}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-500/20 bg-white/70 p-4 shadow-sm dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Кастомные задачи</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Дежурства, отпуска, больничные — отображаются рядом с задачами.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.6fr_0.8fr_0.8fr_auto]">
            <input
              className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Исполнитель (логин)"
              value={taskDraft.assignee}
              onChange={(e) => updateTaskDraft({ assignee: e.target.value })}
            />
            <select
              className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
              value={taskDraft.type}
              onChange={(e) => updateTaskDraft({ type: e.target.value as CustomTaskType })}
            >
              <option value="duty">Дежурство</option>
              <option value="vacation">Отпуск</option>
              <option value="sick">Болезнь</option>
            </select>
            <input
              className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
              type="date"
              lang="ru"
              value={taskDraft.start}
              onChange={(e) => updateTaskDraft({ start: e.target.value })}
            />
            <input
              className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
              type="date"
              lang="ru"
              value={taskDraft.end}
              onChange={(e) => updateTaskDraft({ end: e.target.value })}
            />
            <button
              className="rounded-full border border-slate-500/40 px-4 py-2 text-sm"
              onClick={addCustomTask}
            >
              Добавить
            </button>
          </div>

          {customTasks.length > 0 && (
            <div className="mt-4 grid gap-2 text-sm">
              {customTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-500/20 bg-white/60 px-3 py-2 dark:bg-slate-900/40"
                >
                  <span className="font-medium">{task.assignee}</span>
                  <span className="text-slate-500 dark:text-slate-400">{task.title}</span>
                  <span>
                    {task.start} → {task.end} ({formatEstimate(task.durationDays)})
                  </span>
                  <button
                    className="rounded-full border border-slate-500/40 px-3 py-1 text-xs"
                    onClick={() => removeCustomTask(task.id)}
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
