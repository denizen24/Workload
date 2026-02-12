export type DayLoad = {
  date: string;
  load: number;
  tasks: string[];
  qaLoad?: number;
  spLoad?: number;
};

export type Period = {
  name: string;
  start: string;
  end: string;
  days: DayLoad[];
};

export type Assignee = {
  name: string;
  periods: Period[];
};

export type ReleaseMarker = {
  name: string;
  date: string;
};

export type Sprint = {
  id: string;
  name: string;
  start: string;
  end: string;
};

export type CustomTaskType = "duty" | "vacation" | "sick";

export type CustomTask = {
  id: string;
  assignee: string;
  type: CustomTaskType;
  start: string;
  end: string;
  durationDays: number;
  title: string;
};

export type WorkloadResponse = {
  assignees: Assignee[];
  releases: ReleaseMarker[];
  taskTitles?: Record<string, string | null>;
  taskTypes?: Record<string, string | null>;
  taskEstimates?: Record<string, number>;
};
