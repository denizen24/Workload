import { CustomTask, WorkloadResponse } from "../types";

type TaskListSectionProps = {
  data: WorkloadResponse;
  customTasks: CustomTask[];
  formatEstimate: (days: number) => string;
};

export function TaskListSection({ data, customTasks, formatEstimate }: TaskListSectionProps) {
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

  if (taskList.length === 0) return null;

  return (
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
              <tr key={task.id} className="ui-table-row">
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
  );
}
