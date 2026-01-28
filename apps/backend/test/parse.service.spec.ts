import * as XLSX from "xlsx";

import { ParseService } from "../src/parse/parse.service";

describe("ParseService", () => {
  it("parses workload from sample workbook", () => {
    const workbook = XLSX.utils.book_new();
    const rows = [
      [
        "Issue ID",
        "Assignee",
        "ownestimate",
        "Period",
        "Status",
        "created",
        "updated",
        "Release",
        "QA",
        "SP"
      ],
      [
        "UCR-846",
        "a.pushkin",
        7200,
        "2026Q1 January-2",
        "IN PROGRESS",
        "2026-01-26",
        "2026-02-10",
        "v1.10",
        3600,
        0
      ]
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, "issues");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const service = new ParseService();
    const result = service.parseWorkbook(buffer);

    expect(result.assignees.length).toBe(1);
    expect(result.assignees[0].name).toBe("a.pushkin");
    expect(result.assignees[0].periods.length).toBeGreaterThan(0);
    expect(result.releases[0]).toEqual({ name: "v1.10", date: "2026-02-10" });
  });
});
