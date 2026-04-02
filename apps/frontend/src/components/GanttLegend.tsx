import { taskColors } from "../theme/boardPalette";

const legendItems = [
  { color: taskColors.duty, label: "DUTY" },
  { color: taskColors.featureOrTech, label: "FEATURE / TECH" },
  { color: taskColors.bug, label: "BUG" },
  { color: taskColors.task, label: "TASK" }
];

export function GanttLegend() {
  return (
    <div className="mt-4 flex items-center gap-6 border-t border-slate-500/10 pt-3 text-xs text-slate-600 dark:text-slate-400">
      {legendItems.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span className="font-mono">{item.label}</span>
        </span>
      ))}
    </div>
  );
}
