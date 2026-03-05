import { endOfMonth, parseISO } from "date-fns";
import html2canvas from "html2canvas";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  AuthUser,
  clearAuthTokens,
  isAuthenticated,
  login,
  logout,
  me,
  register,
  saveAuthTokens
} from "./api/auth";
import {
  SnapshotEntity,
  activateSnapshot,
  createSnapshot,
  deleteSnapshot,
  getSnapshot,
  getSnapshotStorageMode,
  getSnapshots
} from "./api/snapshots";
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

type SnapshotLayoutPayload = {
  workloadData: WorkloadResponse | null;
  sprints: Sprint[];
  startSprintId: string | null;
  customTasks: CustomTask[];
  holidays: string[];
  releaseDates: string[];
  taskStartDates: Record<string, string>;
};

export default function App() {
  const planningPreviewSrc = `${import.meta.env.BASE_URL}workload-planning-example.png`;
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
    taskIdentifier: string;
    taskKind: string;
    taskTitle: string;
    estimateDays: string;
  }>({
    assignee: "",
    type: "duty",
    start: "",
    end: "",
    taskIdentifier: "",
    taskKind: "",
    taskTitle: "",
    estimateDays: ""
  });
  const typeLabel: Record<CustomTaskType, string> = {
    duty: "Дежурство",
    vacation: "Отпуск",
    sick: "Болезнь",
    task: "Задача"
  };
  const taskKindOptions = ["FEATURE / TECH TASK", "BUG", "TASK"];

  const calendarRef = useRef<HTMLDivElement>(null);
  const [screenshotMenuOpen, setScreenshotMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [snapshotSprintId, setSnapshotSprintId] = useState("");
  const [snapshotName, setSnapshotName] = useState("");
  const [snapshots, setSnapshots] = useState<SnapshotEntity[]>([]);
  const [isSnapshotsBusy, setIsSnapshotsBusy] = useState(false);
  const [hasLoadedSnapshots, setHasLoadedSnapshots] = useState(false);
  const [taskStartDates, setTaskStartDates] = useState<Record<string, string>>({});
  const [isPlanningPreviewOpen, setIsPlanningPreviewOpen] = useState(false);

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

  useEffect(() => {
    if (!isPlanningPreviewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPlanningPreviewOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isPlanningPreviewOpen]);

  useEffect(() => {
    if (!isAuthenticated()) return;
    me()
      .then((user) => setCurrentUser(user))
      .catch(() => {
        clearAuthTokens();
        setCurrentUser(null);
      });
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await uploadFile(file);
      setData(result);
      setTaskStartDates({});
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
    const isTaskType = taskDraft.type === "task";
    if (isTaskType) {
      if (!taskDraft.taskIdentifier.trim() || !taskDraft.taskKind.trim() || !taskDraft.taskTitle.trim()) {
        setError("Для типа \"Задача\" заполните идентификатор, тип и заголовок");
        return;
      }
      const estimate = Number(taskDraft.estimateDays);
      if (!Number.isFinite(estimate) || estimate <= 0) {
        setError("Для типа \"Задача\" укажите корректную оценку (в днях)");
        return;
      }
    }
    const estimateDays = Number(taskDraft.estimateDays);
    const durationDays = isTaskType && Number.isFinite(estimateDays) && estimateDays > 0
      ? Math.max(1, Math.ceil(estimateDays))
      : countWorkingDays(startDate, endDate);
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
        title: isTaskType ? taskDraft.taskTitle.trim() : typeLabel[taskDraft.type],
        taskIdentifier: isTaskType ? taskDraft.taskIdentifier.trim() : undefined,
        taskKind: isTaskType ? taskDraft.taskKind.trim() : undefined,
        estimateDays: isTaskType ? Number(taskDraft.estimateDays) : undefined
      }
    ]);
    setTaskDraft((prev) => ({
      ...prev,
      taskIdentifier: "",
      taskKind: "",
      taskTitle: "",
      estimateDays: ""
    }));
    setError(null);
  };

  const removeCustomTask = (id: string) => {
    setCustomTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const removeSprint = (id: string) => {
    setSprints((prev) => prev.filter((sprint) => sprint.id !== id));
    setStartSprintId((current) => (current === id ? null : current));
  };

  const handleResetTaskLayout = () => {
    setTaskStartDates({});
  };

  const buildSnapshotLayout = useCallback(
    (): SnapshotLayoutPayload => ({
      workloadData: data,
      sprints,
      startSprintId,
      customTasks,
      holidays,
      releaseDates,
      taskStartDates
    }),
    [customTasks, data, holidays, releaseDates, sprints, startSprintId, taskStartDates]
  );

  const applySnapshotLayout = (layout: SnapshotLayoutPayload) => {
    setData(layout.workloadData ?? null);
    setSprints(Array.isArray(layout.sprints) ? layout.sprints : []);
    setStartSprintId(layout.startSprintId ?? null);
    setCustomTasks(Array.isArray(layout.customTasks) ? layout.customTasks : []);
    setHolidays(Array.isArray(layout.holidays) ? layout.holidays : []);
    setReleaseDates(Array.isArray(layout.releaseDates) ? layout.releaseDates : []);
    setTaskStartDates(
      layout.taskStartDates && typeof layout.taskStartDates === "object"
        ? layout.taskStartDates
        : {}
    );
  };

  const handleAuthSubmit = async () => {
    setIsAuthBusy(true);
    setError(null);
    try {
      const response =
        authMode === "register"
          ? await register({
              email: authEmail,
              password: authPassword
            })
          : await login({
              email: authEmail,
              password: authPassword
            });
      saveAuthTokens(response);
      setCurrentUser(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка авторизации");
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setError(null);
    try {
      await logout();
    } catch {
      clearAuthTokens();
    } finally {
      setCurrentUser(null);
      setSnapshots([]);
      setHasLoadedSnapshots(false);
    }
  };

  const handleLoadSnapshots = async () => {
    setIsSnapshotsBusy(true);
    setError(null);
    try {
      const result = await getSnapshots(snapshotSprintId || undefined);
      setSnapshots(result);
      setHasLoadedSnapshots(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки снапшотов");
    } finally {
      setIsSnapshotsBusy(false);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!snapshotName.trim()) {
      setError("Введите название снапшота");
      return;
    }
    if (!snapshotSprintId.trim()) {
      setError("Введите sprintId для снапшота");
      return;
    }

    setIsSnapshotsBusy(true);
    setError(null);
    try {
      await createSnapshot({
        sprintId: snapshotSprintId.trim(),
        name: snapshotName.trim(),
        layout: buildSnapshotLayout()
      });
      await handleLoadSnapshots();
      setSnapshotName("");
      setHasLoadedSnapshots(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения снапшота");
    } finally {
      setIsSnapshotsBusy(false);
    }
  };

  const handleApplySnapshot = async (snapshotId: string) => {
    setIsSnapshotsBusy(true);
    setError(null);
    try {
      const snapshot = await getSnapshot(snapshotId);
      applySnapshotLayout(snapshot.layout as SnapshotLayoutPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка применения снапшота");
    } finally {
      setIsSnapshotsBusy(false);
    }
  };

  const handleActivateSnapshot = async (snapshotId: string) => {
    setIsSnapshotsBusy(true);
    setError(null);
    try {
      await activateSnapshot(snapshotId);
      await handleLoadSnapshots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка активации снапшота");
    } finally {
      setIsSnapshotsBusy(false);
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    setIsSnapshotsBusy(true);
    setError(null);
    try {
      await deleteSnapshot(snapshotId);
      setSnapshots((prev) => prev.filter((item) => item._id !== snapshotId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления снапшота");
    } finally {
      setIsSnapshotsBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-light px-6 py-8 text-slate-900 dark:bg-surface-dark dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Workload Board</h1>
            <p className="ui-muted">
              Визуализация нагрузки разработчиков
            </p>
          </div>
          <button
            className="ui-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "Светлая тема" : "Темная тема"}
          </button>
        </header>

        <section className="ui-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Авторизация</h2>
              <p className="ui-muted">
                Авторизация нужна, чтобы сохранять таблицы нагрузки и работать со снапшотами.
              </p>
            </div>
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="ui-muted">
                  {currentUser.email}
                </span>
                <button
                  type="button"
                  className="ui-btn"
                  onClick={handleLogout}
                >
                  Выйти
                </button>
              </div>
            ) : (
              <div className="ui-segmented">
                <button
                  type="button"
                  className={`ui-segment-btn ${
                    authMode === "login"
                      ? "ui-segment-btn-active"
                      : ""
                  }`}
                  onClick={() => setAuthMode("login")}
                >
                  Вход
                </button>
                <button
                  type="button"
                  className={`ui-segment-btn ${
                    authMode === "register"
                      ? "ui-segment-btn-active"
                      : ""
                  }`}
                  onClick={() => setAuthMode("register")}
                >
                  Регистрация
                </button>
              </div>
            )}
          </div>

          {!currentUser && (
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                className="ui-input"
                placeholder="Email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
              />
              <input
                className="ui-input"
                placeholder="Пароль"
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
              />
              <button
                type="button"
                className="ui-btn ui-btn-primary"
                disabled={isAuthBusy}
                onClick={handleAuthSubmit}
              >
                {isAuthBusy && <span className="ui-spinner" aria-hidden />}
                {isAuthBusy ? "Выполняю..." : authMode === "login" ? "Войти" : "Создать аккаунт"}
              </button>
            </div>
          )}
        </section>

        {currentUser && (
          <section className="ui-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Снапшоты и сохранение</h2>
                <p className="ui-muted">
                  Режим хранения: {getSnapshotStorageMode() === "remote" ? "серверный" : "локальный"}.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                <input
                  className="ui-input"
                  placeholder="sprintId (например sprint-1)"
                  value={snapshotSprintId}
                  onChange={(event) => setSnapshotSprintId(event.target.value)}
                />
                <input
                  className="ui-input"
                  placeholder="Название снапшота"
                  value={snapshotName}
                  onChange={(event) => setSnapshotName(event.target.value)}
                />
                <button
                  type="button"
                  className="ui-btn ui-btn-primary"
                  disabled={isSnapshotsBusy}
                  onClick={handleSaveSnapshot}
                >
                  {isSnapshotsBusy && <span className="ui-spinner" aria-hidden />}
                  Сохранить
                </button>
                <button
                  type="button"
                  className="ui-btn"
                  disabled={isSnapshotsBusy}
                  onClick={handleLoadSnapshots}
                >
                  {isSnapshotsBusy && <span className="ui-spinner" aria-hidden />}
                  Загрузить список
                </button>
              </div>

              {isSnapshotsBusy && snapshots.length === 0 && (
                <div className="mt-3 grid gap-2">
                  <div className="ui-skeleton h-10 w-full" />
                  <div className="ui-skeleton h-10 w-full" />
                  <div className="ui-skeleton h-10 w-full" />
                </div>
              )}

              {!isSnapshotsBusy && hasLoadedSnapshots && snapshots.length === 0 && (
                <div className="ui-empty-state mt-3">
                  Снапшоты не найдены. Попробуйте изменить `sprintId` или сохраните новый.
                </div>
              )}

              {snapshots.length > 0 && (
                <div className="mt-3 grid gap-2 text-sm">
                  {snapshots.map((item) => (
                    <div
                      key={item._id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-500/20 px-3 py-2"
                    >
                      <div>
                        <span className="font-semibold">{item.name}</span>{" "}
                        <span className="ui-text-secondary">
                          {item.sprintId} · {item.isActive ? "active" : "inactive"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="ui-btn-sm"
                          onClick={() => handleApplySnapshot(item._id)}
                        >
                          Применить
                        </button>
                        <button
                          type="button"
                          className="ui-btn-sm"
                          onClick={() => handleActivateSnapshot(item._id)}
                        >
                          Активировать
                        </button>
                        <button
                          type="button"
                          className="ui-btn-sm ui-btn-danger"
                          onClick={() => handleDeleteSnapshot(item._id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {data && (
          <div className="flex flex-col gap-3">
            <div className="ui-card flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Календарь задач</h2>
                <p className="ui-muted">Перетаскивайте задачи и фиксируйте итоговое расположение в снапшоте.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="ui-btn" onClick={handleResetTaskLayout}>
                  Сбросить расположение
                </button>
                <div className="relative">
                  <button
                    type="button"
                    className="ui-btn bg-slate-100 dark:bg-slate-800 dark:border-slate-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setScreenshotMenuOpen((v) => !v);
                    }}
                  >
                    Сохранить скриншот
                  </button>
                  {screenshotMenuOpen && (
                    <div
                      className="absolute left-0 top-full z-30 mt-1 flex min-w-32 flex-col rounded-lg border border-slate-500/30 bg-white py-1 shadow-lg dark:bg-slate-800 dark:border-slate-600"
                      role="menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="px-4 py-2 text-left text-sm transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:hover:bg-slate-700"
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
                        className="px-4 py-2 text-left text-sm transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:hover:bg-slate-700"
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
            </div>
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
                taskStartDates={taskStartDates}
                onTaskStartDatesChange={setTaskStartDates}
              />
            </div>
          </div>
        )}

        {isLoading && (
          <div className="rounded-2xl border border-slate-500/20 bg-white/60 p-6 dark:bg-slate-900/40">
            <div className="ui-skeleton h-8 w-64" />
            <div className="mt-3 ui-skeleton h-60 w-full" />
            <div className="mt-3 ui-skeleton h-4 w-48" />
          </div>
        )}

        {!data && (
          <section className="ui-card border-dashed border-slate-500/40 bg-white/50 dark:bg-slate-900/40">
            <div className="flex flex-col gap-3">
              <p className="text-sm ui-text-secondary">
                В текущей итерации поддерживается только загрузка списка задач из YouTrack в формате файла XLSX.
              </p>
              <UploadPanel onFileAccepted={handleUpload} isLoading={isLoading} error={error} />
            </div>
          </section>
        )}

        {!data && !isLoading && !currentUser && (
          <section className="ui-card">
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-semibold">Пример, как может выглядеть ваш календарь планирования</h2>
                <p className="ui-muted">Нажмите на миниатюру, чтобы открыть изображение на весь экран.</p>
              </div>
              <button
                type="button"
                className="group relative overflow-hidden rounded-xl border border-slate-500/30"
                onClick={() => setIsPlanningPreviewOpen(true)}
                aria-label="Открыть пример календаря планирования"
              >
                <img
                  src={planningPreviewSrc}
                  alt="Пример календаря планирования нагрузки разработчиков"
                  className="h-auto min-h-40 w-full bg-slate-100 object-cover transition-transform duration-200 group-hover:scale-[1.01] dark:bg-slate-800"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/20">
                  <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                    Нажми, чтобы увеличить
                  </span>
                </div>
              </button>
            </div>
          </section>
        )}

        {data && (
          <section className="ui-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Спринты</h2>
              <p className="ui-muted">
                Укажите спринты и периоды — календарь начнется со стартового спринта.
              </p>
            </div>
            <button
              className="ui-btn"
              onClick={addSprint}
            >
              Добавить спринт
            </button>
          </div>

          {sprints.length === 0 && (
            <p className="mt-4 ui-muted">
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
                  className="ui-input"
                  placeholder="Название спринта"
                  value={sprint.name}
                  onChange={(event) =>
                    updateSprint(sprint.id, { name: event.target.value })
                  }
                />
                <input
                  className="ui-input"
                  type="date"
                  lang="ru"
                  value={sprint.start}
                  onChange={(event) =>
                    updateSprint(sprint.id, { start: event.target.value })
                  }
                />
                <input
                  className="ui-input"
                  type="date"
                  lang="ru"
                  value={sprint.end}
                  onChange={(event) =>
                    updateSprint(sprint.id, { end: event.target.value })
                  }
                />
                <button
                  className={`ui-btn ${
                    startSprintId === sprint.id
                      ? "border-purple-500 bg-purple-50 text-purple-700 dark:border-purple-400 dark:bg-purple-900/30 dark:text-purple-300"
                      : ""
                  }`}
                  onClick={() => setStartSprintId(sprint.id)}
                >
                  Стартовый
                </button>
                <button
                  className="ui-btn ui-btn-danger"
                  onClick={() => removeSprint(sprint.id)}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
          </section>
        )}

        {data && (
          <section className="ui-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Праздничные и релизные дни</h2>
                <p className="ui-muted">
                  Праздники скрываются из календаря; день релиза выделяется цветом на календаре.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <select
                className="ui-input"
                value={dateMarkerType}
                onChange={(e) => setDateMarkerType(e.target.value as "holiday" | "release")}
              >
                <option value="holiday">Праздничный день</option>
                <option value="release">День релиза</option>
              </select>
              <input
                className="ui-input"
                type="date"
                lang="ru"
                value={holidayInput}
                onChange={(e) => setHolidayInput(e.target.value)}
              />
              <button
                type="button"
                className="ui-btn"
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
                <span className="ui-text-caption">Праздники:</span>
                {holidays.map((date) => (
                  <span
                    key={`h-${date}`}
                    className="ui-chip-neutral"
                  >
                    {date}
                    <button
                      type="button"
                      className="ui-chip-neutral-action"
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
                <span className="ui-text-caption">Релизы:</span>
                {releaseDates.map((date) => (
                  <span
                    key={`r-${date}`}
                    className="ui-chip-warning"
                  >
                    {date}
                    <button
                      type="button"
                      className="ui-chip-warning-action"
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
        )}

        {data && (
          <section className="ui-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Кастомные задачи</h2>
                <p className="ui-muted">
                  Добавляйте дежурства, отпуска, больничные и отдельные задачи вручную.
                </p>
              </div>
              <button
                className="ui-btn"
                onClick={addCustomTask}
              >
                Добавить задачу
              </button>
            </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.9fr_0.9fr_0.9fr]">
              <select
                className="ui-input"
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
                className="ui-input"
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
                <option value="task" className="dark:bg-slate-800 dark:text-slate-100">
                  Задача
                </option>
              </select>
              <input
                className="ui-input"
                type="date"
                lang="ru"
                value={taskDraft.start}
                onChange={(event) => updateTaskDraft({ start: event.target.value })}
              />
              <input
                className="ui-input"
                type="date"
                lang="ru"
                value={taskDraft.end}
                onChange={(event) => updateTaskDraft({ end: event.target.value })}
              />
            </div>
            {taskDraft.type === "task" && (
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_1.4fr_0.8fr]">
                <input
                  className="ui-input"
                  placeholder="Идентификатор задачи (например WL-123)"
                  value={taskDraft.taskIdentifier}
                  onChange={(event) => updateTaskDraft({ taskIdentifier: event.target.value })}
                />
                <select
                  className="ui-input"
                  value={taskDraft.taskKind}
                  onChange={(event) => updateTaskDraft({ taskKind: event.target.value })}
                >
                  <option value="" className="dark:bg-slate-800 dark:text-slate-100">
                    Тип задачи
                  </option>
                  {taskKindOptions.map((kind) => (
                    <option key={kind} value={kind} className="dark:bg-slate-800 dark:text-slate-100">
                      {kind}
                    </option>
                  ))}
                </select>
                <input
                  className="ui-input"
                  placeholder="Заголовок задачи"
                  value={taskDraft.taskTitle}
                  onChange={(event) => updateTaskDraft({ taskTitle: event.target.value })}
                />
                <input
                  className="ui-input"
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="Оценка, дн."
                  value={taskDraft.estimateDays}
                  onChange={(event) => updateTaskDraft({ estimateDays: event.target.value })}
                />
              </div>
            )}
            <div className="mt-3 ui-text-caption">
              Для дежурств/отпусков/больничных длительность считается по рабочим дням; для типа "Задача" берется из оценки.
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
                      <span className="ui-text-secondary">
                        {task.taskIdentifier ? `${task.taskIdentifier} · ` : ""}
                        {task.taskKind ? `${task.taskKind} · ` : ""}
                        {task.title} · {task.start} → {task.end} · {task.durationDays}д
                        {task.estimateDays ? ` · оценка ${formatEstimate(task.estimateDays)}` : ""}
                      </span>
                    </div>
                    <button
                      className="ui-btn-sm ui-btn-danger"
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
          const taskMap = new Map<
            string,
            { id: string; title: string | null; type: string | null; estimate: number | null }
          >();

          data.assignees.forEach((a) =>
            a.periods.forEach((p) =>
              p.days.forEach((d) =>
                d.tasks.forEach((id) => {
                  if (!taskMap.has(id)) {
                    taskMap.set(id, {
                      id,
                      title: data.taskTitles?.[id] ?? null,
                      type: data.taskTypes?.[id] ?? null,
                      estimate: data.taskEstimates?.[id] ?? null
                    });
                  }
                })
              )
            )
          );

          customTasks
            .filter((task) => task.type === "task" && task.taskIdentifier)
            .forEach((task) => {
              const id = task.taskIdentifier as string;
              taskMap.set(id, {
                id,
                title: task.title ?? null,
                type: task.taskKind ?? "TASK",
                estimate: task.estimateDays ?? null
              });
            });

          const taskList = Array.from(taskMap.values()).sort((a, b) => a.id.localeCompare(b.id));
          return taskList.length > 0 ? (
            <section className="ui-card">
              <h2 className="text-lg font-semibold">Список задач</h2>
              <p className="mt-1 ui-muted">
                Задачи из XLSX и задачи, добавленные вручную.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[500px] border-collapse text-sm">
                  <thead>
                    <tr className="ui-table-head">
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
                        className="ui-table-row"
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

      </div>

      {isPlanningPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Пример планирования нагрузки"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xl leading-none text-slate-900 transition-colors hover:bg-white"
            onClick={() => setIsPlanningPreviewOpen(false)}
            aria-label="Закрыть"
          >
            ×
          </button>
          <img
            src={planningPreviewSrc}
            alt="Пример календаря планирования нагрузки разработчиков"
            className="max-h-[92vh] max-w-[96vw] rounded-lg border border-white/20 object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
