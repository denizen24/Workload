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

export type WorkloadResponse = {
  assignees: Assignee[];
  releases: ReleaseMarker[];
};
