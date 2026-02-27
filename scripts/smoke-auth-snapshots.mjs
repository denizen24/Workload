const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000/api";

const jsonRequest = async (path, init = {}, token) => {
  const headers = new Headers(init.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${path} -> ${response.status}: ${text}`);
  }

  return response.json();
};

const waitForHealth = async () => {
  const maxAttempts = 40;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) return;
    } catch {
      // ignore and retry
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("API healthcheck did not become ready in time");
};

const run = async () => {
  console.log(`[smoke] API: ${API_BASE_URL}`);
  await waitForHealth();
  console.log("[smoke] Healthcheck OK");

  const uniq = Date.now();
  const email = `smoke-${uniq}@example.com`;
  const password = "password123";

  const registerRes = await jsonRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      name: "Smoke User"
    })
  });

  if (!registerRes?.accessToken || !registerRes?.refreshToken) {
    throw new Error("register: tokens are missing");
  }

  const loginRes = await jsonRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  const accessToken = loginRes.accessToken;
  const refreshToken = loginRes.refreshToken;
  if (!accessToken || !refreshToken) {
    throw new Error("login: tokens are missing");
  }

  const meRes = await jsonRequest("/auth/me", {}, accessToken);
  if (meRes.email !== email.toLowerCase()) {
    throw new Error("me: unexpected user email");
  }

  const createSnapshotRes = await jsonRequest(
    "/snapshots",
    {
      method: "POST",
      body: JSON.stringify({
        sprintId: "smoke-sprint-1",
        name: "Smoke Snapshot",
        layout: {
          workloadData: null,
          sprints: [],
          startSprintId: null,
          customTasks: [],
          holidays: [],
          releaseDates: []
        }
      })
    },
    accessToken
  );

  const snapshotId = createSnapshotRes._id;
  if (!snapshotId) {
    throw new Error("create snapshot: _id is missing");
  }

  const listRes = await jsonRequest("/snapshots?sprintId=smoke-sprint-1", {}, accessToken);
  if (!Array.isArray(listRes) || listRes.length === 0) {
    throw new Error("list snapshots: empty result");
  }

  await jsonRequest(`/snapshots/${snapshotId}/activate`, { method: "PATCH" }, accessToken);
  await jsonRequest(`/snapshots/${snapshotId}`, { method: "DELETE" }, accessToken);

  const refreshRes = await jsonRequest("/auth/refresh", { method: "POST" }, refreshToken);
  if (!refreshRes.accessToken || !refreshRes.refreshToken) {
    throw new Error("refresh: tokens are missing");
  }

  await jsonRequest("/auth/logout", { method: "POST" }, accessToken);

  console.log("[smoke] Auth + snapshots flow is OK");
};

run().catch((error) => {
  console.error("[smoke] FAILED");
  console.error(error);
  process.exit(1);
});
