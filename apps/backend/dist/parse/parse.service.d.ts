import { WorkloadResponseDto } from "./dto/workload.dto";
export declare class ParseService {
    parseWorkbook(buffer: Buffer): WorkloadResponseDto;
    private buildResponse;
    private validateResponse;
}
