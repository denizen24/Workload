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
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        onChange={handleSelect}
        className="hidden"
      />
      <button
        className="ui-btn"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading ? "Загрузка файла..." : "Загрузить"}
      </button>
      <span className="ui-text-caption">Лист: issues</span>
      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
