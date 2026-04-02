import {
  IsArray,
  IsObject,
  IsOptional,
  IsString
} from "class-validator";

export class SnapshotLayoutDto {
  [key: string]: unknown;

  @IsOptional()
  @IsObject()
  workloadData?: Record<string, unknown> | null;

  @IsOptional()
  @IsArray()
  sprints?: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  startSprintId?: string | null;

  @IsOptional()
  @IsArray()
  customTasks?: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  holidays?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  releaseDates?: string[];

  @IsOptional()
  @IsObject()
  taskStartDates?: Record<string, string>;
}
