import html2canvas from "html2canvas";
import { RefObject, useCallback } from "react";

export function useScreenshot(
  calendarRef: RefObject<HTMLDivElement | null>,
  setError: (err: string | null) => void
) {
  const saveScreenshot = useCallback(
    async (format: "png" | "jpeg") => {
      const el = calendarRef.current;
      if (!el) return;
      const scrollContainer = el.firstElementChild as HTMLElement | null;
      if (!scrollContainer) return;

      const savedOverflow = scrollContainer.style.overflow;
      const savedWidth = scrollContainer.style.width;
      const savedHeight = scrollContainer.style.height;
      const savedBgEl = el.style.backgroundColor;
      const savedBgScroll = scrollContainer.style.backgroundColor;

      try {
        scrollContainer.style.overflow = "visible";
        scrollContainer.style.width = `${scrollContainer.scrollWidth}px`;
        scrollContainer.style.height = `${scrollContainer.scrollHeight}px`;
        el.style.backgroundColor = "#ffffff";
        scrollContainer.style.backgroundColor = "#ffffff";

        const fullWidth = scrollContainer.scrollWidth;
        const fullHeight = scrollContainer.scrollHeight;

        const canvas = await html2canvas(el, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          scale: window.devicePixelRatio || 1,
          logging: false,
          width: fullWidth,
          height: fullHeight,
          windowWidth: fullWidth,
          windowHeight: fullHeight,
          onclone(_, clonedEl) {
            const root = clonedEl as HTMLElement;
            root.style.backgroundColor = "#ffffff";
            const scroll = root.firstElementChild as HTMLElement;
            if (scroll) scroll.style.backgroundColor = "#ffffff";
            root.querySelectorAll("[class*='backdrop-blur'],[class*='bg-white/']").forEach((node) => {
              (node as HTMLElement).style.backgroundColor = "#ffffff";
              (node as HTMLElement).style.backdropFilter = "none";
            });
          }
        });

        el.style.backgroundColor = savedBgEl;
        scrollContainer.style.backgroundColor = savedBgScroll;
        scrollContainer.style.overflow = savedOverflow;
        scrollContainer.style.width = savedWidth;
        scrollContainer.style.height = savedHeight;

        const mime = format === "png" ? "image/png" : "image/jpeg";
        const ext = format === "png" ? "png" : "jpg";
        canvas.toBlob(
          (blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `workload-calendar-${new Date().toISOString().slice(0, 10)}.${ext}`;
            a.click();
            URL.revokeObjectURL(url);
          },
          mime,
          format === "jpeg" ? 0.92 : undefined
        );
      } catch (e) {
        el.style.backgroundColor = savedBgEl;
        scrollContainer.style.backgroundColor = savedBgScroll;
        scrollContainer.style.overflow = savedOverflow;
        scrollContainer.style.width = savedWidth;
        scrollContainer.style.height = savedHeight;
        setError(e instanceof Error ? e.message : "Ошибка сохранения скриншота");
      }
    },
    [calendarRef, setError]
  );

  return saveScreenshot;
}
