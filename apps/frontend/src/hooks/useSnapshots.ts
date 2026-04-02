import { useState } from "react";

import {
  SnapshotEntity,
  activateSnapshot,
  createSnapshot,
  deleteSnapshot,
  getSnapshot,
  getSnapshots
} from "../api/snapshots";
import { CustomTask, Sprint, WorkloadResponse } from "../types";

export type SnapshotLayoutPayload = {
  workloadData: WorkloadResponse | null;
  sprints: Sprint[];
  startSprintId: string | null;
  customTasks: CustomTask[];
  holidays: string[];
  releaseDates: string[];
  taskStartDates: Record<string, string>;
};

export function useSnapshots({
  setError,
  buildSnapshotLayout,
  applySnapshotLayout
}: {
  setError: (err: string | null) => void;
  buildSnapshotLayout: () => SnapshotLayoutPayload;
  applySnapshotLayout: (layout: SnapshotLayoutPayload) => void;
}) {
  const [snapshotSprintId, setSnapshotSprintId] = useState("");
  const [snapshotName, setSnapshotName] = useState("");
  const [snapshots, setSnapshots] = useState<SnapshotEntity[]>([]);
  const [isSnapshotsBusy, setIsSnapshotsBusy] = useState(false);
  const [hasLoadedSnapshots, setHasLoadedSnapshots] = useState(false);

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
      const result = await getSnapshots(snapshotSprintId || undefined);
      setSnapshots(result);
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
      const raw = snapshot.layout as Record<string, unknown>;
      const layout: SnapshotLayoutPayload = {
        workloadData: (raw?.workloadData as WorkloadResponse) ?? null,
        sprints: Array.isArray(raw?.sprints) ? raw.sprints as Sprint[] : [],
        startSprintId: typeof raw?.startSprintId === "string" ? raw.startSprintId : null,
        customTasks: Array.isArray(raw?.customTasks) ? raw.customTasks as CustomTask[] : [],
        holidays: Array.isArray(raw?.holidays) ? raw.holidays as string[] : [],
        releaseDates: Array.isArray(raw?.releaseDates) ? raw.releaseDates as string[] : [],
        taskStartDates: raw?.taskStartDates && typeof raw.taskStartDates === "object" ? raw.taskStartDates as Record<string, string> : {}
      };
      applySnapshotLayout(layout);
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
      const result = await getSnapshots(snapshotSprintId || undefined);
      setSnapshots(result);
      setHasLoadedSnapshots(true);
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

  const resetSnapshots = () => {
    setSnapshots([]);
    setHasLoadedSnapshots(false);
  };

  return {
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
    handleDeleteSnapshot,
    resetSnapshots
  };
}
