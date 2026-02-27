import { IsOptional, IsString } from "class-validator";

export class FindSnapshotsQueryDto {
  @IsOptional()
  @IsString()
  sprintId?: string;
}
