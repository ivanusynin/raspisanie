import type {
  AppData,
  DayOverride,
  Placement,
  ScheduleSettings,
  TimeSlot,
} from "./types";

export function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export interface EffectiveTime {
  start: string;
  end: string;
  source: "custom" | "slot" | "default";
  slotId: string | null;
}

export function getEffectiveTime(
  placement: Placement,
  settings: ScheduleSettings,
  override?: DayOverride | null,
): EffectiveTime | null {
  const customStart =
    override && "customStartTime" in override
      ? override.customStartTime?.trim()
      : placement.customStartTime?.trim();
  const customEnd =
    override && "customEndTime" in override
      ? override.customEndTime?.trim()
      : placement.customEndTime?.trim();
  if (customStart && customEnd) {
    return {
      start: customStart,
      end: customEnd,
      source: "custom",
      slotId: null,
    };
  }
  const timeSlotId =
    override && "timeSlotId" in override
      ? override.timeSlotId
      : placement.timeSlotId;
  if (timeSlotId) {
    const slot = settings.timeSlots.find((s) => s.id === timeSlotId);
    if (slot) {
      return {
        start: slot.start,
        end: slot.end,
        source: "slot",
        slotId: slot.id,
      };
    }
  }
  const first = settings.timeSlots[0];
  if (first) {
    return {
      start: first.start,
      end: first.end,
      source: "default",
      slotId: first.id,
    };
  }
  return null;
}

export function getDayOverride(
  placement: Placement,
  date: string,
): DayOverride | null {
  return placement.dayOverrides?.find((o) => o.date === date) ?? null;
}

export function hasDayOverride(
  placement: Placement,
  date: string,
  field: keyof DayOverride,
): boolean {
  const ov = getDayOverride(placement, date);
  if (!ov) return false;
  return Object.prototype.hasOwnProperty.call(ov, field);
}

export interface DayEntryValues {
  teacherIds: string[];
  locationId: string | null;
  startTime: string | null;
  endTime: string | null;
  timeSource: "custom" | "slot" | "default" | null;
  timeSlotId: string | null;
  customStartTime: string | null;
  customEndTime: string | null;
  overridden: {
    time: boolean;
    teachers: boolean;
    location: boolean;
  };
}

export function getEffectiveDayEntry(
  placement: Placement,
  settings: ScheduleSettings,
  date: string,
): DayEntryValues {
  const ov = getDayOverride(placement, date);
  const teacherIds =
    ov && "teacherIds" in ov && ov.teacherIds ? ov.teacherIds : placement.teacherIds;
  const locationId =
    ov && "locationId" in ov ? ov.locationId : placement.locationId;
  const effective = getEffectiveTime(placement, settings, ov);
  return {
    teacherIds,
    locationId,
    startTime: effective?.start ?? null,
    endTime: effective?.end ?? null,
    timeSource: effective?.source ?? null,
    timeSlotId: effective?.slotId ?? null,
    customStartTime:
      ov && "customStartTime" in ov
        ? ov.customStartTime ?? null
        : placement.customStartTime ?? null,
    customEndTime:
      ov && "customEndTime" in ov
        ? ov.customEndTime ?? null
        : placement.customEndTime ?? null,
    overridden: {
      time: ov
        ? "customStartTime" in ov ||
          "customEndTime" in ov ||
          "timeSlotId" in ov
        : placement.customStartTime != null || placement.customEndTime != null,
      teachers: !!(ov && "teacherIds" in ov),
      location: !!(ov && "locationId" in ov),
    },
  };
}

export function formatTimeRange(start: string, end: string): string {
  return `${start} – ${end}`;
}

export function formatTimeSlot(slot: TimeSlot): string {
  return `${slot.start} – ${slot.end}`;
}

const TIME_PATTERN = /^(\d{1,2}):(\d{2})\s*[–—\-]\s*(\d{1,2}):(\d{2})$/;

export function parseTimeSlotLine(line: string): TimeSlot | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const match = TIME_PATTERN.exec(trimmed);
  if (!match) return null;
  const sh = Number(match[1]);
  const sm = Number(match[2]);
  const eh = Number(match[3]);
  const em = Number(match[4]);
  if (sh > 23 || eh > 23 || sm > 59 || em > 59) return null;
  const start = `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
  const end = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  return { id: "", start, end };
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function computeDurationLabel(start: string, end: string): string | null {
  const s = parseTimeToMinutes(start);
  const e = parseTimeToMinutes(end);
  if (s === null || e === null) return null;
  let diff = e - s;
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (hours === 0) return `${minutes} мин`;
  if (minutes === 0) return hours === 1 ? "1 час" : `${hours} ч`;
  return `${hours} ч ${minutes} мин`;
}

export function sortRussian<T extends string>(lines: T[]): T[] {
  return [...lines].sort((a, b) =>
    a.localeCompare(b, "ru", { sensitivity: "base", numeric: true }),
  );
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

export function weekdayLabel(date: Date): string {
  const labels = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  return labels[date.getDay()];
}

export function shortWeekdayLabel(date: Date): string {
  const labels = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  return labels[date.getDay()];
}

export function studyDayIndex(startDate: Date, targetDate: Date): number {
  if (targetDate < startDate) return -1;
  let count = 0;
  const cursor = new Date(startDate);
  while (cursor <= targetDate) {
    if (!isSunday(cursor)) {
      count += 1;
    }
    if (cursor.getTime() === targetDate.getTime()) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count - 1;
}

export interface PlacementDayInfo {
  placement: Placement;
  group: AppData["groups"][number];
  date: Date;
  iso: string;
  dayInCycle: number;
  topicIndex: number;
}

export interface DayPlacementEntry {
  placementId: string;
  groupId: string;
  groupName: string;
  groupColor: string;
  topicId: string | null;
  topicName: string | null;
  teacherIds: string[];
  teacherNames: string[];
  locationId: string | null;
  locationName: string | null;
  startTime: string | null;
  endTime: string | null;
  timeSource: "custom" | "slot" | "default" | null;
  timeSlotId: string | null;
  customStartTime: string | null;
  customEndTime: string | null;
  dayInCycle: number;
  cycleDayNumber: number;
  iso: string;
  overridden: {
    time: boolean;
    teachers: boolean;
    location: boolean;
  };
}

export function getCycleLength(data: AppData): number {
  return Math.max(1, data.topics.length);
}

const MAX_DAYS_FOR_HOURS = 365 * 2;

function hoursBetween(start: string, end: string): number {
  const s = parseTimeToMinutes(start);
  const e = parseTimeToMinutes(end);
  if (s === null || e === null) return 0;
  let diff = e - s;
  if (diff < 0) diff += 24 * 60;
  return diff / 60;
}

export function getTeacherTotalHours(data: AppData, teacherId: string): number {
  let total = 0;
  const cycleDays = getCycleLength(data);

  for (const placement of data.placements) {
    if (!placement.teacherIds.includes(teacherId)) continue;

    const startDate = parseISODate(placement.startDate);
    let studyDay = 0;
    const cursor = new Date(startDate);

    for (let i = 0; i < MAX_DAYS_FOR_HOURS && studyDay < cycleDays; i += 1) {
      if (!isSunday(cursor)) {
        const iso = getDateKey(cursor);
        const entry = getEntriesForDate(data, iso).find(
          (e) => e.placementId === placement.id,
        );
        if (entry?.startTime && entry?.endTime) {
          const dayEffectiveTeachers =
            entry.teacherIds.length > 0 ? entry.teacherIds : [teacherId];
          if (dayEffectiveTeachers.includes(teacherId)) {
            total += hoursBetween(entry.startTime, entry.endTime);
          }
        }
        studyDay += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return total;
}

export function getAllTeacherHours(
  data: AppData,
): { teacherId: string; hours: number }[] {
  return data.teachers
    .map((t) => ({ teacherId: t.id, hours: getTeacherTotalHours(data, t.id) }))
    .sort((a, b) => b.hours - a.hours);
}

export function getEntriesForDate(
  data: AppData,
  iso: string,
): DayPlacementEntry[] {
  const date = parseISODate(iso);
  if (isSunday(date)) return [];

  const topicsCount = data.topics.length;
  const cycleDays = getCycleLength(data);
  const result: DayPlacementEntry[] = [];

  for (const placement of data.placements) {
    const startDate = parseISODate(placement.startDate);
    const idx = studyDayIndex(startDate, date);
    if (idx < 0) continue;
    if (idx >= cycleDays) continue;

    const group = data.groups.find((g) => g.id === placement.groupId);
    if (!group) continue;

    const cycleDayNumber = idx + 1;
    const topicIndex = topicsCount > 0 ? idx % topicsCount : -1;
    const topic =
      topicIndex >= 0 && topicIndex < topicsCount
        ? data.topics[topicIndex]
        : null;
    const effective = getEffectiveDayEntry(placement, data.settings, iso);

    result.push({
      placementId: placement.id,
      groupId: group.id,
      groupName: group.name,
      groupColor: group.color,
      topicId: topic?.id ?? null,
      topicName: topic?.name ?? null,
      teacherIds: effective.teacherIds,
      teacherNames: effective.teacherIds
        .map((id) => data.teachers.find((t) => t.id === id)?.name ?? "")
        .filter(Boolean),
      locationId: effective.locationId,
      locationName:
        data.locations.find((l) => l.id === effective.locationId)?.name ?? null,
      startTime: effective.startTime,
      endTime: effective.endTime,
      timeSource: effective.timeSource,
      timeSlotId: effective.timeSlotId,
      customStartTime: effective.customStartTime,
      customEndTime: effective.customEndTime,
      dayInCycle: idx,
      cycleDayNumber,
      iso,
      overridden: effective.overridden,
    });
  }

  return result;
}

export function getEntriesForMonth(
  data: AppData,
  year: number,
  month: number,
): Map<string, DayPlacementEntry[]> {
  const map = new Map<string, DayPlacementEntry[]>();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    if (isSunday(date)) continue;
    const iso = getDateKey(date);
    const entries = getEntriesForDate(data, iso);
    if (entries.length > 0) {
      map.set(iso, entries);
    }
  }
  return map;
}

export interface CalendarDay {
  iso: string;
  day: number;
  isSunday: boolean;
}

export interface CalendarWeek {
  days: (CalendarDay | null)[];
}

export function buildMonthCalendar(year: number, month: number): CalendarWeek[] {
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const paddingBefore = startWeekday === 0 ? 6 : startWeekday - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: CalendarWeek[] = [];
  let week: (CalendarDay | null)[] = new Array(paddingBefore).fill(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    week.push({
      iso: getDateKey(date),
      day,
      isSunday: isSunday(date),
    });
    if (week.length === 7) {
      weeks.push({ days: week });
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push({ days: week });
  }

  return weeks;
}
