"use client";

import { useState } from "react";
import { Clock, MapPin, UserCog, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DND_TYPES,
  parseDndPayload,
  type DndPayload,
} from "@/lib/scheduling/dnd";
import { useScheduling } from "@/lib/scheduling/scheduling-context";
import type { DayPlacementEntry } from "@/lib/scheduling/schedule";
import { cn } from "@/lib/utils";

interface PlacementCardProps {
  entry: DayPlacementEntry;
}

export function PlacementCard({ entry }: PlacementCardProps) {
  const {
    data,
    unassignTeacherFromPlacement,
    assignTeacherToPlacement,
    setPlacementLocation,
    clearPlacementLocation,
    setPlacementTimeSlot,
    removePlacement,
  } = useScheduling();
  const [hoverTeacher, setHoverTeacher] = useState(false);
  const [hoverLocation, setHoverLocation] = useState(false);
  const [hoverTime, setHoverTime] = useState(false);

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    target: "teacher" | "location" | "time",
  ) => {
    const teacherRaw = event.dataTransfer.types.includes(DND_TYPES.TEACHER);
    const locationRaw = event.dataTransfer.types.includes(DND_TYPES.LOCATION);
    const timeslotRaw = event.dataTransfer.types.includes(DND_TYPES.TIMESLOT);

    if (target === "teacher" && !teacherRaw) return;
    if (target === "location" && !locationRaw) return;
    if (target === "time" && !timeslotRaw) return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    if (target === "teacher") setHoverTeacher(true);
    else if (target === "location") setHoverLocation(true);
    else setHoverTime(true);
  };

  const handleDragLeave = (target: "teacher" | "location" | "time") => {
    if (target === "teacher") setHoverTeacher(false);
    else if (target === "location") setHoverLocation(false);
    else setHoverTime(false);
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    target: "teacher" | "location" | "time",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setHoverTeacher(false);
    setHoverLocation(false);
    setHoverTime(false);

    const teacherRaw = event.dataTransfer.getData(DND_TYPES.TEACHER);
    const locationRaw = event.dataTransfer.getData(DND_TYPES.LOCATION);
    const timeslotRaw = event.dataTransfer.getData(DND_TYPES.TIMESLOT);

    let payload: DndPayload | null = null;
    if (target === "teacher" && teacherRaw) {
      payload = parseDndPayload(teacherRaw);
    } else if (target === "location" && locationRaw) {
      payload = parseDndPayload(locationRaw);
    } else if (target === "time" && timeslotRaw) {
      payload = parseDndPayload(timeslotRaw);
    }

    if (!payload) return;

    if (target === "teacher" && payload.kind === "teacher") {
      const teacher = data.teachers.find((t) => t.id === payload.id);
      if (!teacher) return;
      assignTeacherToPlacement(payload.id, entry.placementId);
    } else if (target === "location" && payload.kind === "location") {
      const location = data.locations.find((l) => l.id === payload.id);
      if (!location) return;
      setPlacementLocation(payload.id, entry.placementId);
    } else if (target === "time" && payload.kind === "timeslot") {
      const slot = data.settings.timeSlots.find((s) => s.id === payload.id);
      if (!slot) return;
      setPlacementTimeSlot(entry.placementId, slot.id);
    }
  };

  const timeLabel =
    entry.startTime && entry.endTime
      ? `${entry.startTime} – ${entry.endTime}`
      : "Перетащите время";

  return (
    <div
      className="group rounded-md border bg-card p-2 text-xs shadow-sm transition-all"
      style={{ borderLeftWidth: 4, borderLeftColor: entry.groupColor }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.groupColor }}
            />
            <span>{entry.groupName}</span>
          </div>
          <div className="mt-1 line-clamp-2 text-xs font-medium leading-tight">
            {entry.topicName ?? (
              <span className="text-muted-foreground">тема не назначена</span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => removePlacement(entry.placementId)}
          title="Удалить размещение"
        >
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>

      <div className="mt-1.5 space-y-1">
        <div
          onDragOver={(e) => handleDragOver(e, "time")}
          onDragLeave={() => handleDragLeave("time")}
          onDrop={(e) => handleDrop(e, "time")}
          className={cn(
            "flex min-h-[26px] items-center gap-1.5 rounded border border-dashed px-1.5 py-1 transition-colors",
            hoverTime
              ? "border-primary bg-primary/10"
              : "border-transparent bg-muted/30",
          )}
          title="Перетащите интервал времени из боковой панели"
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-foreground" />
          <span
            className={cn(
              "truncate font-mono text-xs font-semibold tracking-tight",
              !entry.startTime && "font-sans font-normal text-muted-foreground",
            )}
          >
            {timeLabel}
          </span>
        </div>

        <div
          onDragOver={(e) => handleDragOver(e, "teacher")}
          onDragLeave={() => handleDragLeave("teacher")}
          onDrop={(e) => handleDrop(e, "teacher")}
          className={cn(
            "group/row flex min-h-[24px] items-center gap-1 rounded border border-dashed px-1 py-0.5 transition-colors",
            hoverTeacher
              ? "border-primary bg-primary/10"
              : "border-transparent bg-muted/30",
          )}
        >
          <UserCog className="h-3 w-3 shrink-0 text-muted-foreground" />
          {entry.teacherNames.length > 0 ? (
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
              {entry.teacherNames.map((name) => {
                const teacher = data.teachers.find((t) => t.name === name);
                if (!teacher) return null;
                return (
                  <span
                    key={teacher.id}
                    className="inline-flex min-w-0 max-w-full items-center gap-0.5 truncate rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                    title={name}
                  >
                    <span className="truncate">{name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        unassignTeacherFromPlacement(
                          teacher.id,
                          entry.placementId,
                        )
                      }
                      className="shrink-0 hover:text-destructive"
                      title="Убрать преподавателя"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">
              Перетащите преподавателя
            </span>
          )}
        </div>

        <div
          onDragOver={(e) => handleDragOver(e, "location")}
          onDragLeave={() => handleDragLeave("location")}
          onDrop={(e) => handleDrop(e, "location")}
          className={cn(
            "group/row flex min-h-[24px] items-center gap-1 rounded border border-dashed px-1 py-0.5 transition-colors",
            hoverLocation
              ? "border-primary bg-primary/10"
              : "border-transparent bg-muted/30",
          )}
        >
          <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
          {entry.locationName ? (
            <span className="inline-flex min-w-0 max-w-full items-center gap-0.5 truncate rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              <span className="truncate" title={entry.locationName}>
                {entry.locationName}
              </span>
              <button
                type="button"
                onClick={() => clearPlacementLocation(entry.placementId)}
                className="shrink-0 hover:text-destructive"
                title="Убрать место"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">
              {entry.teacherNames.length > 0
                ? "Перетащите место обучения"
                : "Сначала добавьте преподавателя"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
