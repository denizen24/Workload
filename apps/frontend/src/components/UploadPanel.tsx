import { useRef } from "react";
import type { ChangeEvent } from "react";

type UploadPanelProps = {
  onFileAccepted: (file: File) => void;
  isLoading: boolean;
  error?: string | null;
};

export function UploadPanel({ onFileAccepted, isLoading, error }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileAccepted(file);
      event.target.value = "";
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-lg p-6"
      style={{
        border: '2px dashed rgba(100, 116, 139, 0.35)',
        cursor: isLoading ? 'default' : 'pointer',
      }}
      onClick={() => !isLoading && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!isLoading) inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        onChange={handleSelect}
        className="hidden"
      />
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden="true">
        <path d="M10 14V3" />
        <path d="M5.5 7.5 10 3l4.5 4.5" />
        <path d="M3 13v2.5A1.5 1.5 0 0 0 4.5 17h11a1.5 1.5 0 0 0 1.5-1.5V13" />
      </svg>
      <button
        className="ui-btn ui-btn-primary"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
        disabled={isLoading}
      >
        {isLoading ? "Загрузка файла..." : "Загрузить"}
      </button>
      <span className="ui-text-caption">Лист: issues</span>
      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
