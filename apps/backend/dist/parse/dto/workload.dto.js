"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkloadResponseDto = exports.ReleaseDto = exports.AssigneeDto = exports.PeriodDto = exports.DayLoadDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class DayLoadDto {
}
exports.DayLoadDto = DayLoadDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DayLoadDto.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DayLoadDto.prototype, "load", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], DayLoadDto.prototype, "tasks", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DayLoadDto.prototype, "qaLoad", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DayLoadDto.prototype, "spLoad", void 0);
class PeriodDto {
}
exports.PeriodDto = PeriodDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PeriodDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], PeriodDto.prototype, "start", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], PeriodDto.prototype, "end", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => DayLoadDto),
    __metadata("design:type", Array)
], PeriodDto.prototype, "days", void 0);
class AssigneeDto {
}
exports.AssigneeDto = AssigneeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AssigneeDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PeriodDto),
    __metadata("design:type", Array)
], AssigneeDto.prototype, "periods", void 0);
class ReleaseDto {
}
exports.ReleaseDto = ReleaseDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReleaseDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ReleaseDto.prototype, "date", void 0);
class WorkloadResponseDto {
}
exports.WorkloadResponseDto = WorkloadResponseDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => AssigneeDto),
    __metadata("design:type", Array)
], WorkloadResponseDto.prototype, "assignees", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ReleaseDto),
    __metadata("design:type", Array)
], WorkloadResponseDto.prototype, "releases", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], WorkloadResponseDto.prototype, "taskTitles", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], WorkloadResponseDto.prototype, "taskTypes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], WorkloadResponseDto.prototype, "taskEstimates", void 0);
//# sourceMappingURL=workload.dto.js.map