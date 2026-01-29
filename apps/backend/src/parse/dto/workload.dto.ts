import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

export class DayLoadDto {
  @IsDateString()
  date!: string;

  @IsNumber()
  load!: number;

  @IsArray()
  @IsString({ each: true })
  tasks!: string[];

  @IsOptional()
  @IsNumber()
  qaLoad?: number;

  @IsOptional()
  @IsNumber()
  spLoad?: number;
}

export class PeriodDto {
  @IsString()
  name!: string;

  @IsDateString()
  start!: string;

  @IsDateString()
  end!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayLoadDto)
  days!: DayLoadDto[];
}

export class AssigneeDto {
  @IsString()
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PeriodDto)
  periods!: PeriodDto[];
}

export class ReleaseDto {
  @IsString()
  name!: string;

  @IsDateString()
  date!: string;
}

export class WorkloadResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssigneeDto)
  assignees!: AssigneeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReleaseDto)
  releases!: ReleaseDto[];

  @IsOptional()
  taskTitles?: Record<string, string | null>;

  @IsOptional()
  taskTypes?: Record<string, string | null>;

  @IsOptional()
  taskEstimates?: Record<string, number>;
}
