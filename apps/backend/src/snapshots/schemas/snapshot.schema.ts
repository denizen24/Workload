import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type SnapshotDocument = HydratedDocument<Snapshot>;

@Schema({ timestamps: true })
export class Snapshot {
  @Prop({ required: true, index: true })
  userId!: string;

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
