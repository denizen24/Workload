import {
  Injectable,
  Logger,
  NotFoundException
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { CreateSnapshotDto } from "./dto/create-snapshot.dto";
import { UpdateSnapshotDto } from "./dto/update-snapshot.dto";
import { Snapshot, SnapshotDocument } from "./schemas/snapshot.schema";

@Injectable()
export class SnapshotsService {
  private readonly logger = new Logger(SnapshotsService.name);

  constructor(
    @InjectModel(Snapshot.name)
    private readonly snapshotModel: Model<SnapshotDocument>
  ) {}

  async findAll(userId: string, sprintId?: string, limit = 50, offset = 0) {
    const filter: Record<string, unknown> = { userId };
    if (sprintId) {
      filter.sprintId = sprintId;
    }

    return this.snapshotModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean()
      .exec();
  }

  async findOne(userId: string, snapshotId: string) {
    return this.findOwnedSnapshot(userId, snapshotId);
  }

  async create(userId: string, dto: CreateSnapshotDto) {
    if (dto.isActive) {
      await this.snapshotModel.updateMany(
        { userId, sprintId: dto.sprintId },
        { $set: { isActive: false } }
      );
    }

    this.logger.log(`Creating snapshot "${dto.name}" for sprint ${dto.sprintId}`);
    return this.snapshotModel.create({
      userId,
      sprintId: dto.sprintId,
      name: dto.name,
      isActive: Boolean(dto.isActive),
      layout: dto.layout
    });
  }

  async activate(userId: string, snapshotId: string) {
    const snapshot = await this.findOwnedSnapshot(userId, snapshotId);
    await this.snapshotModel.updateMany(
      { userId, sprintId: snapshot.sprintId },
      { $set: { isActive: false } }
    );

    snapshot.isActive = true;
    await snapshot.save();
    return snapshot;
  }

  async update(userId: string, snapshotId: string, dto: UpdateSnapshotDto) {
    const snapshot = await this.findOwnedSnapshot(userId, snapshotId);

    if (dto.name !== undefined) {
      snapshot.name = dto.name;
    }

    if (dto.layout !== undefined) {
      snapshot.layout = dto.layout;
    }

    await snapshot.save();
    return snapshot;
  }

  async remove(userId: string, snapshotId: string) {
    const snapshot = await this.findOwnedSnapshot(userId, snapshotId);
    await this.snapshotModel.deleteOne({ _id: snapshot._id }).exec();
    return { success: true };
  }

  private async findOwnedSnapshot(userId: string, snapshotId: string) {
    const snapshot = await this.snapshotModel
      .findById(snapshotId)
      .where("userId")
      .equals(userId)
      .exec();

    if (!snapshot) {
      throw new NotFoundException("Snapshot not found");
    }

    return snapshot;
  }
}
