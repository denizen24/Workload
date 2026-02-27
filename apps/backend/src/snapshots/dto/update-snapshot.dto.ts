import { IsObject, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateSnapshotDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsObject()
  layout?: Record<string, unknown>;
}
