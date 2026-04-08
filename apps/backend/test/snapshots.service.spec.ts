import { NotFoundException } from "@nestjs/common";

import { SnapshotsService } from "../src/snapshots/snapshots.service";

describe("SnapshotsService", () => {
  const createSubject = () => {
    const chainable = {
      where: jest.fn().mockReturnThis(),
      equals: jest.fn().mockReturnThis(),
      exec: jest.fn()
    };

    const snapshotModel = {
      find: jest.fn(),
      findById: jest.fn().mockReturnValue(chainable),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteOne: jest.fn()
    };

    const service = new SnapshotsService(snapshotModel as never);
    return { service, snapshotModel, chainable };
  };

  it("throws not found when snapshot is not owned by user", async () => {
    const { service, chainable } = createSubject();
    chainable.exec.mockResolvedValue(null);

    await expect(
      service.findOne("kc-uuid-aaa", "65f1542df8af4f4fb163f111")
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("activates selected snapshot and deactivates others", async () => {
    const { service, snapshotModel, chainable } = createSubject();
    const snapshot = {
      sprintId: "sprint-1",
      isActive: false,
      save: jest.fn().mockResolvedValue(undefined)
    };

    chainable.exec.mockResolvedValue(snapshot);
    snapshotModel.updateMany.mockResolvedValue({ modifiedCount: 2 });

    const result = await service.activate("kc-uuid-aaa", "65f1542df8af4f4fb163f111");

    expect(snapshotModel.updateMany).toHaveBeenCalledTimes(1);
    expect(snapshot.save).toHaveBeenCalledTimes(1);
    expect(result.isActive).toBe(true);
  });
});
