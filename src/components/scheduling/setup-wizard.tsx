"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowRight,
  Clock,
  GraduationCap,
  MapPin,
  School,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { splitLines, useScheduling } from "@/lib/scheduling/scheduling-context";
import {
  computeDurationLabel,
  parseTimeSlotLine,
  sortRussian as sortRussianStrings,
} from "@/lib/scheduling/schedule";

interface Field {
  key: "teachers" | "topics" | "locations" | "groups" | "timeSlots";
  title: string;
  description: string;
  placeholder: string;
  icon: typeof Users;
  countLabel: (n: number) => string;
  sortHint?: string;
}

const FIELDS: Field[] = [
  {
    key: "teachers",
    title: "Преподаватели",
    description: "ФИО преподавателей, ведущих курс",
    placeholder:
      "Иванов Иван Иванович\nПетрова Мария Сергеевна\nСидоров Алексей Петрович",
    icon: Users,
    countLabel: (n) =>
      n === 1 ? "1 преподаватель" : `${n} преподавателей`,
  },
  {
    key: "topics",
    title: "Темы занятий",
    description:
      "Темы по порядку — распределятся по дням цикла (воскресенья пропускаются)",
    placeholder:
      "Введение в дисциплину\nОсновные понятия\nПрактическое занятие №1\nПрактическое занятие №2",
    icon: School,
    countLabel: (n) => (n === 1 ? "1 тема" : `${n} тем`),
    sortHint: "Сортировка тем изменит порядок цикла занятий",
  },
  {
    key: "locations",
    title: "Места обучения",
    description: "Аудитории, лаборатории или другие места проведения занятий",
    placeholder: "Аудитория 305\nЛаборатория 12\nКонференц-зал",
    icon: MapPin,
    countLabel: (n) => (n === 1 ? "1 место" : `${n} мест`),
  },
  {
    key: "groups",
    title: "Группы обучения",
    description:
      "Учебные группы, которые будут заниматься по этому курсу",
    placeholder: "Группа А-101\nГруппа Б-202\nГруппа В-303",
    icon: GraduationCap,
    countLabel: (n) => (n === 1 ? "1 группа" : `${n} групп`),
  },
  {
    key: "timeSlots",
    title: "Время занятий",
    description:
      "Все возможные временные интервалы в формате HH:mm – HH:mm, по одному на строку. Первый интервал — по умолчанию для новых размещений; конкретное занятие можно переопределить в календаре.",
    placeholder: "09:00 – 12:00\n13:00 – 16:00\n17:00 – 20:00",
    icon: Clock,
    countLabel: (n) => (n === 1 ? "1 интервал" : `${n} интервалов`),
    sortHint: "Сортировка переставит порядок интервалов (первый = по умолчанию)",
  },
];

interface SetupWizardProps {
  onDone: () => void;
}

export function SetupWizard({ onDone }: SetupWizardProps) {
  const { bulkImport, data } = useScheduling();
  const [draft, setDraft] = useState<Record<Field["key"], string>>({
    teachers: "",
    topics: "",
    locations: "",
    groups: "",
    timeSlots: "",
  });

  useEffect(() => {
    setDraft({
      teachers: data.teachers.map((t) => t.name).join("\n"),
      topics: data.topics.map((t) => t.name).join("\n"),
      locations: data.locations.map((l) => l.name).join("\n"),
      groups: data.groups.map((g) => g.name).join("\n"),
      timeSlots: data.settings.timeSlots
        .map((s) => `${s.start} – ${s.end}`)
        .join("\n"),
    });
  }, [
    data.teachers,
    data.topics,
    data.locations,
    data.groups,
    data.settings.timeSlots,
  ]);

  const linesByField = useMemo(
    () => ({
      teachers: splitLines(draft.teachers),
      topics: splitLines(draft.topics),
      locations: splitLines(draft.locations),
      groups: splitLines(draft.groups),
      timeSlots: splitLines(draft.timeSlots),
    }),
    [draft],
  );

  const validTimeSlots = useMemo(
    () =>
      linesByField.timeSlots
        .map((line) => parseTimeSlotLine(line))
        .filter((slot): slot is NonNullable<typeof slot> => slot !== null),
    [linesByField.timeSlots],
  );

  const counts = {
    teachers: linesByField.teachers.length,
    topics: linesByField.topics.length,
    locations: linesByField.locations.length,
    groups: linesByField.groups.length,
    timeSlots: validTimeSlots.length,
  };
  const allFilled =
    counts.teachers > 0 &&
    counts.topics > 0 &&
    counts.locations > 0 &&
    counts.groups > 0 &&
    counts.timeSlots > 0;

  const handleSort = (key: Field["key"]) => {
    const lines = linesByField[key];
    if (lines.length === 0) return;
    setDraft((prev) => ({
      ...prev,
      [key]: sortRussianStrings(lines).join("\n"),
    }));
    toast.success("Список отсортирован А→Я");
  };

  const handleSubmit = () => {
    if (!allFilled) {
      toast.error("Все поля должны быть заполнены");
      return;
    }
    bulkImport({
      teachers: linesByField.teachers,
      topics: linesByField.topics,
      locations: linesByField.locations,
      groups: linesByField.groups,
      timeSlots: linesByField.timeSlots,
    });
    toast.success("Данные сохранены");
    onDone();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Ввод данных курса</h1>
        <p className="text-sm text-muted-foreground">
          Каждая строка в поле — отдельная запись. Можно скопировать список из
          блокнота или Excel и вставить целиком.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((field) => {
          const Icon = field.icon;
          const count = counts[field.key];
          const invalidTimeSlots =
            field.key === "timeSlots"
              ? linesByField.timeSlots.length - validTimeSlots.length
              : 0;
          return (
            <Card
              key={field.key}
              className={
                field.key === "timeSlots"
                  ? "md:col-span-2 border-primary/40"
                  : undefined
              }
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5 text-primary" />
                  {field.title}
                </CardTitle>
                <CardDescription>{field.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort(field.key)}
                    disabled={count === 0}
                    className="h-8 gap-1 px-2 text-xs"
                    title={
                      field.sortHint
                        ? field.sortHint
                        : `Отсортировать ${field.title.toLowerCase()} по алфавиту`
                    }
                  >
                    <ArrowDownAZ className="h-3.5 w-3.5" />
                    А→Я
                  </Button>
                </div>

                <Textarea
                  value={draft[field.key]}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  rows={field.key === "timeSlots" ? 4 : 6}
                  className="resize-y font-mono text-sm"
                />

                {field.key === "timeSlots" && validTimeSlots.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 rounded-md border bg-muted/30 p-2 text-xs">
                    {validTimeSlots.map((slot, idx) => {
                      const duration = computeDurationLabel(
                        slot.start,
                        slot.end,
                      );
                      return (
                        <span
                          key={`${slot.start}-${slot.end}-${idx}`}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-mono font-medium text-primary"
                          title={
                            duration ? `Длительность: ${duration}` : undefined
                          }
                        >
                          <Clock className="h-3 w-3" />
                          {slot.start} – {slot.end}
                          {idx === 0 && (
                            <span className="rounded bg-primary/20 px-1 text-[9px] uppercase tracking-wide">
                              по умолчанию
                            </span>
                          )}
                          {duration && (
                            <span className="text-[10px] text-muted-foreground">
                              · {duration}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    Введено:{" "}
                    <strong className="text-foreground">
                      {field.countLabel(count)}
                    </strong>
                    {field.key === "timeSlots" && invalidTimeSlots > 0 && (
                      <span className="ml-2 text-destructive">
                        Не распознано строк: {invalidTimeSlots} (формат HH:mm –
                        HH:mm)
                      </span>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Воскресенья считаются выходными и пропускаются при распределении тем
          по дням.
        </p>
        <Button
          onClick={handleSubmit}
          disabled={!allFilled}
          className="gap-1.5"
        >
          Сохранить и перейти к расписанию
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
