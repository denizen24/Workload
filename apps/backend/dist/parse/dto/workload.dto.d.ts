export declare class DayLoadDto {
    date: string;
    load: number;
    tasks: string[];
    qaLoad?: number;
    spLoad?: number;
}
export declare class PeriodDto {
    name: string;
    start: string;
    end: string;
    days: DayLoadDto[];
}
export declare class AssigneeDto {
    name: string;
    periods: PeriodDto[];
}
export declare class ReleaseDto {
    name: string;
    date: string;
}
export declare class WorkloadResponseDto {
    assignees: AssigneeDto[];
    releases: ReleaseDto[];
}
