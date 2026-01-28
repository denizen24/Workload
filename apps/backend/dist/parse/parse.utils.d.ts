export declare function toIsoDate(date: Date): string;
export declare function parseDateValue(value: unknown): Date | null;
export declare function parsePeriod(periodRaw: string | undefined | null): {
    start: Date;
    end: Date;
} | null;
export declare function eachDay(start: Date, end: Date): Date[];
export declare function quarterKey(date: Date): string;
export declare function quarterBounds(year: number, quarter: number): {
    start: Date;
    end: Date;
};
export declare function inferAssignee(value: unknown): string | null;
export declare function parseNumber(value: unknown): number | null;
