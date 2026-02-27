import { getAccessToken, isAuthenticated } from "./auth";
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

const requireAccessToken = () => {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Access token is missing");
  }
  return token;
};

export const getSnapshots = async (sprintId?: string) => {
  const token = requireAccessToken();
  const query = sprintId ? `?sprintId=${encodeURIComponent(sprintId)}` : "";
  return apiRequest<SnapshotEntity[]>(`/api/snapshots${query}`, {}, token);
};

export const getSnapshot = async (snapshotId: string) => {
  const token = requireAccessToken();
  return apiRequest<SnapshotEntity>(`/api/snapshots/${snapshotId}`, {}, token);
};

export const createSnapshot = async (payload: {
  sprintId: string;
  name: string;
  isActive?: boolean;
  layout: SnapshotLayout;
}) => {
  const token = requireAccessToken();
  return apiRequest<SnapshotEntity>(
    "/api/snapshots",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    token
  );
};

export const activateSnapshot = async (snapshotId: string) => {
  const token = requireAccessToken();
  return apiRequest<SnapshotEntity>(
    `/api/snapshots/${snapshotId}/activate`,
    { method: "PATCH" },
    token
  );
};

export const updateSnapshot = async (
  snapshotId: string,
  payload: { name?: string; layout?: SnapshotLayout }
) => {
  const token = requireAccessToken();
  return apiRequest<SnapshotEntity>(
    `/api/snapshots/${snapshotId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    token
  );
};

export const deleteSnapshot = async (snapshotId: string) => {
  const token = requireAccessToken();
  return apiRequest<{ success: boolean }>(
    `/api/snapshots/${snapshotId}`,
    { method: "DELETE" },
    token
  );
};
