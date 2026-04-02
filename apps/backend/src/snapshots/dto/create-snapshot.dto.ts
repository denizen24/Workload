import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested
} from "class-validator";

class SnapshotLayoutDto {
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

export class CreateSnapshotDto {
  @IsString()
  @MinLength(1)
  sprintId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ValidateNested()
  @Type(() => SnapshotLayoutDto)
  layout!: SnapshotLayoutDto;
}
