"use client";

import { GripVertical, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DND_TYPES,
  encodeDndPayload,
  type DndPayload,
} from "@/lib/scheduling/dnd";
import { cn } from "@/lib/utils";

type Kind = "teacher" | "location" | "group" | "timeslot";

interface DraggableChipProps {
  id: string;
  label: string;
  kind: Kind;
  color?: string;
  variant?: "source" | "assigned";
  onRemove?: () => void;
  draggable?: boolean;
  className?: string;
  title?: string;
}

export function DraggableChip({
  id,
  label,
  kind,
  color,
  variant = "source",
  onRemove,
  draggable = true,
  className,
  title,
}: DraggableChipProps) {
  const payload: DndPayload = { kind, id };
  const mime =
    kind === "teacher"
      ? DND_TYPES.TEACHER
      : kind === "location"
        ? DND_TYPES.LOCATION
        : kind === "timeslot"
          ? DND_TYPES.TIMESLOT
          : DND_TYPES.GROUP;

  return (
    <Badge
      variant={variant === "source" ? "outline" : "secondary"}
      className={cn(
        "w-full min-w-0 justify-start gap-1.5 px-2 py-1.5 text-sm font-medium",
        variant === "source" && "cursor-grab active:cursor-grabbing",
        variant === "assigned" && color && "border-transparent text-white",
        className,
      )}
      style={
        variant === "assigned" && color
          ? { backgroundColor: color }
          : color
            ? { borderColor: color, color }
            : undefined
      }
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData(mime, encodeDndPayload(payload));
        event.dataTransfer.effectAllowed = "copyMove";
      }}
      title={title}
    >
      {draggable && (
        <GripVertical className="h-3.5 w-3.5 opacity-60" />
      )}
      <span className="block min-w-0 truncate" title={label}>{label}</span>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0 hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Удалить</span>
        </Button>
      )}
    </Badge>
  );
}
