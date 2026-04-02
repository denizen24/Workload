import { Sprint } from "../types";

type SprintsSectionProps = {
  sprints: Sprint[];
  startSprintId: string | null;
  addSprint: () => void;
  updateSprint: (id: string, patch: Partial<Sprint>) => void;
  removeSprint: (id: string) => void;
  setStartSprintId: (id: string) => void;
};

export function SprintsSection({
  sprints,
  startSprintId,
  addSprint,
  updateSprint,
  removeSprint,
  setStartSprintId
}: SprintsSectionProps) {
  return (
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

      <div className="mt-4 grid gap-2">
        {sprints.map((sprint) => (
          <div
            key={sprint.id}
            className={`grid gap-3 rounded-lg border border-slate-500/20 px-3 py-2 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto_auto] ${startSprintId === sprint.id ? 'border-l-[3px] border-l-indigo-500' : ''}`}
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
              className="ui-input font-mono text-sm"
              type="date"
              lang="ru"
              value={sprint.start}
              onChange={(event) =>
                updateSprint(sprint.id, { start: event.target.value })
              }
            />
            <input
              className="ui-input font-mono text-sm"
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
                  ? "text-indigo-600 dark:text-indigo-400 font-semibold"
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
  );
}
