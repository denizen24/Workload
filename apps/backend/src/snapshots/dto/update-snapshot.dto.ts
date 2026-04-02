import { Type } from "class-transformer";
import {
  IsOptional,
  IsString,
  MinLength,
  ValidateNested
} from "class-validator";

import { SnapshotLayoutDto } from "./snapshot-layout.dto";

export class UpdateSnapshotDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SnapshotLayoutDto)
  layout?: SnapshotLayoutDto;
}
