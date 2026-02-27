import {
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { CreateSnapshotDto } from "./dto/create-snapshot.dto";
import { UpdateSnapshotDto } from "./dto/update-snapshot.dto";
import { Snapshot, SnapshotDocument } from "./schemas/snapshot.schema";

@Injectable()
export class SnapshotsService {
  constructor(
    @InjectModel(Snapshot.name)
    private readonly snapshotModel: Model<SnapshotDocument>
  ) {}

  async findAll(userId: string, sprintId?: string) {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId)
    };
    if (sprintId) {
      filter.sprintId = sprintId;
    }

    return this.snapshotModel.find(filter).sort({ updatedAt: -1 }).exec();
  }

  async findOne(userId: string, snapshotId: string) {
    return this.findOwnedSnapshot(userId, snapshotId);
  }

  async create(userId: string, dto: CreateSnapshotDto) {
    if (dto.isActive) {
      await this.snapshotModel.updateMany(
        {
          userId: new Types.ObjectId(userId),
          sprintId: dto.sprintId
        },
        { $set: { isActive: false } }
      );
    }

    return this.snapshotModel.create({
      userId: new Types.ObjectId(userId),
      sprintId: dto.sprintId,
      name: dto.name,
      isActive: Boolean(dto.isActive),
      layout: dto.layout
    });
  }

  async activate(userId: string, snapshotId: string) {
    const snapshot = await this.findOwnedSnapshot(userId, snapshotId);
    await this.snapshotModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        sprintId: snapshot.sprintId
      },
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
      .findOne({
        _id: new Types.ObjectId(snapshotId),
        userId: new Types.ObjectId(userId)
      })
      .exec();

    if (!snapshot) {
      throw new NotFoundException("Snapshot not found");
    }

    return snapshot;
  }
}
