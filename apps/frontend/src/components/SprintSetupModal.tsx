import { useCallback, useEffect, useRef, useState } from "react";
import { endOfMonth } from "date-fns";

import { Sprint } from "../types";

type SprintSetupModalProps = {
  onConfirm: (sprint: Sprint) => void;
  onSkip: () => void;
};

export function SprintSetupModal({ onConfirm, onSkip }: SprintSetupModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const handleStartChange = (value: string) => {
    setStart(value);
    if (value && !end) {
      const startDate = new Date(value);
      if (!Number.isNaN(startDate.getTime())) {
        setEnd(endOfMonth(startDate).toISOString().slice(0, 10));
      }
    }
  };

  const handleConfirm = () => {
    if (!start || !end) return;
    const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    onConfirm({
      id,
      name: name.trim() || "Спринт 1",
      start,
      end
    });
  };

  const isValid = start && end;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onSkip();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onSkip]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    const firstInput = dialogRef.current?.querySelector<HTMLElement>("input");
    firstInput?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div ref={dialogRef} className="ui-card w-full max-w-md animate-slide-up border-l-[3px] border-indigo-500">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="16" height="14" rx="2" />
              <path d="M2 8h16" />
              <path d="M6 2v4" />
              <path d="M14 2v4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Настройка стартового спринта</h2>
            <p className="ui-text-caption">
              Задайте спринт, от которого начнётся календарь
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          <div>
            <label htmlFor="sprint-name" className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
              Название спринта
            </label>
            <input
              id="sprint-name"
              className="ui-input w-full"
              placeholder="Спринт 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sprint-start" className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                Дата начала
              </label>
              <input
                id="sprint-start"
                className="ui-input w-full font-mono"
                type="date"
                lang="ru"
                value={start}
                onChange={(e) => handleStartChange(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="sprint-end" className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                Дата окончания
              </label>
              <input
                id="sprint-end"
                className="ui-input w-full font-mono"
                type="date"
                lang="ru"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            className="ui-btn ui-btn-ghost text-xs"
            onClick={onSkip}
          >
            Пропустить
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            disabled={!isValid}
            onClick={handleConfirm}
          >
            Применить и показать календарь
          </button>
        </div>
      </div>
    </div>
  );
}
