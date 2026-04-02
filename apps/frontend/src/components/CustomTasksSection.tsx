import { Assignee, CustomTask, CustomTaskType } from "../types";

type TaskDraft = {
  assignee: string;
  type: CustomTaskType;
  start: string;
  end: string;
  taskIdentifier: string;
  taskKind: string;
  taskTitle: string;
  estimateDays: string;
};

type CustomTasksSectionProps = {
  assignees: Assignee[];
  customTasks: CustomTask[];
  taskDraft: TaskDraft;
  updateTaskDraft: (patch: Partial<TaskDraft>) => void;
  addCustomTask: () => void;
  removeCustomTask: (id: string) => void;
  formatEstimate: (days: number) => string;
};

const taskKindOptions = ["FEATURE / TECH TASK", "BUG", "TASK"];

const typeDotColors: Record<CustomTaskType, string> = {
  duty: "#f59e0b",
  vacation: "#10b981",
  sick: "#f43f5e",
  task: "#3b82f6",
};

const typeLabelsMap: Record<CustomTaskType, string> = {
  duty: "Дежурство",
  vacation: "Отпуск",
  sick: "Болезнь",
  task: "Задача",
};

export function CustomTasksSection({
  assignees,
  customTasks,
  taskDraft,
  updateTaskDraft,
  addCustomTask,
  removeCustomTask,
  formatEstimate
}: CustomTasksSectionProps) {
  return (
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

      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_0.9fr_0.9fr_0.9fr]">
        <select
          className="ui-input"
          value={taskDraft.assignee}
          onChange={(event) => updateTaskDraft({ assignee: event.target.value })}
        >
          <option value="" className="dark:bg-slate-800 dark:text-slate-100">
            Сотрудник
          </option>
          {assignees.map((assignee) => (
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
        <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_1.4fr_0.8fr]">
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
            className="ui-input font-mono"
            type="number"
            min="0.1"
            step="0.1"
            placeholder="Оценка, дн."
            value={taskDraft.estimateDays}
            onChange={(event) => updateTaskDraft({ estimateDays: event.target.value })}
          />
        </div>
      )}
      <div className="mt-2 ui-text-caption">
        Для дежурств/отпусков/больничных длительность считается по рабочим дням; для типа "Задача" берется из оценки.
      </div>

      {customTasks.length > 0 && (
        <div className="mt-4 text-sm">
          {customTasks.map((task, index) => (
            <div
              key={task.id}
              className={`flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 ${index < customTasks.length - 1 ? 'border-b border-slate-500/[0.12]' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: typeDotColors[task.type] || '#6b7280' }}
                  aria-hidden="true"
                />
                <span className="font-semibold">{task.assignee}</span>
                <span className="text-xs" style={{ color: typeDotColors[task.type] || '#6b7280' }}>
                  {typeLabelsMap[task.type]}
                </span>
                <span className="ui-text-secondary">
                  {task.taskIdentifier ? <span className="font-mono">{task.taskIdentifier}</span> : null}
                  {task.taskIdentifier ? " · " : ""}
                  {task.taskKind ? `${task.taskKind} · ` : ""}
                  {task.title} · <span className="font-mono">{task.start} → {task.end}</span> · <span className="font-mono">{task.durationDays}д</span>
                  {task.estimateDays ? <> · оценка <span className="font-mono">{formatEstimate(task.estimateDays)}</span></> : ""}
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
  );
}
