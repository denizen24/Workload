import { IsBoolean, IsObject, IsOptional, IsString, MinLength } from "class-validator";

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

  @IsObject()
  layout!: Record<string, unknown>;
}
