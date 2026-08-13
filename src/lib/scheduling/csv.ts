import type { AppData, Placement } from "./types";
import {
  getCycleLength,
  getDateKey,
  getEntriesForDate,
  isSunday,
  parseISODate,
} from "./schedule";

const MAX_DAYS_PER_PLACEMENT = 365 * 3;

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[";\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatDateRu(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function collectRowsForPlacement(
  placement: Placement,
  data: AppData,
  rows: string[][],
): void {
  const startDate = parseISODate(placement.startDate);
  const cycleDays = getCycleLength(data);
  let studyDay = 0;
  const cursor = new Date(startDate);

  for (let i = 0; i < MAX_DAYS_PER_PLACEMENT && studyDay < cycleDays; i += 1) {
    if (!isSunday(cursor)) {
      const iso = getDateKey(cursor);
      const entry = getEntriesForDate(data, iso).find(
        (e) => e.placementId === placement.id,
      );
      if (entry) {
        const teachers = entry.teacherNames.join(", ");
        const topic = entry.topicName ?? "";
        const description = [topic, teachers].filter(Boolean).join(" — ");
        rows.push([
          entry.groupName,
          formatDateRu(iso),
          entry.startTime ?? "",
          entry.endTime ?? "",
          description,
        ]);
      }
      studyDay += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
}

function buildCsvRows(data: AppData): string[][] {
  const rows: string[][] = [];
  rows.push(["Группы", "Дата", "С:", "до:", "Описание:"]);

  if (data.placements.length === 0) {
    return rows;
  }

  for (const placement of data.placements) {
    collectRowsForPlacement(placement, data, rows);
  }

  rows.sort((a, b) => {
    const dateCmp = a[1].localeCompare(b[1]);
    if (dateCmp !== 0) return dateCmp;
    return a[0].localeCompare(b[0], "ru");
  });

  return rows;
}

export function exportToCSV(data: AppData): { rowsWritten: number } {
  const rows = buildCsvRows(data);
  const lines = rows.map((r) => r.map(csvEscape).join(";"));
  const BOM = "\uFEFF";
  const csv = BOM + lines.join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `raspisanie_${data.settings.startDate}.csv`);
  return { rowsWritten: rows.length - 1 };
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 0);
}
