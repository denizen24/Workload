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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const fs = require("fs");
const path = require("path");
const parse_service_1 = require("../parse/parse.service");
let FileController = class FileController {
    constructor(parseService) {
        this.parseService = parseService;
        this.uploadsDir = path.join(process.cwd(), "files");
    }
    onModuleInit() {
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }
    upload(file) {
        if (!file) {
            throw new common_1.BadRequestException("File is required");
        }
        const filePath = path.join(this.uploadsDir, file.filename);
        const buffer = fs.readFileSync(filePath);
        return this.parseService.parseWorkbook(buffer);
    }
    workload(file) {
        if (!file) {
            throw new common_1.BadRequestException("File is required");
        }
        const filePath = path.join(this.uploadsDir, file.filename);
        const buffer = fs.readFileSync(filePath);
        return this.parseService.parseWorkbook(buffer);
    }
};
exports.FileController = FileController;
__decorate([
    (0, common_1.Post)("upload"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file", {
        storage: (0, multer_1.diskStorage)({
            destination: (req, file, cb) => {
                const dir = path.join(process.cwd(), "files");
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                cb(null, dir);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                const ext = path.extname(file.originalname);
                const name = path.basename(file.originalname, ext);
                cb(null, `${name}-${uniqueSuffix}${ext}`);
            }
        }),
        limits: {
            fileSize: 20 * 1024 * 1024
        }
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FileController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)("workload"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file", {
        storage: (0, multer_1.diskStorage)({
            destination: (req, file, cb) => {
                const dir = path.join(process.cwd(), "files");
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                cb(null, dir);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                const ext = path.extname(file.originalname);
                const name = path.basename(file.originalname, ext);
                cb(null, `${name}-${uniqueSuffix}${ext}`);
            }
        }),
        limits: {
            fileSize: 20 * 1024 * 1024
        }
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FileController.prototype, "workload", null);
exports.FileController = FileController = __decorate([
    (0, common_1.Controller)("api"),
    __metadata("design:paramtypes", [parse_service_1.ParseService])
], FileController);
//# sourceMappingURL=file.controller.js.map