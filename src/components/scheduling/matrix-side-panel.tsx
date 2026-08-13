"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  GraduationCap,
  MapPin,
  Pencil,
  Timer,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useScheduling } from "@/lib/scheduling/scheduling-context";
import { getAllTeacherHours } from "@/lib/scheduling/schedule";
import { DraggableChip } from "./draggable-chip";
import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  icon: typeof Users;
  count: number;
  color: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({
  title,
  icon: Icon,
  count,
  color,
  defaultOpen = true,
  children,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-md border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded text-white"
            style={{ backgroundColor: color }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-medium">{title}</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {count}
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="space-y-2 border-t p-3">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-1.5">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

interface MatrixSidePanelProps {
  onEditData: () => void;
}

export function MatrixSidePanel({ onEditData }: MatrixSidePanelProps) {
  const {
    data,
    removeTeacher,
    removeLocation,
    removeGroup,
  } = useScheduling();

  const teacherHours = useMemo(
    () => getAllTeacherHours(data).filter((t) => t.hours > 0),
    [data],
  );
  const totalHours = useMemo(
    () => teacherHours.reduce((sum, t) => sum + t.hours, 0),
    [teacherHours],
  );
  const formatHours = (value: number) => {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}.0 ч` : `${rounded} ч`;
  };

  return (
    <Card className="lg:sticky lg:top-4 lg:z-10 lg:flex lg:max-h-[calc(100vh-2rem)] lg:flex-col lg:overflow-hidden">
      <CardHeader className="shrink-0 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">Данные курса</CardTitle>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onEditData}
          >
            <Pencil className="h-3.5 w-3.5" />
            Изменить
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Чтобы добавить, удалить или отредактировать записи, нажмите «Изменить».
        </p>
      </CardHeader>
      <CardContent className="space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <Section
          title="Группы"
          icon={GraduationCap}
          count={
            data.groups.filter(
              (g) => !data.placements.some((p) => p.groupId === g.id),
            ).length
          }
          color="#6366f1"
        >
          {data.groups
            .filter(
              (g) => !data.placements.some((p) => p.groupId === g.id),
            )
            .map((g) => (
              <DraggableChip
                key={g.id}
                id={g.id}
                label={g.name}
                kind="group"
                color={g.color}
                onRemove={() => removeGroup(g.id)}
              />
            ))}
          {data.groups.filter(
            (g) => !data.placements.some((p) => p.groupId === g.id),
          ).length === 0 && (
            <p className="text-xs text-muted-foreground">
              {data.groups.length === 0
                ? "Нет групп"
                : "Все группы уже добавлены в календарь"}
            </p>
          )}
        </Section>

        <Section
          title="Преподаватели"
          icon={Users}
          count={data.teachers.length}
          color="#10b981"
        >
          {data.teachers.map((t) => (
            <DraggableChip
              key={t.id}
              id={t.id}
              label={t.name}
              kind="teacher"
              onRemove={() => removeTeacher(t.id)}
            />
          ))}
          {data.teachers.length === 0 && (
            <p className="text-xs text-muted-foreground">Нет преподавателей</p>
          )}
        </Section>

        <Section
          title="Места обучения"
          icon={MapPin}
          count={data.locations.length}
          color="#f59e0b"
        >
          {data.locations.map((l) => (
            <DraggableChip
              key={l.id}
              id={l.id}
              label={l.name}
              kind="location"
              onRemove={() => removeLocation(l.id)}
            />
          ))}
          {data.locations.length === 0 && (
            <p className="text-xs text-muted-foreground">Нет мест</p>
          )}
        </Section>

        <Section
          title="Время занятий"
          icon={Clock}
          count={data.settings.timeSlots.length}
          color="#8b5cf6"
        >
          {data.settings.timeSlots.map((slot, idx) => (
            <DraggableChip
              key={slot.id}
              id={slot.id}
              label={`${slot.start} – ${slot.end}`}
              kind="timeslot"
              className={cn(
                "font-mono text-xs",
                idx === 0 &&
                  "border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-100",
              )}
              title={
                idx === 0
                  ? `${slot.start} – ${slot.end} · по умолчанию. Перетащите на цикл в календаре, чтобы задать это время занятия.`
                  : `${slot.start} – ${slot.end}. Перетащите на цикл в календаре.`
              }
            />
          ))}
          {data.settings.timeSlots.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Нет временных интервалов
            </p>
          )}
        </Section>

        <div className="rounded-md border bg-card">
          <div className="flex w-full items-center justify-between gap-2 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-500 text-white">
                <Timer className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-medium">Часы преподавателей</span>
            </div>
            {teacherHours.length > 0 && (
              <span
                className="font-mono text-xs tabular-nums text-muted-foreground"
                title="Сумма часов всех преподавателей за весь период расписания"
              >
                Σ {formatHours(totalHours)}
              </span>
            )}
          </div>
          <div className="space-y-1 border-t p-2.5 text-xs">
            {teacherHours.length === 0 ? (
              <p className="text-muted-foreground">
                Пока никто не назначен — перетащите преподавателя на
                размещение в календаре.
              </p>
            ) : (
              <ul className="space-y-1">
                {teacherHours.map(({ teacherId, hours }) => {
                  const teacher = data.teachers.find((t) => t.id === teacherId);
                  if (!teacher) return null;
                  return (
                    <li
                      key={teacherId}
                      className="flex items-center justify-between gap-2"
                    >
                      <span
                        className="block min-w-0 truncate"
                        title={teacher.name}
                      >
                        {teacher.name}
                      </span>
                      <span className="shrink-0 font-mono tabular-nums font-medium text-foreground">
                        {formatHours(hours)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className={cn("rounded-md border bg-muted/30 p-2.5 text-xs")}>
          <p className="font-medium text-foreground">Подсказка</p>
          <ul className="mt-1.5 space-y-1 text-muted-foreground">
            <li>• Перетащите группу на день календаря — начнётся новый цикл</li>
            <li>• Перетащите преподавателя на placement в календаре</li>
            <li>• Перетащите место обучения на placement с преподавателем</li>
            <li>• Перетащите интервал времени на placement — задать время занятия</li>
            <li>• Воскресенья — выходные, цикл их пропускает</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
