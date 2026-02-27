import { NotFoundException } from "@nestjs/common";

import { SnapshotsService } from "../src/snapshots/snapshots.service";

describe("SnapshotsService", () => {
  const createSubject = () => {
    const snapshotModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteOne: jest.fn()
    };

    const service = new SnapshotsService(snapshotModel as never);
    return { service, snapshotModel };
  };

  it("throws not found when snapshot is not owned by user", async () => {
    const { service, snapshotModel } = createSubject();
    snapshotModel.findOne.mockReturnValue({
      exec: () => Promise.resolve(null)
    });

    await expect(service.findOne("65f1542df8af4f4fb163f110", "65f1542df8af4f4fb163f111")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("activates selected snapshot and deactivates others", async () => {
    const { service, snapshotModel } = createSubject();
    const snapshot = {
      sprintId: "sprint-1",
      isActive: false,
      save: jest.fn().mockResolvedValue(undefined)
    };

    snapshotModel.findOne.mockReturnValue({
      exec: () => Promise.resolve(snapshot)
    });
    snapshotModel.updateMany.mockResolvedValue({ modifiedCount: 2 });

    const result = await service.activate(
      "65f1542df8af4f4fb163f110",
      "65f1542df8af4f4fb163f111"
    );

    expect(snapshotModel.updateMany).toHaveBeenCalledTimes(1);
    expect(snapshot.save).toHaveBeenCalledTimes(1);
    expect(result.isActive).toBe(true);
  });
});
