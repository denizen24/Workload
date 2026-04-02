export type ThemeMode = "light" | "dark";

export const boardPalette = {
  light: {
    headerText: "#1e1b4b",
    sprintFill: "#6366f1",
    monthFill: "#f1f5f9",
    gridStroke: "rgba(15, 23, 42, 0.06)",
    rowStroke: "rgba(15, 23, 42, 0.04)",
    metaText: "#94a3b8",
    weekendText: "#dc2626",
    releaseBg: "#fffbeb",
    releaseLine: "#d97706",
    weekendLine: "#ef4444",
    holidayLine: "#cbd5e1",
    taskPrimaryText: "#0f172a",
    taskSecondaryText: "#475569",
    sprintBoundary: "#6366f1"
  },
  dark: {
    headerText: "#c7d2fe",
    sprintFill: "#6366f1",
    monthFill: "#1a1d27",
    gridStroke: "rgba(148, 163, 184, 0.08)",
    rowStroke: "rgba(148, 163, 184, 0.06)",
    metaText: "#64748b",
    weekendText: "#f87171",
    releaseBg: "#422006",
    releaseLine: "#f59e0b",
    weekendLine: "#f87171",
    holidayLine: "#64748b",
    taskPrimaryText: "#0f172a",
    taskSecondaryText: "#334155",
    sprintBoundary: "#6366f1"
  }
} as const;

export const taskColors = {
  duty: "#fbbf24",
  featureOrTech: "#34d399",
  bug: "#fb923c",
  task: "#60a5fa"
} as const;

const assigneeNoteColors = {
  a: "#fef08a",
  s: "#bbf7d0",
  default: "#fbcfe8"
} as const;

export const getTaskColor = (taskType: string | null | undefined = null) => {
  const lower = taskType?.toLowerCase() ?? "";
  const isFeatureOrTech =
    lower.includes("feature") ||
    lower.includes("feat") ||
    lower.includes("tech task") ||
    lower.includes("tech_task") ||
    lower === "tech";
  const isBug = lower.includes("bug");
  const isTask =
    lower === "task" ||
    lower === "tasc" ||
    lower.includes("task") ||
    lower.includes("tasc") ||
    lower.includes("таск");
  const isDuty = lower === "duty" || lower.includes("дежурство");

  if (isDuty) return taskColors.duty;
  if (isFeatureOrTech) return taskColors.featureOrTech;
  if (isBug) return taskColors.bug;
  if (isTask) return taskColors.task;
  return taskColors.task;
};

export const getAssigneeNoteColor = (assignee: string) => {
  if (assignee.startsWith("a.")) return assigneeNoteColors.a;
  if (assignee.startsWith("s.")) return assigneeNoteColors.s;
  return assigneeNoteColors.default;
};
