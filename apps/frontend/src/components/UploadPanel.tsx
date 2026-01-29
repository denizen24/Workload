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
        className="rounded-full border border-slate-500/40 px-4 py-2 text-sm"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading ? "Загрузка..." : "Загрузить"}
      </button>
      <span className="text-xs text-slate-500">Лист: issues</span>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
