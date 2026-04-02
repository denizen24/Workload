import { SnapshotEntity, getSnapshotStorageMode } from "../api/snapshots";

type SnapshotsSectionProps = {
  snapshotSprintId: string;
  setSnapshotSprintId: (value: string) => void;
  snapshotName: string;
  setSnapshotName: (value: string) => void;
  snapshots: SnapshotEntity[];
  isSnapshotsBusy: boolean;
  hasLoadedSnapshots: boolean;
  handleLoadSnapshots: () => void;
  handleSaveSnapshot: () => void;
  handleApplySnapshot: (snapshotId: string) => void;
  handleActivateSnapshot: (snapshotId: string) => void;
  handleDeleteSnapshot: (snapshotId: string) => void;
};

export function SnapshotsSection({
  snapshotSprintId,
  setSnapshotSprintId,
  snapshotName,
  setSnapshotName,
  snapshots,
  isSnapshotsBusy,
  hasLoadedSnapshots,
  handleLoadSnapshots,
  handleSaveSnapshot,
  handleApplySnapshot,
  handleActivateSnapshot,
  handleDeleteSnapshot
}: SnapshotsSectionProps) {
  return (
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
          <div className="mt-3 text-sm">
            {snapshots.map((item, index) => (
              <div
                key={item._id}
                className={`flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 ${index < snapshots.length - 1 ? 'border-b border-slate-500/[0.12]' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${item.isActive ? 'bg-green-500' : 'bg-gray-400'}`}
                    aria-label={item.isActive ? "active" : "inactive"}
                  />
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
  );
}
