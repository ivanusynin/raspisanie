import type { AppData, Placement, ScheduleSettings } from "./types";
import { triggerDownload } from "./csv";

const SCHEMA_VERSION = 1;

interface ExportEnvelope {
  format: "schedule-builder";
  schemaVersion: number;
  exportedAt: string;
  data: AppData;
}

export function exportToJSON(data: AppData): void {
  const envelope: ExportEnvelope = {
    format: "schedule-builder",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
  const json = JSON.stringify(envelope, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `schedule_${stamp}.json`);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((v) => typeof v === "string")
  );
}

function validateSettings(raw: unknown): ScheduleSettings {
  if (!raw || typeof raw !== "object") {
    throw new Error("settings: ожидался объект");
  }
  const r = raw as Partial<ScheduleSettings>;
  if (typeof r.startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.startDate)) {
    throw new Error("settings.startDate: ожидался формат YYYY-MM-DD");
  }
  if (!Array.isArray(r.timeSlots)) {
    throw new Error("settings.timeSlots: ожидался массив");
  }
  const timeSlots = r.timeSlots.map((slot, idx) => {
    if (!slot || typeof slot !== "object") {
      throw new Error(`settings.timeSlots[${idx}]: ожидался объект`);
    }
    const s = slot as { id?: unknown; start?: unknown; end?: unknown };
    if (typeof s.id !== "string" || typeof s.start !== "string" || typeof s.end !== "string") {
      throw new Error(`settings.timeSlots[${idx}]: некорректные поля`);
    }
    return { id: s.id, start: s.start, end: s.end };
  });
  const cycleDays = typeof r.cycleDays === "number" ? r.cycleDays : 1;
  return { startDate: r.startDate, cycleDays, timeSlots };
}

function validatePlacement(raw: unknown, idx: number): Placement {
  if (!raw || typeof raw !== "object") {
    throw new Error(`placements[${idx}]: ожидался объект`);
  }
  const p = raw as Partial<Placement>;
  if (
    typeof p.id !== "string" ||
    typeof p.groupId !== "string" ||
    typeof p.startDate !== "string" ||
    !isStringArray(p.teacherIds)
  ) {
    throw new Error(`placements[${idx}]: некорректные поля`);
  }
  return {
    id: p.id,
    groupId: p.groupId,
    startDate: p.startDate,
    teacherIds: p.teacherIds,
    locationId: p.locationId ?? null,
    timeSlotId: p.timeSlotId ?? null,
    customStartTime: p.customStartTime ?? null,
    customEndTime: p.customEndTime ?? null,
    dayOverrides: Array.isArray(p.dayOverrides) ? p.dayOverrides : undefined,
  };
}

export function parseImportedJson(text: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error("Файл не является валидным JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Ожидался JSON-объект");
  }

  const candidate = (parsed as { data?: unknown }).data ?? parsed;
  const c = candidate as Partial<AppData>;

  if (
    !Array.isArray(c.teachers) ||
    !Array.isArray(c.locations) ||
    !Array.isArray(c.topics) ||
    !Array.isArray(c.groups) ||
    !Array.isArray(c.placements)
  ) {
    throw new Error(
      "Некорректная структура файла: ожидались массивы teachers, locations, topics, groups, placements",
    );
  }

  const settings = validateSettings(c.settings);

  return {
    teachers: c.teachers as AppData["teachers"],
    locations: c.locations as AppData["locations"],
    topics: c.topics as AppData["topics"],
    groups: c.groups as AppData["groups"],
    placements: c.placements.map((p, i) => validatePlacement(p, i)),
    settings,
    setupComplete: c.setupComplete ?? true,
  };
}

export async function readJsonFile(file: File): Promise<AppData> {
  const text = await file.text();
  return parseImportedJson(text);
}
