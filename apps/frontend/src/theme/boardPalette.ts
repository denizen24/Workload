export type ThemeMode = "light" | "dark";

export const boardPalette = {
  light: {
    headerText: "#1e1b4b",
    sprintFill: "#a5b4fc",
    monthFill: "#e2e8f0",
    gridStroke: "rgba(15, 23, 42, 0.12)",
    rowStroke: "rgba(15, 23, 42, 0.08)",
    metaText: "#64748b",
    weekendText: "#dc2626",
    releaseBg: "#fef3c7",
    releaseLine: "#d97706",
    weekendLine: "#ef4444",
    holidayLine: "#94a3b8",
    taskPrimaryText: "#0f172a",
    taskSecondaryText: "#475569",
    sprintBoundary: "#6366f1"
  },
  dark: {
    headerText: "#c7d2fe",
    sprintFill: "#818cf8",
    monthFill: "#0f172a",
    gridStroke: "rgba(148, 163, 184, 0.25)",
    rowStroke: "rgba(148, 163, 184, 0.2)",
    metaText: "#94a3b8",
    weekendText: "#f87171",
    releaseBg: "#78350f",
    releaseLine: "#f59e0b",
    weekendLine: "#f87171",
    holidayLine: "#94a3b8",
    taskPrimaryText: "#0f172a",
    taskSecondaryText: "#334155",
    sprintBoundary: "#818cf8"
  }
} as const;

export const taskColors = {
  duty: "#facc15",
  featureOrTech: "#22c55e",
  bug: "#f97316",
  task: "#4ade80"
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
