"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_DATA,
  GROUP_COLORS,
  type AppData,
  type DayOverride,
  type Group,
  type Location,
  type Placement,
  type Teacher,
  type TimeSlot,
  type Topic,
} from "./types";
import { loadAppData, saveAppData } from "./storage";
import { generateId } from "./id";

interface SchedulingContextValue {
  data: AppData;
  hydrated: boolean;
  setStartDate: (date: string) => void;
  setCycleDays: (days: number) => void;
  setSetupComplete: (complete: boolean) => void;
  bulkImport: (payload: {
    teachers: string[];
    topics: string[];
    locations: string[];
    groups: string[];
    timeSlots: string[];
  }) => void;
  addTeacher: (name: string) => void;
  removeTeacher: (id: string) => void;
  addLocation: (name: string) => void;
  removeLocation: (id: string) => void;
  addTopic: (name: string) => void;
  removeTopic: (id: string) => void;
  addGroup: (name: string) => void;
  removeGroup: (id: string) => void;
  addPlacement: (groupId: string, startDate: string) => void;
  removePlacement: (id: string) => void;
  assignTeacherToPlacement: (teacherId: string, placementId: string) => void;
  unassignTeacherFromPlacement: (
    teacherId: string,
    placementId: string,
  ) => void;
  setPlacementLocation: (locationId: string, placementId: string) => void;
  clearPlacementLocation: (placementId: string) => void;
  setTimeSlots: (lines: string[]) => void;
  setPlacementTimeSlot: (
    placementId: string,
    slotId: string | null,
  ) => void;
  setPlacementCustomTime: (
    placementId: string,
    start: string,
    end: string,
  ) => void;
  clearPlacementTimeOverride: (placementId: string) => void;
  assignTeacherToPlacementDay: (
    placementId: string,
    date: string,
    teacherId: string,
  ) => void;
  unassignTeacherFromPlacementDay: (
    placementId: string,
    date: string,
    teacherId: string,
  ) => void;
  setPlacementLocationDay: (
    placementId: string,
    date: string,
    locationId: string | null,
  ) => void;
  setPlacementTimeSlotDay: (
    placementId: string,
    date: string,
    slotId: string | null,
  ) => void;
  setPlacementCustomTimeDay: (
    placementId: string,
    date: string,
    start: string,
    end: string,
  ) => void;
  clearDayOverride: (
    placementId: string,
    date: string,
    fields?: Array<
      "teacherIds" | "locationId" | "timeSlotId" | "customStartTime" | "customEndTime"
    >,
  ) => void;
  importData: (next: AppData) => void;
  resetAll: () => void;
}

const SchedulingContext = createContext<SchedulingContextValue | null>(null);

function splitLines(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function SchedulingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadAppData();
    if (stored) {
      setData(stored);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveAppData(data);
  }, [data, hydrated]);

  const setStartDate = useCallback((date: string) => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, startDate: date },
    }));
  }, []);

  const setCycleDays = useCallback((days: number) => {
    const safe = Math.max(1, Math.floor(days));
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, cycleDays: safe },
    }));
  }, []);

  const setSetupComplete = useCallback((complete: boolean) => {
    setData((prev) => ({ ...prev, setupComplete: complete }));
  }, []);

  const bulkImport = useCallback(
    (payload: {
      teachers: string[];
      topics: string[];
      locations: string[];
      groups: string[];
      timeSlots: string[];
    }) => {
      setData((prev) => {
        const teachers: Teacher[] = payload.teachers.map((name) => ({
          id: generateId("tch"),
          name,
        }));
        const topics: Topic[] = payload.topics.map((name) => ({
          id: generateId("top"),
          name,
        }));
        const locations: Location[] = payload.locations.map((name) => ({
          id: generateId("loc"),
          name,
        }));
        const groups: Group[] = payload.groups.map((name, idx) => ({
          id: generateId("grp"),
          name,
          color: GROUP_COLORS[idx % GROUP_COLORS.length],
        }));
        const timeSlots: TimeSlot[] = payload.timeSlots
          .filter((line) => /^\d{1,2}:\d{2}\s*[–—\-]\s*\d{1,2}:\d{2}$/.test(line.trim()))
          .map((line) => {
            const m = line.trim().match(/^(\d{1,2}):(\d{2})\s*[–—\-]\s*(\d{1,2}):(\d{2})$/);
            if (!m) return null;
            const start = `${String(Number(m[1])).padStart(2, "0")}:${String(Number(m[2])).padStart(2, "0")}`;
            const end = `${String(Number(m[3])).padStart(2, "0")}:${String(Number(m[4])).padStart(2, "0")}`;
            return { id: generateId("tsl"), start, end };
          })
          .filter((slot): slot is TimeSlot => slot !== null);
        return {
          ...prev,
          teachers,
          topics,
          locations,
          groups,
          placements: [],
          settings: {
            ...prev.settings,
            timeSlots,
            cycleDays: Math.max(1, payload.topics.length || prev.settings.cycleDays),
          },
          setupComplete: true,
        };
      });
    },
    [],
  );

  const addTeacher = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setData((prev) => ({
      ...prev,
      teachers: [...prev.teachers, { id: generateId("tch"), name: trimmed }],
    }));
  }, []);

  const removeTeacher = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      teachers: prev.teachers.filter((t) => t.id !== id),
      placements: prev.placements.map((p) => {
        const teacherIds = p.teacherIds.filter((tid) => tid !== id);
        const dayOverrides = p.dayOverrides?.map((o) =>
          o.teacherIds
            ? { ...o, teacherIds: o.teacherIds.filter((tid) => tid !== id) }
            : o,
        );
        return { ...p, teacherIds, dayOverrides };
      }),
    }));
  }, []);

  const addLocation = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setData((prev) => ({
      ...prev,
      locations: [...prev.locations, { id: generateId("loc"), name: trimmed }],
    }));
  }, []);

  const removeLocation = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      locations: prev.locations.filter((l) => l.id !== id),
      placements: prev.placements.map((p) => {
        const locationId = p.locationId === id ? null : p.locationId;
        const dayOverrides = p.dayOverrides?.map((o) =>
          o.locationId === id ? { ...o, locationId: null } : o,
        );
        return { ...p, locationId, dayOverrides };
      }),
    }));
  }, []);

  const addTopic = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setData((prev) => ({
      ...prev,
      topics: [...prev.topics, { id: generateId("top"), name: trimmed }],
    }));
  }, []);

  const removeTopic = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      topics: prev.topics.filter((t) => t.id !== id),
    }));
  }, []);

  const addGroup = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setData((prev) => {
      const idx = prev.groups.length;
      const group: Group = {
        id: generateId("grp"),
        name: trimmed,
        color: GROUP_COLORS[idx % GROUP_COLORS.length],
      };
      return { ...prev, groups: [...prev.groups, group] };
    });
  }, []);

  const removeGroup = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      groups: prev.groups.filter((g) => g.id !== id),
      placements: prev.placements.filter((p) => p.groupId !== id),
    }));
  }, []);

  const addPlacement = useCallback((groupId: string, startDate: string) => {
    setData((prev) => {
      const exists = prev.placements.some(
        (p) => p.groupId === groupId && p.startDate === startDate,
      );
      if (exists) return prev;
      const defaultSlot = prev.settings.timeSlots[0] ?? null;
      const placement: Placement = {
        id: generateId("plc"),
        groupId,
        startDate,
        teacherIds: [],
        locationId: null,
        timeSlotId: defaultSlot ? defaultSlot.id : null,
      };
      return { ...prev, placements: [...prev.placements, placement] };
    });
  }, []);

  const removePlacement = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      placements: prev.placements.filter((p) => p.id !== id),
    }));
  }, []);

  const assignTeacherToPlacement = useCallback(
    (teacherId: string, placementId: string) => {
      setData((prev) => ({
        ...prev,
        placements: prev.placements.map((p) => {
          if (p.id !== placementId) return p;
          if (p.teacherIds.includes(teacherId)) return p;
          return { ...p, teacherIds: [...p.teacherIds, teacherId] };
        }),
      }));
    },
    [],
  );

  const unassignTeacherFromPlacement = useCallback(
    (teacherId: string, placementId: string) => {
      setData((prev) => ({
        ...prev,
        placements: prev.placements.map((p) =>
          p.id === placementId
            ? {
                ...p,
                teacherIds: p.teacherIds.filter((id) => id !== teacherId),
              }
            : p,
        ),
      }));
    },
    [],
  );

  const setPlacementLocation = useCallback(
    (locationId: string, placementId: string) => {
      setData((prev) => ({
        ...prev,
        placements: prev.placements.map((p) =>
          p.id === placementId ? { ...p, locationId } : p,
        ),
      }));
    },
    [],
  );

  const clearPlacementLocation = useCallback((placementId: string) => {
    setData((prev) => ({
      ...prev,
      placements: prev.placements.map((p) =>
        p.id === placementId ? { ...p, locationId: null } : p,
      ),
    }));
  }, []);

  const setTimeSlots = useCallback((lines: string[]) => {
    setData((prev) => {
      const slots: TimeSlot[] = lines
        .filter((line) =>
          /^\d{1,2}:\d{2}\s*[–—\-]\s*\d{1,2}:\d{2}$/.test(line.trim()),
        )
        .map((line) => {
          const m = line
            .trim()
            .match(/^(\d{1,2}):(\d{2})\s*[–—\-]\s*(\d{1,2}):(\d{2})$/);
          if (!m) return null;
          const start = `${String(Number(m[1])).padStart(2, "0")}:${String(Number(m[2])).padStart(2, "0")}`;
          const end = `${String(Number(m[3])).padStart(2, "0")}:${String(Number(m[4])).padStart(2, "0")}`;
          return { id: generateId("tsl"), start, end };
        })
        .filter((slot): slot is TimeSlot => slot !== null);
      const removedIds = new Set(
        prev.settings.timeSlots
          .filter((s) => !slots.some((n) => n.start === s.start && n.end === s.end))
          .map((s) => s.id),
      );
      const newSlots = slots.map((s) => {
        const existing = prev.settings.timeSlots.find(
          (p) => p.start === s.start && p.end === s.end,
        );
        return existing ?? s;
      });
      return {
        ...prev,
        settings: { ...prev.settings, timeSlots: newSlots },
        placements: prev.placements.map((p) => {
          const timeSlotId =
            p.timeSlotId && removedIds.has(p.timeSlotId) ? null : p.timeSlotId;
          const dayOverrides = p.dayOverrides?.map((o) =>
            o.timeSlotId && removedIds.has(o.timeSlotId)
              ? { ...o, timeSlotId: null }
              : o,
          );
          return { ...p, timeSlotId, dayOverrides };
        }),
      };
    });
  }, []);

  const setPlacementTimeSlot = useCallback(
    (placementId: string, slotId: string | null) => {
      setData((prev) => ({
        ...prev,
        placements: prev.placements.map((p) =>
          p.id === placementId
            ? {
                ...p,
                timeSlotId: slotId,
                customStartTime: null,
                customEndTime: null,
              }
            : p,
        ),
      }));
    },
    [],
  );

  const setPlacementCustomTime = useCallback(
    (placementId: string, start: string, end: string) => {
      setData((prev) => ({
        ...prev,
        placements: prev.placements.map((p) =>
          p.id === placementId
            ? {
                ...p,
                customStartTime: start,
                customEndTime: end,
              }
            : p,
        ),
      }));
    },
    [],
  );

  const clearPlacementTimeOverride = useCallback((placementId: string) => {
    setData((prev) => ({
      ...prev,
      placements: prev.placements.map((p) =>
        p.id === placementId
          ? {
              ...p,
              timeSlotId: null,
              customStartTime: null,
              customEndTime: null,
            }
          : p,
      ),
    }));
  }, []);

  const updateDayOverride = useCallback(
    (
      placementId: string,
      date: string,
      patch: (
        ov: DayOverride | undefined,
        placement: Placement,
      ) => DayOverride | null | undefined,
    ) => {
      setData((prev) => ({
        ...prev,
        placements: prev.placements.map((p) => {
          if (p.id !== placementId) return p;
          const existing = p.dayOverrides?.find((o) => o.date === date);
          const next = patch(existing, p);
          const remaining = (p.dayOverrides ?? []).filter(
            (o) => o.date !== date,
          );
          const overrides = next ? [...remaining, next] : remaining;
          return { ...p, dayOverrides: overrides };
        }),
      }));
    },
    [],
  );

  const assignTeacherToPlacementDay = useCallback(
    (placementId: string, date: string, teacherId: string) => {
      updateDayOverride(placementId, date, (existing, p) => {
        const baseList = existing?.teacherIds ?? p.teacherIds;
        if (baseList.includes(teacherId)) return existing ?? { date };
        return {
          date,
          ...(existing ?? {}),
          teacherIds: [...baseList, teacherId],
        };
      });
    },
    [updateDayOverride],
  );

  const unassignTeacherFromPlacementDay = useCallback(
    (placementId: string, date: string, teacherId: string) => {
      updateDayOverride(placementId, date, (existing, p) => {
        const baseList = existing?.teacherIds ?? p.teacherIds;
        const next = baseList.filter((id) => id !== teacherId);
        const merged: DayOverride = {
          date,
          ...(existing ?? {}),
          teacherIds: next,
        };
        const hasOtherKeys = Object.keys(merged).some(
          (k) => k !== "date" && k !== "teacherIds",
        );
        if (next.length === 0 && !hasOtherKeys) return null;
        return merged;
      });
    },
    [updateDayOverride],
  );

  const setPlacementLocationDay = useCallback(
    (placementId: string, date: string, locationId: string | null) => {
      updateDayOverride(placementId, date, (existing) => ({
        date,
        ...(existing ?? {}),
        locationId,
      }));
    },
    [updateDayOverride],
  );

  const setPlacementTimeSlotDay = useCallback(
    (placementId: string, date: string, slotId: string | null) => {
      updateDayOverride(placementId, date, (existing) => ({
        date,
        ...(existing ?? {}),
        timeSlotId: slotId,
        customStartTime: null,
        customEndTime: null,
      }));
    },
    [updateDayOverride],
  );

  const setPlacementCustomTimeDay = useCallback(
    (placementId: string, date: string, start: string, end: string) => {
      updateDayOverride(placementId, date, (existing) => ({
        date,
        ...(existing ?? {}),
        customStartTime: start,
        customEndTime: end,
        timeSlotId: null,
      }));
    },
    [updateDayOverride],
  );

  const clearDayOverride = useCallback(
    (
      placementId: string,
      date: string,
      fields?: Array<
        | "teacherIds"
        | "locationId"
        | "timeSlotId"
        | "customStartTime"
        | "customEndTime"
      >,
    ) => {
      updateDayOverride(placementId, date, (existing) => {
        if (!existing) return null;
        if (!fields || fields.length === 0) return null;
        const next: DayOverride = { ...existing };
        for (const f of fields) {
          delete (next as Record<string, unknown>)[f];
        }
        const remainingKeys = Object.keys(next).filter((k) => k !== "date");
        if (remainingKeys.length === 0) return null;
        return next;
      });
    },
    [updateDayOverride],
  );

  const importData = useCallback((next: AppData) => {
    setData(next);
  }, []);

  const resetAll = useCallback(() => {
    setData({
      ...DEFAULT_DATA,
      settings: {
        ...DEFAULT_DATA.settings,
        startDate: new Date().toISOString().slice(0, 10),
      },
    });
  }, []);

  const value = useMemo<SchedulingContextValue>(
    () => ({
      data,
      hydrated,
      setStartDate,
      setCycleDays,
      setSetupComplete,
      bulkImport,
      addTeacher,
      removeTeacher,
      addLocation,
      removeLocation,
      addTopic,
      removeTopic,
      addGroup,
      removeGroup,
      addPlacement,
      removePlacement,
      assignTeacherToPlacement,
      unassignTeacherFromPlacement,
      setPlacementLocation,
      clearPlacementLocation,
      setTimeSlots,
      setPlacementTimeSlot,
      setPlacementCustomTime,
      clearPlacementTimeOverride,
      assignTeacherToPlacementDay,
      unassignTeacherFromPlacementDay,
      setPlacementLocationDay,
      setPlacementTimeSlotDay,
      setPlacementCustomTimeDay,
      clearDayOverride,
      importData,
      resetAll,
    }),
    [
      data,
      hydrated,
      setStartDate,
      setCycleDays,
      setSetupComplete,
      bulkImport,
      addTeacher,
      removeTeacher,
      addLocation,
      removeLocation,
      addTopic,
      removeTopic,
      addGroup,
      removeGroup,
      addPlacement,
      removePlacement,
      assignTeacherToPlacement,
      unassignTeacherFromPlacement,
      setPlacementLocation,
      clearPlacementLocation,
      setTimeSlots,
      setPlacementTimeSlot,
      setPlacementCustomTime,
      clearPlacementTimeOverride,
      assignTeacherToPlacementDay,
      unassignTeacherFromPlacementDay,
      setPlacementLocationDay,
      setPlacementTimeSlotDay,
      setPlacementCustomTimeDay,
      clearDayOverride,
      importData,
      resetAll,
    ],
  );

  return (
    <SchedulingContext.Provider value={value}>
      {children}
    </SchedulingContext.Provider>
  );
}

export function useScheduling(): SchedulingContextValue {
  const ctx = useContext(SchedulingContext);
  if (!ctx) {
    throw new Error("useScheduling must be used within SchedulingProvider");
  }
  return ctx;
}

export function useTeachers(): Teacher[] {
  return useScheduling().data.teachers;
}
export function useLocations(): Location[] {
  return useScheduling().data.locations;
}
export function useTopics(): Topic[] {
  return useScheduling().data.topics;
}
export function useGroups(): Group[] {
  return useScheduling().data.groups;
}

export { splitLines };
