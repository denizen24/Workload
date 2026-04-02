import { Type } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested
} from "class-validator";

import { SnapshotLayoutDto } from "./snapshot-layout.dto";

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
