import { endOfMonth, parseISO } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";

import { AuthSection } from "./components/AuthSection";
import { CustomTasksSection } from "./components/CustomTasksSection";
import { DateMarkersSection } from "./components/DateMarkersSection";
import { GanttBoard } from "./components/GanttBoard";
import { SnapshotsSection } from "./components/SnapshotsSection";
import { SprintSetupModal } from "./components/SprintSetupModal";
import { SprintsSection } from "./components/SprintsSection";
import { TaskListSection } from "./components/TaskListSection";
import { UploadPanel } from "./components/UploadPanel";
import { useAuth } from "./hooks/useAuth";
import { useScreenshot } from "./hooks/useScreenshot";
import { SnapshotLayoutPayload, useSnapshots } from "./hooks/useSnapshots";
import { useUpload } from "./hooks/useUpload";
import { CustomTask, CustomTaskType, Sprint } from "./types";

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
  const planningPreviewSrc = `${import.meta.env.BASE_URL}workload-planning-example.png`;
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [startSprintId, setStartSprintId] = useState<string | null>(null);
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [releaseDates, setReleaseDates] = useState<string[]>([]);
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

  const calendarRef = useRef<HTMLDivElement>(null);
  const [screenshotMenuOpen, setScreenshotMenuOpen] = useState(false);
  const [taskStartDates, setTaskStartDates] = useState<Record<string, string>>({});
  const [isPlanningPreviewOpen, setIsPlanningPreviewOpen] = useState(false);

  const upload = useUpload(sprints.length);
  const { data, isLoading, error, showSprintSetup, setError, setData, setShowSprintSetup } = upload;

  const auth = useAuth(setError);
  const handleSaveScreenshot = useScreenshot(calendarRef, setError);

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

  const applySnapshotLayout = useCallback((layout: SnapshotLayoutPayload) => {
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
  }, [setData]);

  const snapshotsHook = useSnapshots({
    setError,
    buildSnapshotLayout,
    applySnapshotLayout
  });

  const handleLogout = useCallback(async () => {
    await auth.handleLogout();
    snapshotsHook.resetSnapshots();
  }, [auth, snapshotsHook]);

  const handleUpload = useCallback(async (file: File) => {
    const result = await upload.handleUpload(file);
    if (result) setTaskStartDates({});
  }, [upload]);

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
      if (event.key === "Escape") setIsPlanningPreviewOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isPlanningPreviewOpen]);

  const addSprint = () => {
    const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    setSprints((prev) => [...prev, { id, name: "", start: "", end: "" }]);
    if (!startSprintId) setStartSprintId(id);
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

  return (
    <div className="min-h-screen bg-surface-light px-6 py-8 text-slate-900 dark:bg-surface-dark dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
              Workload Board
            </h1>
            <p className="ui-muted">
              Визуализация нагрузки разработчиков
            </p>
            <p className="mt-1 ui-text-caption">
              Сервис для планирования и балансировки нагрузки команды: загрузка задач из YouTrack (XLSX),
              визуальный календарь занятости, ручные корректировки и сохранение сценариев в снапшоты.
            </p>
          </div>
          <button
            className="ui-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Светлая тема" : "Темная тема"}
          >
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="9" r="3.5" />
                <path d="M9 1.5v1.5" /><path d="M9 15v1.5" />
                <path d="M1.5 9H3" /><path d="M15 9h1.5" />
                <path d="M3.7 3.7l1.06 1.06" /><path d="M13.24 13.24l1.06 1.06" />
                <path d="M3.7 14.3l1.06-1.06" /><path d="M13.24 4.76l1.06-1.06" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15.5 10.5a6.5 6.5 0 1 1-8-8 5 5 0 0 0 8 8z" />
              </svg>
            )}
          </button>
        </header>

        {error && (
          <div
            className="flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm dark:border-red-500/40 dark:bg-red-900/30 dark:text-red-300"
            role="alert"
          >
            <span>{error}</span>
            <button
              type="button"
              className="ml-2 rounded p-1 transition-colors hover:bg-red-200/60 dark:hover:bg-red-800/40"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 4l8 8" /><path d="M12 4l-8 8" />
              </svg>
            </button>
          </div>
        )}

        <AuthSection
          authMode={auth.authMode}
          setAuthMode={auth.setAuthMode}
          authEmail={auth.authEmail}
          setAuthEmail={auth.setAuthEmail}
          authPassword={auth.authPassword}
          setAuthPassword={auth.setAuthPassword}
          authSecret={auth.authSecret}
          setAuthSecret={auth.setAuthSecret}
          currentUser={auth.currentUser}
          isAuthBusy={auth.isAuthBusy}
          handleAuthSubmit={auth.handleAuthSubmit}
          handleLogout={handleLogout}
        />

        {auth.currentUser && (
          <SnapshotsSection
            snapshotSprintId={snapshotsHook.snapshotSprintId}
            setSnapshotSprintId={snapshotsHook.setSnapshotSprintId}
            snapshotName={snapshotsHook.snapshotName}
            setSnapshotName={snapshotsHook.setSnapshotName}
            snapshots={snapshotsHook.snapshots}
            isSnapshotsBusy={snapshotsHook.isSnapshotsBusy}
            hasLoadedSnapshots={snapshotsHook.hasLoadedSnapshots}
            handleLoadSnapshots={snapshotsHook.handleLoadSnapshots}
            handleSaveSnapshot={snapshotsHook.handleSaveSnapshot}
            handleApplySnapshot={snapshotsHook.handleApplySnapshot}
            handleActivateSnapshot={snapshotsHook.handleActivateSnapshot}
            handleDeleteSnapshot={snapshotsHook.handleDeleteSnapshot}
          />
        )}

        {data && (
          <div className="flex flex-col gap-3">
            <div className="ui-card flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Календарь задач</h2>
                <p className="ui-muted">Перетаскивайте задачи и фиксируйте итоговое расположение в снапшоте.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="ui-btn" onClick={() => setTaskStartDates({})}>
                  Сбросить расположение
                </button>
                <div className="relative">
                  <button
                    type="button"
                    className="ui-btn bg-slate-100 dark:bg-slate-800 dark:border-slate-600 inline-flex items-center gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setScreenshotMenuOpen((v) => !v);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="3.5" width="12" height="10" rx="1.5" />
                      <path d="M5.5 3.5V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" />
                      <circle cx="8" cy="8.5" r="2.5" />
                    </svg>
                    Сохранить скриншот
                  </button>
                  {screenshotMenuOpen && (
                    <div
                      className="absolute left-0 top-full z-30 mt-1 flex min-w-32 flex-col rounded-lg border border-slate-500/30 bg-white py-1 shadow-lg dark:bg-slate-800 dark:border-slate-600"
                      role="menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(["png", "jpeg"] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          className="px-4 py-2 text-left text-sm transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:hover:bg-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveScreenshot(fmt);
                            setScreenshotMenuOpen(false);
                          }}
                        >
                          {fmt === "png" ? "PNG" : "JPG"}
                        </button>
                      ))}
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

        {!data && !isLoading && !auth.currentUser && (
          <section className="ui-card">
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-semibold">Пример, как может выглядеть ваш календарь планирования</h2>
                <p className="ui-muted">Нажмите на миниатюру, чтобы открыть изображение на весь экран.</p>
              </div>
              <button
                type="button"
                className="w-fit max-w-full overflow-hidden rounded-xl border border-slate-500/30"
                onClick={() => setIsPlanningPreviewOpen(true)}
                aria-label="Открыть пример календаря планирования"
              >
                <img
                  src={planningPreviewSrc}
                  alt="Пример календаря планирования нагрузки разработчиков"
                  className="h-auto w-[340px] max-w-full bg-slate-100 object-contain dark:bg-slate-800"
                />
              </button>
            </div>
          </section>
        )}

        {data && (
          <SprintsSection
            sprints={sprints}
            startSprintId={startSprintId}
            addSprint={addSprint}
            updateSprint={updateSprint}
            removeSprint={removeSprint}
            setStartSprintId={setStartSprintId}
          />
        )}

        {data && (
          <DateMarkersSection
            holidays={holidays}
            setHolidays={setHolidays}
            releaseDates={releaseDates}
            setReleaseDates={setReleaseDates}
          />
        )}

        {data && (
          <CustomTasksSection
            assignees={data.assignees}
            customTasks={customTasks}
            taskDraft={taskDraft}
            updateTaskDraft={updateTaskDraft}
            addCustomTask={addCustomTask}
            removeCustomTask={removeCustomTask}
            formatEstimate={formatEstimate}
          />
        )}

        {data && (
          <TaskListSection
            data={data}
            customTasks={customTasks}
            formatEstimate={formatEstimate}
          />
        )}
      </div>

      {showSprintSetup && (
        <SprintSetupModal
          onConfirm={(sprint) => {
            setSprints((prev) => [...prev, sprint]);
            setStartSprintId(sprint.id);
            setShowSprintSetup(false);
          }}
          onSkip={() => setShowSprintSetup(false)}
        />
      )}

      {isPlanningPreviewOpen && (
        <div
          className="fixed inset-0 z-50 overflow-auto bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Пример планирования нагрузки"
        >
          <div className="relative mx-auto flex min-h-full w-fit items-start justify-center py-8">
            <button
              type="button"
              className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-xl leading-none text-slate-900 transition-colors hover:bg-white"
              onClick={() => setIsPlanningPreviewOpen(false)}
              aria-label="Закрыть"
            >
              ×
            </button>
            <img
              src={planningPreviewSrc}
              alt="Пример календаря планирования нагрузки разработчиков"
              className="h-auto w-auto max-h-none max-w-none rounded-lg border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
