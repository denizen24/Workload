import { endOfMonth, parseISO } from "date-fns";
import html2canvas from "html2canvas";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GanttBoard } from "./components/GanttBoard";
import {
  createMockWorkloadDataSource,
  type WorkloadDataSource
} from "./services/mockDataSource";
import { loadWidgetSettings, type HostApi, type WidgetSettings } from "./services/settings";
import { CustomTask, CustomTaskType, Sprint, WorkloadResponse } from "./types";

type AppProps = {
  host: HostApi;
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

export function App({ host }: AppProps) {
  const [dataSource, setDataSource] = useState<WorkloadDataSource | null>(null);
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
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
  const [dateMarkerType, setDateMarkerType] = useState<"holiday" | "release">("holiday");
  const [screenshotMenuOpen, setScreenshotMenuOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState<{
    assignee: string;
    type: CustomTaskType;
    start: string;
    end: string;
  }>({ assignee: "", type: "duty", start: "", end: "" });

  const typeLabel: Record<CustomTaskType, string> = useMemo(
    () => ({
      duty: "Дежурство",
      vacation: "Отпуск",
      sick: "Болезнь"
    }),
    []
  );

  const calendarRef = useRef<HTMLDivElement>(null);

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
    const bootstrap = async () => {
      host.setTitle?.("Workload Calendar");
      host.setLoadingAnimationEnabled?.(true);
      setIsLoading(true);
      setError(null);
      try {
        const nextSettings = await loadWidgetSettings(host);
        if (cancelled) return;
        setSettings(nextSettings);
        setSprints(nextSettings.defaultSprints);
        setStartSprintId(nextSettings.defaultSprints[0]?.id ?? null);
        setHolidays(nextSettings.defaultHolidays);
        setReleaseDates(nextSettings.defaultReleaseDates);
        const source = createMockWorkloadDataSource(nextSettings.mockDataset);
        setDataSource(source);
        const response = await source.getWorkload();
        if (cancelled) return;
        setData(response);
        host.clearError?.();
      } catch (e) {
        const err = e instanceof Error ? e : new Error("Ошибка инициализации виджета");
        if (!cancelled) {
          setError(err.message);
          host.setError?.(err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          host.setLoadingAnimationEnabled?.(false);
        }
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [host]);

  const reloadData = useCallback(async () => {
    if (!dataSource) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await dataSource.getWorkload();
      setData(response);
      host.clearError?.();
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Ошибка загрузки данных");
      setError(err.message);
      host.setError?.(err);
    } finally {
      setIsLoading(false);
    }
  }, [dataSource, host]);

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

  const addSprint = () => {
    const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    setSprints((prev) => [...prev, { id, name: "", start: "", end: "" }]);
    if (!startSprintId) setStartSprintId(id);
  };

  const removeSprint = (id: string) => {
    setSprints((prev) => prev.filter((sprint) => sprint.id !== id));
    setStartSprintId((current) => (current === id ? null : current));
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

  const handleSaveScreenshot = useCallback(async (format: "png" | "jpeg") => {
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
        windowHeight: fullHeight
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
  }, []);

  return (
    <div className="min-h-screen bg-surface-light px-6 py-8 text-slate-900 dark:bg-surface-dark dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Workload Calendar Widget</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Демонстрационный режим: данные загружаются из mock-источника.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-full border border-slate-500/40 px-4 py-2 text-sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "Светлая тема" : "Темная тема"}
            </button>
            <button
              className="rounded-full border border-slate-500/40 px-4 py-2 text-sm"
              onClick={reloadData}
              disabled={isLoading}
            >
              Обновить
            </button>
          </div>
        </header>

        {settings && (
          <div className="rounded-xl border border-slate-500/20 bg-white/70 px-4 py-3 text-xs dark:bg-slate-900/50">
            Текущий mock-набор: <span className="font-semibold">{settings.mockDataset}</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-100/50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {data ? (
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
              />
            </div>
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-500/40 bg-slate-100 px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                onClick={(e) => {
                  e.stopPropagation();
                  setScreenshotMenuOpen((v) => !v);
                }}
              >
                Сохранить скриншот
              </button>
              {screenshotMenuOpen && (
                <div
                  className="absolute left-0 top-full z-30 mt-1 flex flex-col rounded-lg border border-slate-500/30 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={() => {
                      handleSaveScreenshot("png");
                      setScreenshotMenuOpen(false);
                    }}
                  >
                    PNG
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={() => {
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
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-500/40 bg-white/50 p-6 text-sm text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
            {isLoading ? "Загружаем данные..." : "Нет данных для отображения"}
          </div>
        )}

        <section className="rounded-2xl border border-slate-500/20 bg-white/70 p-4 shadow-sm dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Спринты</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Календарь начинается со стартового спринта.
              </p>
            </div>
            <button className="rounded-full border border-slate-500/40 px-4 py-2 text-sm" onClick={addSprint}>
              Добавить спринт
            </button>
          </div>
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
                  value={sprint.start}
                  onChange={(event) => updateSprint(sprint.id, { start: event.target.value })}
                />
                <input
                  className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                  type="date"
                  value={sprint.end}
                  onChange={(event) => updateSprint(sprint.id, { end: event.target.value })}
                />
                <button
                  className={`rounded-full border px-3 py-2 text-sm ${
                    startSprintId === sprint.id ? "border-purple-400 text-purple-300" : "border-slate-500/40"
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
          <h2 className="text-lg font-semibold">Праздничные и релизные дни</h2>
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
              value={holidayInput}
              onChange={(e) => setHolidayInput(e.target.value)}
            />
            <button
              type="button"
              className="rounded-full border border-slate-500/40 px-4 py-2 text-sm"
              onClick={() => {
                if (!holidayInput) return;
                const key = holidayInput.trim();
                if (dateMarkerType === "holiday") setHolidays((prev) => Array.from(new Set([...prev, key])).sort());
                if (dateMarkerType === "release") setReleaseDates((prev) => Array.from(new Set([...prev, key])).sort());
                setHolidayInput("");
              }}
            >
              Добавить
            </button>
          </div>
        </section>

        {data && (
          <section className="rounded-2xl border border-slate-500/20 bg-white/70 p-4 shadow-sm dark:bg-slate-900/50">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Кастомные задачи</h2>
              <button className="rounded-full border border-slate-500/40 px-4 py-2 text-sm" onClick={addCustomTask}>
                Добавить задачу
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.9fr_0.9fr_0.9fr]">
              <input
                className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Сотрудник"
                value={taskDraft.assignee}
                onChange={(event) => setTaskDraft((prev) => ({ ...prev, assignee: event.target.value }))}
              />
              <select
                className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                value={taskDraft.type}
                onChange={(event) => setTaskDraft((prev) => ({ ...prev, type: event.target.value as CustomTaskType }))}
              >
                <option value="duty">Дежурство</option>
                <option value="vacation">Отпуск</option>
                <option value="sick">Болезнь</option>
              </select>
              <input
                className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                type="date"
                value={taskDraft.start}
                onChange={(event) => setTaskDraft((prev) => ({ ...prev, start: event.target.value }))}
              />
              <input
                className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                type="date"
                value={taskDraft.end}
                onChange={(event) => setTaskDraft((prev) => ({ ...prev, end: event.target.value }))}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
