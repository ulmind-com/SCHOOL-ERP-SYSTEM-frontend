"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths,
  differenceInCalendarDays,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  PartyPopper,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Loader } from "@/components/ui/loader";
import { Page } from "@/components/layout/page";
import {
  CalendarLegend,
  MonthGrid,
  eventsOn,
  holidaysOn,
  type CalendarEvent,
  type CalendarHoliday,
} from "@/components/calendar/month-grid";
import { api } from "@/lib/api";
import { titleCase } from "@/lib/utils";

interface CalendarData {
  from: string;
  to: string;
  holidays: CalendarHoliday[];
  events: CalendarEvent[];
}

/**
 * The institution's year on one grid.
 *
 * Everyone signed in gets the same screen — a school's year planner goes on the
 * notice board, not behind a permission. What differs is the range: a family
 * only sees the holidays that apply to their child's class.
 */
export default function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(() => new Date());

  // One wide fetch, then navigate in the browser. A year planner is a few
  // hundred rows at most, and paging it by month makes every arrow click blink.
  const from = useMemo(() => startOfMonth(subMonths(new Date(), 8)), []);
  const to = useMemo(() => addMonths(from, 26), [from]);

  const query = useQuery({
    queryKey: ["calendar", format(from, "yyyy-MM-dd")],
    queryFn: () =>
      api.get<CalendarData>("/portal/calendar", {
        start: format(from, "yyyy-MM-dd"),
        end: format(to, "yyyy-MM-dd"),
      }),
  });

  const holidays = query.data?.holidays ?? [];
  const events = query.data?.events ?? [];

  const thisMonthsHolidays = holidays.filter((holiday) => {
    const start = parseISO(holiday.start_date);
    const end = parseISO(holiday.end_date);
    return start <= addMonths(month, 1) && end >= month;
  });

  const closedDays = useMemo(() => {
    let count = 0;
    const cursor = new Date(month);
    while (isSameMonth(cursor, month)) {
      const covering = holidaysOn(holidays, cursor);
      if (covering.length && !covering.every((h) => h.attendance_required))
        count += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  }, [holidays, month]);

  if (query.isLoading) {
    return (
      <Page title="Calendar">
        <Loader message="Laying out the year…" />
      </Page>
    );
  }

  return (
    <Page
      title="Calendar"
      subtitle="Holidays and events across the institution's year"
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setMonth(startOfMonth(new Date()));
            setSelected(new Date());
          }}
        >
          Today
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous month"
                onClick={() => setMonth((current) => subMonths(current, 1))}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </Button>
              <h2 className="min-w-[152px] text-center text-[17px] font-bold text-ink">
                {format(month, "MMMM yyyy")}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next month"
                onClick={() => setMonth((current) => addMonths(current, 1))}
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <p className="text-[12.5px] text-muted">
              {closedDays > 0
                ? `${closedDays} day${closedDays === 1 ? "" : "s"} closed this month`
                : "No closures this month"}
            </p>
          </div>

          <CardBody className="px-3 pt-0 sm:px-5">
            <MonthGrid
              month={month}
              holidays={holidays}
              events={events}
              selected={selected}
              onSelect={setSelected}
            />
            <CalendarLegend className="pt-4" />
          </CardBody>
        </Card>

        <div className="space-y-5">
          <DayDetail day={selected} holidays={holidays} events={events} />
          <MonthHolidays month={month} holidays={thisMonthsHolidays} />
        </div>
      </div>
    </Page>
  );
}

/** What the clicked square actually holds. */
function DayDetail({
  day,
  holidays,
  events,
}: {
  day: Date | null;
  holidays: CalendarHoliday[];
  events: CalendarEvent[];
}) {
  if (!day) return null;

  const covering = holidaysOn(holidays, day);
  const dayEvents = eventsOn(events, day);
  const isToday = isSameDay(day, new Date());

  return (
    <Card>
      <CardHeader
        title={format(day, "EEEE d MMMM")}
        subtitle={isToday ? "Today" : format(day, "yyyy")}
      />
      <CardBody className="space-y-3 pt-3">
        {covering.map((holiday) => (
          <div key={holiday.id} className="flex items-start gap-2.5">
            {holiday.attendance_required ? (
              <PartyPopper
                className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                aria-hidden
              />
            ) : (
              <CalendarOff
                className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft"
                aria-hidden
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-ink">{holiday.name}</p>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {titleCase(holiday.type)} ·{" "}
                {holiday.attendance_required
                  ? "the register is still taken"
                  : "closed, no register"}
              </p>
              {holiday.description && (
                <p className="mt-1 text-[12.5px] text-ink-soft">
                  {holiday.description}
                </p>
              )}
            </div>
          </div>
        ))}

        {dayEvents.map((event) => (
          <div key={event.id} className="flex items-start gap-2.5">
            <CalendarDays
              className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-ink">{event.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden />
                  {event.all_day
                    ? "All day"
                    : format(parseISO(event.start_at), "h:mm a")}
                </span>
                {event.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" aria-hidden />
                    {event.location}
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}

        {covering.length === 0 && dayEvents.length === 0 && (
          <p className="text-[13px] text-muted">
            A normal working day — nothing on the calendar.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function MonthHolidays({
  month,
  holidays,
}: {
  month: Date;
  holidays: CalendarHoliday[];
}) {
  return (
    <Card>
      <CardHeader
        title="Holidays"
        subtitle={`In and around ${format(month, "MMMM")}`}
      />
      <CardBody className="pt-2">
        {holidays.length === 0 ? (
          <EmptyState
            icon="calendar-days"
            title="No holidays this month"
            description="Every working day counts towards attendance."
          />
        ) : (
          <ul className="space-y-1.5">
            {holidays.map((holiday) => {
              const start = parseISO(holiday.start_date);
              const end = parseISO(holiday.end_date);
              const days = differenceInCalendarDays(end, start) + 1;
              return (
                <li
                  key={holiday.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-field bg-surface-sunken px-3.5 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-bold text-ink">
                      {holiday.name}
                    </span>
                    <span className="block text-[12.5px] text-muted">
                      {days > 1
                        ? `${format(start, "d MMM")} – ${format(end, "d MMM")} · ${days} days`
                        : format(start, "EEEE d MMMM")}
                    </span>
                  </span>
                  {holiday.attendance_required && (
                    <Badge tone="warning">Register taken</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
