import type { AppData } from "./types";
import {
  buildMonthCalendar,
  getEntriesForDate,
  isSunday,
  parseISODate,
  weekdayLabel,
} from "./schedule";

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace("#", "");
  const value =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const num = parseInt(value, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

function isLightColor(hex: string): boolean {
  try {
    const { r, g, b } = hexToRgb(hex);
    return r * 0.299 + g * 0.587 + b * 0.114 > 180;
  } catch {
    return false;
  }
}

function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Высота страницы подбирается под количество недель в месяце:
// 4 недели → короче, 5 → средне, 6 → длиннее. Ширина фиксированная (A4 landscape).
const PAGE_WIDTH_MM = 297;
const PAGE_MARGIN_MM = 8;
const HEADER_FOOTER_MM = 55;
const ROW_HEIGHT_MM = 38;
const PAGE_HEIGHTS: Record<number, number> = {
  4: 4 * ROW_HEIGHT_MM + HEADER_FOOTER_MM + PAGE_MARGIN_MM * 2,
  5: 5 * ROW_HEIGHT_MM + HEADER_FOOTER_MM + PAGE_MARGIN_MM * 2,
  6: 6 * ROW_HEIGHT_MM + HEADER_FOOTER_MM + PAGE_MARGIN_MM * 2,
};

function buildMonthHtml(
  data: AppData,
  year: number,
  month: number,
  pageIndex: number,
): string {
  const monthName = MONTHS[month];
  const calendar = buildMonthCalendar(year, month);
  const weeks = Math.min(6, Math.max(4, calendar.length));
  const pageClass = `page page--${weeks}weeks`;

  const weeksHtml = calendar
    .map((week) => {
      const cellsHtml = week.days
        .map((day) => {
          if (!day) {
            return `<td class="cell empty"></td>`;
          }
          const date = parseISODate(day.iso);
          const sunday = isSunday(date);
          const entries = sunday ? [] : getEntriesForDate(data, day.iso);

          const entriesHtml = entries
            .map((entry) => {
              const textColor = isLightColor(entry.groupColor)
                ? "#111827"
                : "#ffffff";
              const time =
                entry.startTime && entry.endTime
                  ? `${entry.startTime}–${entry.endTime}`
                  : "";
              const teachers = entry.teacherNames.join(", ");
              const parts = [
                entry.topicName
                  ? `<div class="topic">${escapeHtml(entry.topicName)}</div>`
                  : "",
                time ? `<div class="time">${escapeHtml(time)}</div>` : "",
                teachers
                  ? `<div class="teacher">${escapeHtml(teachers)}</div>`
                  : "",
                entry.locationName
                  ? `<div class="location">${escapeHtml(entry.locationName)}</div>`
                  : "",
              ]
                .filter(Boolean)
                .join("");
              return `<div class="entry" style="background:${escapeHtml(entry.groupColor)};color:${textColor}">
                <div class="entry-header">
                  <span class="entry-group">${escapeHtml(entry.groupName)}</span>
                  <span class="entry-day">${entry.cycleDayNumber}</span>
                </div>
                ${parts}
              </div>`;
            })
            .join("");

          const dayClass = sunday ? "cell sunday" : "cell";
          const inner = sunday
            ? `<div class="day-num sunday">${day.day}</div><div class="sunday-label">выходной</div>`
            : `<div class="day-num">${day.day}</div>${entriesHtml}`;
          return `<td class="${dayClass}">${inner}</td>`;
        })
        .join("");

      return `<tr class="week-row">${cellsHtml}</tr>`;
    })
    .join("");

  const weekdaysHtml = WEEKDAYS.map((d) => `<th>${d}</th>`).join("");

  return `<section class="${pageClass}" data-page="${pageIndex}">
    <header class="page-header">
      <h1>${escapeHtml(monthName)} ${year}</h1>
      <div class="page-sub">Расписание занятий · ${escapeHtml(data.settings.startDate)}</div>
    </header>
    <table class="calendar">
      <thead><tr>${weekdaysHtml}</tr></thead>
      <tbody>${weeksHtml}</tbody>
    </table>
    <footer class="page-footer">
      <span>Размещений: ${data.placements.length}</span>
      <span>Групп: ${data.groups.length}</span>
      <span>Тем в цикле: ${data.topics.length}</span>
      <span class="page-number">Страница ${pageIndex + 1}</span>
    </footer>
  </section>`;
}

function buildPageSizeRules(): string {
  return Object.entries(PAGE_HEIGHTS)
    .map(([weeks, height]) => {
      const name = `month${weeks}`;
      return `@page ${name} { size: ${PAGE_WIDTH_MM}mm ${height}mm; margin: ${PAGE_MARGIN_MM}mm; }
.page--${weeks}weeks { page: ${name}; }`;
    })
    .join("\n");
}

function buildHtml(data: AppData, year: number, month: number): string {
  const startDate = parseISODate(data.settings.startDate);
  const baseYear = year ?? startDate.getFullYear();
  const baseMonth = month ?? startDate.getMonth();

  const months: { year: number; month: number }[] = [];
  for (let i = 0; i < 3; i += 1) {
    const d = new Date(baseYear, baseMonth + i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  const pagesHtml = months
    .map((m, idx) => buildMonthHtml(data, m.year, m.month, idx))
    .join("");

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>Расписание — ${escapeHtml(MONTHS[baseMonth])} ${baseYear}</title>
<style>
  ${buildPageSizeRules()}
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1f2937;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    page-break-after: always;
    padding: 4mm;
    display: flex;
    flex-direction: column;
    height: calc(100vh - 16mm);
  }
  .page:last-child { page-break-after: auto; }
  .page-header { margin-bottom: 3mm; flex-shrink: 0; }
  .page-header h1 {
    font-size: 20pt; font-weight: 700;
    margin: 0 0 1.5mm 0; color: #111827;
  }
  .page-sub { font-size: 9.5pt; color: #6b7280; }
  table.calendar {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    flex: 1;
  }
  table.calendar thead tr { height: 7mm; }
  table.calendar th {
    font-size: 9.5pt; font-weight: 600;
    color: #6b7280; text-align: left;
    padding: 1.5mm 3mm;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }
  table.calendar tr.week-row { height: ${ROW_HEIGHT_MM}mm; }
  table.calendar td.cell {
    vertical-align: top;
    width: calc(100% / 7);
    padding: 1.5mm;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-top: none; border-left: none;
    overflow: hidden;
  }
  table.calendar tr td.cell:first-child { border-left: 1px solid #e5e7eb; }
  table.calendar td.cell.empty { background: #fafafa; }
  table.calendar td.cell.sunday { background: #f3f4f6; color: #9ca3af; }
  .day-num {
    font-size: 10pt; font-weight: 700;
    color: #111827; margin-bottom: 1.5mm;
  }
  .day-num.sunday { color: #9ca3af; }
  .sunday-label { font-size: 8pt; color: #9ca3af; font-style: italic; }
  .entry {
    margin-bottom: 1mm;
    padding: 1mm 1.5mm;
    border-radius: 3px;
    font-size: 7.5pt;
    line-height: 1.2;
    overflow: hidden;
  }
  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1.5mm;
    margin-bottom: 0.5mm;
    font-weight: 700;
    font-size: 8pt;
  }
  .entry-group {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .entry-day {
    font-weight: 600;
    font-size: 6.5pt;
    opacity: 0.85;
    background: rgba(255,255,255,0.25);
    padding: 0.2mm 1mm;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .entry .topic { font-weight: 600; margin-bottom: 0.3mm; }
  .entry .time {
    font-family: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace;
    font-weight: 600; opacity: 0.95;
  }
  .entry .teacher { opacity: 0.95; }
  .entry .location { opacity: 0.85; font-style: italic; }
  .page-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 3mm;
    padding-top: 1.5mm;
    border-top: 1px solid #e5e7eb;
    font-size: 8pt;
    color: #6b7280;
    flex-shrink: 0;
  }
  .page-footer .page-number { font-weight: 600; color: #374151; }
  .print-bar {
    position: fixed;
    top: 8px; right: 8px;
    display: flex; gap: 8px;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .print-bar button {
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-family: inherit;
  }
  .print-bar .btn-print {
    background: #2563eb; color: #fff; border: 1px solid #2563eb;
  }
  .print-bar .btn-close {
    background: #fff; color: #111; border: 1px solid #d1d5db;
  }
  @media print {
    .print-bar { display: none !important; }
    .page { height: auto; }
  }
</style>
</head>
<body>
${pagesHtml}
<div class="print-bar no-print">
  <button type="button" class="btn-print" id="__printBtn">Печать / Сохранить PDF</button>
  <button type="button" class="btn-close" id="__closeBtn">Закрыть</button>
</div>
<script>
  (function () {
    var printBtn = document.getElementById('__printBtn');
    var closeBtn = document.getElementById('__closeBtn');
    if (printBtn) printBtn.addEventListener('click', function () { window.focus(); window.print(); });
    if (closeBtn) closeBtn.addEventListener('click', function () { window.close(); });
  })();
</script>
</body>
</html>`;
}

const IFRAME_ID = "__schedulePrintFrame";

export function exportToPDF(data: AppData, year?: number, month?: number): void {
  const html = buildHtml(data, year ?? 0, month ?? 0);

  let iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null;
  if (iframe) {
    iframe.remove();
  }

  iframe = document.createElement("iframe");
  iframe.id = IFRAME_ID;
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";

  document.body.appendChild(iframe);

  const triggerPrint = () => {
    try {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    } catch (err) {
      console.error("Не удалось вызвать печать:", err);
      window.open("about:blank", "_blank");
    }
  };

  iframe.addEventListener("load", () => {
    setTimeout(triggerPrint, 400);
  });

  iframe.srcdoc = html;
}
