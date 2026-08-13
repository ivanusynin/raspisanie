import type { AppData, TimeSlot } from "./types";

const STORAGE_KEY = "schedule-builder-data-v2";

function generateFallbackId(): string {
  return `tsl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function migrateSettings(raw: AppData): AppData {
  const settings = raw.settings as AppData["settings"] & {
    defaultStartTime?: string;
    defaultEndTime?: string;
  };
  if (!Array.isArray(settings.timeSlots)) {
    const slots: TimeSlot[] = [];
    if (settings.defaultStartTime && settings.defaultEndTime) {
      slots.push({
        id: generateFallbackId(),
        start: settings.defaultStartTime,
        end: settings.defaultEndTime,
      });
    }
    settings.timeSlots = slots;
  }
  if (Array.isArray(raw.placements)) {
    raw.placements = raw.placements.map((p) => ({
      ...p,
      timeSlotId: (p as { timeSlotId?: string | null }).timeSlotId ?? null,
      customStartTime:
        (p as { customStartTime?: string | null }).customStartTime ?? null,
      customEndTime:
        (p as { customEndTime?: string | null }).customEndTime ?? null,
    }));
  }
  return raw;
}

export function loadAppData(): AppData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppData;
    if (
      !parsed.teachers ||
      !parsed.locations ||
      !parsed.topics ||
      !parsed.groups ||
      !parsed.settings ||
      !Array.isArray(parsed.placements)
    ) {
      return null;
    }
    return migrateSettings(parsed);
  } catch (err) {
    console.error("Failed to load data from localStorage", err);
    return null;
  }
}

export function saveAppData(data: AppData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save data to localStorage", err);
  }
}

export function clearAppData(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
