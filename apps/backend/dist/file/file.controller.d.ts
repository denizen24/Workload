import { OnModuleInit } from "@nestjs/common";
import { ParseService } from "../parse/parse.service";
export declare class FileController implements OnModuleInit {
    private readonly parseService;
    private readonly uploadsDir;
    constructor(parseService: ParseService);
    onModuleInit(): void;
    upload(file?: Express.Multer.File): import("../parse/dto/workload.dto").WorkloadResponseDto;
    workload(file?: Express.Multer.File): import("../parse/dto/workload.dto").WorkloadResponseDto;
}
