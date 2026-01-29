import { addDays, endOfMonth, parseISO } from "date-fns";
import html2canvas from "html2canvas";
import { useCallback, useEffect, useRef, useState } from "react";

import { GanttBoard } from "./components/GanttBoard";
import { UploadPanel } from "./components/UploadPanel";
import { CustomTask, CustomTaskType, Sprint, WorkloadResponse } from "./types";

const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Ошибка загрузки");
  }
  return (await response.json()) as WorkloadResponse;
};

/** Оценка в днях → строка вида "1н 5д 3ч" (недели, дни, часы; 1н = 5 раб.д, 1д = 8ч) */
function formatEstimate(days: number): string {
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
}

export default function App() {
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
  const typeLabel: Record<CustomTaskType, string> = {
    duty: "Дежурство",
    vacation: "Отпуск",
    sick: "Болезнь"
  };

  const calendarRef = useRef<HTMLDivElement>(null);
  const [screenshotMenuOpen, setScreenshotMenuOpen] = useState(false);

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

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (!screenshotMenuOpen) return;
    const close = () => setScreenshotMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [screenshotMenuOpen]);

  const handleUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await uploadFile(file);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обработки файла");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      if (day !== 0 && day !== 6) {
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

  return (
    <div className="min-h-screen bg-surface-light px-6 py-8 text-slate-900 dark:bg-surface-dark dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Workload Board</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Визуализация нагрузки разработчиков в формате Miro Gantt
            </p>
          </div>
          <button
            className="rounded-full border border-slate-500/40 px-4 py-2 text-sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "Светлая тема" : "Темная тема"}
          </button>
        </header>

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

        {!data && (
          <div className="rounded-2xl border border-dashed border-slate-500/40 bg-white/50 p-6 text-sm text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
            Сначала загрузите XLSX, чтобы увидеть график.
          </div>
        )}

        <UploadPanel onFileAccepted={handleUpload} isLoading={isLoading} error={error} />

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
                  onChange={(event) =>
                    updateSprint(sprint.id, { name: event.target.value })
                  }
                />
                <input
                  className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                  type="date"
                  lang="ru"
                  value={sprint.start}
                  onChange={(event) =>
                    updateSprint(sprint.id, { start: event.target.value })
                  }
                />
                <input
                  className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                  type="date"
                  lang="ru"
                  value={sprint.end}
                  onChange={(event) =>
                    updateSprint(sprint.id, { end: event.target.value })
                  }
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

        {data && (
          <section className="rounded-2xl border border-slate-500/20 bg-white/70 p-4 shadow-sm dark:bg-slate-900/50">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Кастомные задачи</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Добавляйте дежурства и отпуска вручную.
                </p>
              </div>
              <button
                className="rounded-full border border-slate-500/40 px-4 py-2 text-sm"
                onClick={addCustomTask}
              >
                Добавить задачу
              </button>
            </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.9fr_0.9fr_0.9fr]">
              <select
                className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                value={taskDraft.assignee}
                onChange={(event) => updateTaskDraft({ assignee: event.target.value })}
              >
                <option value="" className="dark:bg-slate-800 dark:text-slate-100">
                  Сотрудник
                </option>
                {data.assignees.map((assignee) => (
                  <option
                    key={assignee.name}
                    value={assignee.name}
                    className="dark:bg-slate-800 dark:text-slate-100"
                  >
                    {assignee.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                value={taskDraft.type}
                onChange={(event) =>
                  updateTaskDraft({ type: event.target.value as CustomTaskType })
                }
              >
                <option value="duty" className="dark:bg-slate-800 dark:text-slate-100">
                  Дежурство
                </option>
                <option value="vacation" className="dark:bg-slate-800 dark:text-slate-100">
                  Отпуск
                </option>
                <option value="sick" className="dark:bg-slate-800 dark:text-slate-100">
                  Болезнь
                </option>
              </select>
              <input
                className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                type="date"
                lang="ru"
                value={taskDraft.start}
                onChange={(event) => updateTaskDraft({ start: event.target.value })}
              />
              <input
                className="rounded-lg border border-slate-500/30 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                type="date"
                lang="ru"
                value={taskDraft.end}
                onChange={(event) => updateTaskDraft({ end: event.target.value })}
              />
            </div>
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Длительность рассчитывается автоматически по рабочим дням между датами (выходные не учитываются).
            </div>

            {customTasks.length > 0 && (
              <div className="mt-4 grid gap-2 text-sm">
                {customTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-500/20 px-3 py-2"
                  >
                    <div>
                      <span className="font-semibold">{task.assignee}</span>{" "}
                      <span className="text-slate-500 dark:text-slate-400">
                        {task.title} · {task.start} → {task.end} · {task.durationDays}д
                      </span>
                    </div>
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
        )}

        {data && (() => {
          const taskIds = new Set<string>();
          data.assignees.forEach((a) =>
            a.periods.forEach((p) =>
              p.days.forEach((d) => d.tasks.forEach((t) => taskIds.add(t)))
            )
          );
          const taskList = Array.from(taskIds)
            .sort((a, b) => a.localeCompare(b))
            .map((id) => ({
              id,
              title: data.taskTitles?.[id] ?? null,
              type: data.taskTypes?.[id] ?? null,
              estimate: data.taskEstimates?.[id] ?? null
            }));
          return taskList.length > 0 ? (
            <section className="rounded-2xl border border-slate-500/20 bg-white/70 p-4 shadow-sm dark:bg-slate-900/50">
              <h2 className="text-lg font-semibold">Список задач из файла</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Задачи, распарсенные из загруженного XLSX.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[500px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-500/30 text-left text-slate-600 dark:text-slate-400">
                      <th className="py-2 pr-4 font-medium">ID</th>
                      <th className="py-2 pr-4 font-medium">Тип</th>
                      <th className="py-2 pr-4 font-medium">Заголовок</th>
                      <th className="py-2 font-medium">Оценка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskList.map((task) => (
                      <tr
                        key={task.id}
                        className="border-b border-slate-500/10 text-slate-700 dark:text-slate-300"
                      >
                        <td className="py-2 pr-4 font-mono text-xs">{task.id}</td>
                        <td className="py-2 pr-4">{task.type ?? "—"}</td>
                        <td className="py-2 pr-4">{task.title ?? "—"}</td>
                        <td className="py-2">
                          {task.estimate != null && task.estimate > 0
                            ? formatEstimate(task.estimate)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null;
        })()}

        {!data && !isLoading && (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Поддерживаются колонки: Issue ID, Assignee, ownestimate, Period, Status,
            created, updated, Release, QA, SP.
          </div>
        )}
      </div>
    </div>
  );
}
