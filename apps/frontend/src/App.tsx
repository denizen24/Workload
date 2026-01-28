import { useCallback, useEffect, useState } from "react";

import { GanttBoard } from "./components/GanttBoard";
import { UploadPanel } from "./components/UploadPanel";
import { WorkloadResponse } from "./types";

const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Ошибка загрузки");
  }
  return (await response.json()) as WorkloadResponse;
};

export default function App() {
  const [data, setData] = useState<WorkloadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await uploadFile(file);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обработки файла");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-surface-light px-6 py-8 text-slate-900 dark:bg-surface-dark dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Workload Board</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Визуализация нагрузки разработчиков в формате Miro Gantt
            </p>
          </div>
          <button
            className="rounded-full border border-slate-500/40 px-4 py-2 text-sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "Светлая тема" : "Темная тема"}
          </button>
        </header>

        <UploadPanel onFileAccepted={handleUpload} isLoading={isLoading} error={error} />

        {data && (
          <div className="rounded-2xl border border-slate-500/30 bg-white/80 p-4 shadow-lg dark:bg-slate-900/50">
            <GanttBoard data={data} />
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Поддерживаются колонки: Issue ID, Assignee, ownestimate, Period, Status,
            created, updated, Release, QA, SP.
          </div>
        )}
      </div>
    </div>
  );
}
