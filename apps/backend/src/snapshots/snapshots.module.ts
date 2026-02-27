import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { Snapshot, SnapshotSchema } from "./schemas/snapshot.schema";
import { SnapshotsController } from "./snapshots.controller";
import { SnapshotsService } from "./snapshots.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: Snapshot.name, schema: SnapshotSchema }])],
  controllers: [SnapshotsController],
  providers: [SnapshotsService]
})
export class SnapshotsModule {}
