import { isAuthenticated } from "./auth";
import { apiRequest } from "./http";

export type SnapshotLayout = Record<string, unknown>;

export type SnapshotEntity = {
  _id: string;
  userId: string;
  sprintId: string;
  name: string;
  isActive: boolean;
  layout: SnapshotLayout;
  createdAt: string;
  updatedAt: string;
};

export type SnapshotStorageMode = "local" | "remote";

export const getSnapshotStorageMode = (): SnapshotStorageMode =>
  isAuthenticated() ? "remote" : "local";

export const getSnapshots = async (sprintId?: string) => {
  const query = sprintId ? `?sprintId=${encodeURIComponent(sprintId)}` : "";
  return apiRequest<SnapshotEntity[]>(`/api/snapshots${query}`, {});
};

export const getSnapshot = async (snapshotId: string) => {
  return apiRequest<SnapshotEntity>(`/api/snapshots/${snapshotId}`, {});
};

export const createSnapshot = async (payload: {
  sprintId: string;
  name: string;
  isActive?: boolean;
  layout: SnapshotLayout;
}) => {
  return apiRequest<SnapshotEntity>("/api/snapshots", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const activateSnapshot = async (snapshotId: string) => {
  return apiRequest<SnapshotEntity>(
    `/api/snapshots/${snapshotId}/activate`,
    { method: "PATCH" },
  );
};

export const updateSnapshot = async (
  snapshotId: string,
  payload: { name?: string; layout?: SnapshotLayout }
) => {
  return apiRequest<SnapshotEntity>(`/api/snapshots/${snapshotId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const deleteSnapshot = async (snapshotId: string) => {
  return apiRequest<{ success: boolean }>(
    `/api/snapshots/${snapshotId}`,
    { method: "DELETE" },
  );
};
