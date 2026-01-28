import { ParseService } from "../parse/parse.service";
export declare class FileController {
    private readonly parseService;
    constructor(parseService: ParseService);
    upload(file?: Express.Multer.File): import("../parse/dto/workload.dto").WorkloadResponseDto;
    workload(file?: Express.Multer.File): import("../parse/dto/workload.dto").WorkloadResponseDto;
}
