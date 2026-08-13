export const DND_TYPES = {
  TEACHER: "application/x-scheduling-teacher",
  LOCATION: "application/x-scheduling-location",
  GROUP: "application/x-scheduling-group",
  TIMESLOT: "application/x-scheduling-timeslot",
} as const;

export type DndPayload =
  | { kind: "teacher"; id: string }
  | { kind: "location"; id: string }
  | { kind: "group"; id: string }
  | { kind: "timeslot"; id: string };

export function parseDndPayload(raw: string): DndPayload | null {
  try {
    const parsed = JSON.parse(raw) as DndPayload;
    if (
      parsed &&
      (parsed.kind === "teacher" ||
        parsed.kind === "location" ||
        parsed.kind === "group" ||
        parsed.kind === "timeslot")
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function encodeDndPayload(payload: DndPayload): string {
  return JSON.stringify(payload);
}
