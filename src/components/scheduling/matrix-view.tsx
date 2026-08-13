"use client";

import { useMemo, useRef, useState } from "react";
import {
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileText,
  RefreshCw,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DND_TYPES,
  parseDndPayload,
} from "@/lib/scheduling/dnd";
import {
  buildMonthCalendar,
  getEntriesForDate,
  isSunday,
  parseISODate,
} from "@/lib/scheduling/schedule";
import { exportToCSV } from "@/lib/scheduling/csv";
import { exportToPDF } from "@/lib/scheduling/pdf";
import { exportToJSON, readJsonFile } from "@/lib/scheduling/json";
import { useScheduling } from "@/lib/scheduling/scheduling-context";
import { PlacementCard } from "./placement-card";
import { MatrixSidePanel } from "./matrix-side-panel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

interface MatrixViewProps {
  showSetup: () => void;
}

interface MonthBlockProps {
  year: number;
  month: number;
  data: ReturnType<typeof useScheduling>["data"];
  hoverDate: string | null;
  onDragOver: (event: React.DragEvent<HTMLDivElement>, iso: string) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, iso: string) => void;
}

function MonthBlock({
  year,
  month,
  data,
  hoverDate,
  onDragOver,
  onDragLeave,
  onDrop,
}: MonthBlockProps) {
  const calendar = useMemo(
    () => buildMonthCalendar(year, month),
    [year, month],
  );

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold tracking-tight">
        {MONTHS[month]} {year}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {calendar.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-1">
            {week.days.map((day, dayIdx) => {
              if (!day) {
                return <div key={dayIdx} className="min-h-[110px]" />;
              }
              const date = parseISODate(day.iso);
              const sunday = isSunday(date);
              const entries = sunday
                ? []
                : getEntriesForDate(data, day.iso);
              const isHover = hoverDate === day.iso;
              return (
                <div
                  key={dayIdx}
                  onDragOver={(e) => onDragOver(e, day.iso)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, day.iso)}
                  className={cn(
                    "flex min-h-[110px] flex-col gap-1 rounded-md border p-1.5 text-xs transition-colors",
                    sunday && "bg-muted/60 text-muted-foreground",
                    !sunday && entries.length === 0 &&
                      "bg-background hover:bg-muted/30",
                    !sunday &&
                      entries.length > 0 &&
                      "border-primary/30 bg-primary/5",
                    isHover &&
                      "border-primary bg-primary/10 ring-2 ring-primary/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-sm font-semibold leading-none",
                        sunday && "text-muted-foreground",
                      )}
                    >
                      {day.day}
                    </span>
                    {sunday ? (
                      <span className="flex items-center gap-0.5 text-[9px]">
                        <CalendarOff className="h-2.5 w-2.5" />
                        выходной
                      </span>
                    ) : entries.length > 0 ? (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-medium text-primary-foreground">
                        {entries.length}
                      </span>
                    ) : (
                      <span className="text-[9px] text-muted-foreground">
                        +
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {entries.map((entry) => (
                      <PlacementCard
                        key={entry.placementId}
                        entry={entry}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MatrixView({ showSetup }: MatrixViewProps) {
  const { data, addPlacement, importData } = useScheduling();
  const initial = data.settings.startDate
    ? parseISODate(data.settings.startDate)
    : new Date();
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const next = await readJsonFile(file);
      importData(next);
      toast.success(
        `Календарь загружен · преподавателей: ${next.teachers.length}, групп: ${next.groups.length}, размещений: ${next.placements.length}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Неизвестная ошибка";
      toast.error(`Не удалось импортировать файл: ${message}`);
      console.error(err);
    }
  };

  const handlePrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    iso: string,
  ) => {
    if (isSunday(parseISODate(iso))) return;
    if (event.dataTransfer.types.includes(DND_TYPES.GROUP)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setHoverDate(iso);
    }
  };

  const handleDragLeave = () => {
    setHoverDate(null);
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    iso: string,
  ) => {
    event.preventDefault();
    setHoverDate(null);
    if (isSunday(parseISODate(iso))) {
      toast.error("Воскресенье — выходной, цикл не может начинаться в этот день");
      return;
    }
    const raw = event.dataTransfer.getData(DND_TYPES.GROUP);
    if (!raw) return;
    const payload = parseDndPayload(raw);
    if (payload?.kind !== "group") return;
    const group = data.groups.find((g) => g.id === payload.id);
    if (!group) return;

    const exists = data.placements.some(
      (p) => p.groupId === payload.id && p.startDate === iso,
    );
    if (exists) {
      toast.info(`Группа «${group.name}» уже размещена на эту дату`);
      return;
    }

    addPlacement(payload.id, iso);
    toast.success(`Цикл для «${group.name}» начат ${iso}`);
  };

  const totalPlacements = data.placements.length;
  const assignedPlacements = data.placements.filter(
    (p) => p.teacherIds.length > 0 && p.locationId,
  ).length;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 lg:py-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Матрица расписания
          </h1>
          <p className="text-sm text-muted-foreground">
            Перетащите группу на день — начнётся цикл занятий. Преподавателей и
            места добавляйте перетаскиванием на размещение.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              try {
                exportToPDF(data, year, month);
                toast.success("Открыт предпросмотр печати — выберите «Сохранить как PDF»");
              } catch (err) {
                toast.error("Не удалось открыть предпросмотр PDF");
                console.error(err);
              }
            }}
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              try {
                const { rowsWritten } = exportToCSV(data);
                if (rowsWritten === 0) {
                  toast.warning("Нет данных для экспорта — добавьте размещения в календарь");
                } else {
                  toast.success(`CSV скачан · строк: ${rowsWritten}`);
                }
              } catch (err) {
                toast.error("Не удалось скачать CSV");
                console.error(err);
              }
            }}
          >
            <FileDown className="h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              try {
                exportToJSON(data);
                toast.success("JSON-файл скачан");
              } catch (err) {
                toast.error("Не удалось скачать JSON");
                console.error(err);
              }
            }}
          >
            <FileDown className="h-4 w-4" />
            Экспорт
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleImportClick}
          >
            <Upload className="h-4 w-4" />
            Импорт
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
      </header>

      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                aria-label="Предыдущий месяц"
                className="h-9 w-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select
                value={`${year}-${month}`}
                onValueChange={(value) => {
                  const [y, m] = value.split("-").map(Number);
                  setYear(y);
                  setMonth(m);
                }}
              >
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((name, idx) => {
                    const value = `${year}-${idx}`;
                    return (
                      <SelectItem key={value} value={value}>
                        {name} {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                aria-label="Следующий месяц"
                className="h-9 w-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="h-9 gap-1.5"
              >
                <RefreshCw className="h-4 w-4" />
                Сегодня
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Тем в цикле:{" "}
                <strong className="text-foreground">{data.topics.length}</strong>
              </span>
              <span>
                Размещений:{" "}
                <strong className="text-foreground">{totalPlacements}</strong>
              </span>
              <span>
                Полностью заполнено:{" "}
                <strong className="text-foreground">
                  {assignedPlacements}
                </strong>
              </span>
              <span>
                Групп:{" "}
                <strong className="text-foreground">{data.groups.length}</strong>
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <MonthBlock
                year={year}
                month={month}
                data={data}
                hoverDate={hoverDate}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
              <MonthBlock
                year={nextYear}
                month={nextMonth}
                data={data}
                hoverDate={hoverDate}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
            </div>

            <MatrixSidePanel onEditData={showSetup} />
          </div>

          <div className="mt-4 rounded-md border bg-muted/20 p-3 text-sm">
            <p className="font-medium">Легенда</p>
            <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
              <li>
                • Длительность цикла равна числу тем — каждая тема занимает один
                учебный день
              </li>
              <li>
                • В одном дне могут учиться несколько групп — их карточки
                окрашены в цвет группы
              </li>
              <li>
                • Воскресенья подсвечены серым и не принимают новые размещения
              </li>
              <li>
                • Перетащите группу на день — этот день станет первым в цикле
              </li>
              <li>
                • Преподаватели и места назначаются на конкретное размещение
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Темы цикла</CardTitle>
          <CardDescription>
            Распределяются по дням цикла по порядку, воскресенья пропускаются.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">Темы не добавлены</p>
          ) : (
            <ol className="grid gap-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {data.topics.map((topic, idx) => (
                <li
                  key={topic.id}
                  className="flex items-start gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {idx + 1}
                  </span>
                  <span className="text-xs">{topic.name}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
        Данные хранятся локально. Кнопка «Изменить» в боковой панели — повторное
        редактирование списков преподавателей, тем, мест и групп.
      </footer>
    </div>
  );
}
