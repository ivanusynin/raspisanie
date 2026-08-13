export interface Teacher {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  color: string;
}

export interface TimeSlot {
  id: string;
  start: string;
  end: string;
}

export interface DayOverride {
  date: string;
  teacherIds?: string[];
  locationId?: string | null;
  timeSlotId?: string | null;
  customStartTime?: string | null;
  customEndTime?: string | null;
}

export interface Placement {
  id: string;
  groupId: string;
  startDate: string;
  teacherIds: string[];
  locationId: string | null;
  timeSlotId: string | null;
  customStartTime?: string | null;
  customEndTime?: string | null;
  dayOverrides?: DayOverride[];
}

export interface ScheduleSettings {
  startDate: string;
  cycleDays: number;
  timeSlots: TimeSlot[];
}

export interface AppData {
  teachers: Teacher[];
  locations: Location[];
  topics: Topic[];
  groups: Group[];
  placements: Placement[];
  settings: ScheduleSettings;
  setupComplete: boolean;
}

export const GROUP_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#14b8a6",
];

export const DEFAULT_DATA: AppData = {
  teachers: [],
  locations: [],
  topics: [],
  groups: [],
  placements: [],
  settings: {
    startDate: new Date().toISOString().slice(0, 10),
    cycleDays: 7,
    timeSlots: [
      { id: "default-slot", start: "09:00", end: "14:00" },
    ],
  },
  setupComplete: false,
};
