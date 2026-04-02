import { useState } from "react";

type DateMarkersSectionProps = {
  holidays: string[];
  setHolidays: React.Dispatch<React.SetStateAction<string[]>>;
  releaseDates: string[];
  setReleaseDates: React.Dispatch<React.SetStateAction<string[]>>;
};

export function DateMarkersSection({
  holidays,
  setHolidays,
  releaseDates,
  setReleaseDates
}: DateMarkersSectionProps) {
  const [holidayInput, setHolidayInput] = useState("");
  const [dateMarkerType, setDateMarkerType] = useState<"holiday" | "release">("holiday");

  return (
    <section className="ui-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Праздничные и релизные дни</h2>
          <p className="ui-muted">
            Праздники скрываются из календаря; день релиза выделяется цветом на календаре.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          className="ui-input"
          value={dateMarkerType}
          onChange={(e) => setDateMarkerType(e.target.value as "holiday" | "release")}
        >
          <option value="holiday">Праздничный день</option>
          <option value="release">День релиза</option>
        </select>
        <input
          className="ui-input"
          type="date"
          lang="ru"
          value={holidayInput}
          onChange={(e) => setHolidayInput(e.target.value)}
        />
        <button
          type="button"
          className="ui-btn"
          onClick={() => {
            if (!holidayInput) return;
            const key = holidayInput.trim();
            if (dateMarkerType === "holiday") {
              if (holidays.includes(key)) return;
              setHolidays((prev) => [...prev, key].sort());
            } else {
              if (releaseDates.includes(key)) return;
              setReleaseDates((prev) => [...prev, key].sort());
            }
            setHolidayInput("");
          }}
        >
          Добавить
        </button>
      </div>
      {holidays.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="ui-text-caption">Праздники:</span>
          {holidays.map((date) => (
            <span
              key={`h-${date}`}
              className="ui-chip-neutral inline-flex items-center gap-1 py-0.5 pl-1.5 pr-1 text-xs"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                <rect x="2" y="3" width="12" height="11" rx="1.5" />
                <path d="M2 6.5h12" />
                <path d="M5.5 1.5v3" />
                <path d="M10.5 1.5v3" />
              </svg>
              {date}
              <button
                type="button"
                className="ui-chip-neutral-action"
                onClick={() => setHolidays((prev) => prev.filter((d) => d !== date))}
                aria-label={`Удалить ${date}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {releaseDates.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="ui-text-caption">Релизы:</span>
          {releaseDates.map((date) => (
            <span
              key={`r-${date}`}
              className="ui-chip-warning inline-flex items-center gap-1 py-0.5 pl-1.5 pr-1 text-xs"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                <path d="M2 14V2l6 3-6 3" />
                <path d="M10 8v6" />
                <path d="M10 8l4-2-4-2v4z" />
              </svg>
              {date}
              <button
                type="button"
                className="ui-chip-warning-action"
                onClick={() => setReleaseDates((prev) => prev.filter((d) => d !== date))}
                aria-label={`Удалить ${date}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
