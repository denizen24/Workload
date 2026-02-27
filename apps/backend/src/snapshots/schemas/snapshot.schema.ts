import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

export type SnapshotDocument = HydratedDocument<Snapshot>;

@Schema({ timestamps: true })
export class Snapshot {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  sprintId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ default: false, index: true })
  isActive!: boolean;

  @Prop({ type: Object, required: true })
  layout!: Record<string, unknown>;
}

export const SnapshotSchema = SchemaFactory.createForClass(Snapshot);
SnapshotSchema.index({ userId: 1, sprintId: 1 });
SnapshotSchema.index({ userId: 1, sprintId: 1, isActive: 1 });
