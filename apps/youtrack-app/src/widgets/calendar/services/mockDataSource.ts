import { WorkloadResponse } from "../types";
import { mapRawToWorkloadResponse, RawMockPayload } from "./mapper";

export interface WorkloadDataSource {
  getWorkload(): Promise<WorkloadResponse>;
}

const defaultPayload: RawMockPayload = {
  releases: [
    { name: "Release 26.02", date: "2026-02-26" },
    { name: "Release 26.03", date: "2026-03-26" }
  ],
  tasks: [
    {
      id: "UCR-901",
      title: "Calendar widgets cleanup",
      type: "TASK",
      assignee: "a.pushkin",
      start: "2026-02-03",
      end: "2026-02-10",
      estimateDays: 6
    },
    {
      id: "UCR-915",
      title: "Mock datasource abstraction",
      type: "TECH TASK",
      assignee: "a.pushkin",
      start: "2026-02-11",
      end: "2026-02-19",
      estimateDays: 7
    },
    {
      id: "UCR-920",
      title: "Dashboard card rendering bug",
      type: "BUG",
      assignee: "s.esenin",
      start: "2026-02-06",
      end: "2026-02-12",
      estimateDays: 5
    },
    {
      id: "UCR-928",
      title: "Sprint marker refinement",
      type: "FEATURE",
      assignee: "s.esenin",
      start: "2026-02-16",
      end: "2026-02-27",
      estimateDays: 9
    },
    {
      id: "UCR-934",
      title: "Calendar export quality pass",
      type: "TASK",
      assignee: "m.lermontov",
      start: "2026-02-09",
      end: "2026-02-18",
      estimateDays: 8
    },
    {
      id: "UCR-941",
      title: "Widget packaging scripts",
      type: "TECH TASK",
      assignee: "m.lermontov",
      start: "2026-02-23",
      end: "2026-03-04",
      estimateDays: 8
    }
  ]
};

const compactPayload: RawMockPayload = {
  releases: [{ name: "Release 26.02", date: "2026-02-20" }],
  tasks: defaultPayload.tasks.slice(0, 3)
};

export class MockWorkloadDataSource implements WorkloadDataSource {
  constructor(private readonly payload: RawMockPayload) {}

  async getWorkload(): Promise<WorkloadResponse> {
    return mapRawToWorkloadResponse(this.payload);
  }
}

export const createMockWorkloadDataSource = (dataset: string): WorkloadDataSource => {
  if (dataset === "compact") {
    return new MockWorkloadDataSource(compactPayload);
  }
  return new MockWorkloadDataSource(defaultPayload);
};
