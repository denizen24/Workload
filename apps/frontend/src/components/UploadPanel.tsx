import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

type UploadPanelProps = {
  onFileAccepted: (file: File) => void;
  isLoading: boolean;
  error?: string | null;
};

export function UploadPanel({ onFileAccepted, isLoading, error }: UploadPanelProps) {
  const onDrop = useCallback(
    (files: File[]) => {
      if (files.length > 0) {
        onFileAccepted(files[0]);
      }
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx"
      ]
    },
    multiple: false
  });

  return (
    <div
      {...getRootProps()}
      className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
        isDragActive ? "border-purple-500 bg-purple-500/10" : "border-slate-400/50"
      }`}
    >
      <input {...getInputProps()} />
      <p className="text-lg font-semibold">
        Перетащите XLSX сюда или нажмите для загрузки
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Лист должен называться "issues"
      </p>
      {isLoading && <p className="mt-4 text-sm text-purple-400">Парсим...</p>}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  );
}
