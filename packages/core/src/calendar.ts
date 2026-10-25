import { Temporal } from "@js-temporal/polyfill";
import {
  decodeCalendar,
  type Calendar,
  type CalendarVersion,
  type Polyday,
  type Slot,
} from "./model.ts";

export const addDays = (date: string, days: number): string =>
  Temporal.PlainDate.from(date).add({ days }).toString();
export const dateAt = (instant: number, timeZone: string): string =>
  Temporal.Instant.fromEpochMilliseconds(instant)
    .toZonedDateTimeISO(timeZone)
    .toPlainDate()
    .toString();
export const weekday = (date: string): number => Temporal.PlainDate.from(date).dayOfWeek;
export const polydayId = (date: string, slotId: string): string => `${date}/${slotId}`;
export const minutes = (time: string): number => {
  const value = Temporal.PlainTime.from(time);
  return value.hour * 60 + value.minute;
};
export const slotDurationMinutes = (slot: Pick<Slot, "start" | "end">): number =>
  (minutes(slot.end) - minutes(slot.start) + 1440) % 1440;

export function localInstant(date: string, time: string, timeZone: string): number {
  const local = Temporal.PlainDate.from(date).toPlainDateTime(Temporal.PlainTime.from(time));
  const earlier = local.toZonedDateTime(timeZone, { disambiguation: "earlier" });
  if (earlier.toPlainDateTime().equals(local)) return earlier.epochMilliseconds;
  const transition = earlier.getTimeZoneTransition("next");
  if (transition) return transition.epochMilliseconds;
  return local.toZonedDateTime(timeZone, { disambiguation: "later" }).epochMilliseconds;
}

export function validateSlots(slots: ReadonlyArray<Slot>): void {
  if (!slots.length) throw new Error("Добавьте хотя бы один полидень.");
  if (slots.length > 24) throw new Error("В расписании может быть не больше 24 полидней.");
  const ids = new Set<string>();
  const occupied = Array.from({ length: 1440 }, () => false);
  for (const slot of slots) {
    if (!slot.name.trim()) throw new Error("Укажите название каждого полидня.");
    if (ids.has(slot.id)) throw new Error("Идентификаторы полидней должны различаться.");
    ids.add(slot.id);
    const start = minutes(slot.start);
    const end = minutes(slot.end);
    if (start === end) throw new Error(`У полидня «${slot.name}» начало совпадает с концом.`);
    const duration = slotDurationMinutes(slot);
    for (let offset = 0; offset < duration; offset++) {
      const minute = (start + offset) % 1440;
      if (occupied[minute])
        throw new Error(`Полидень «${slot.name}» пересекается с другим интервалом.`);
      occupied[minute] = true;
    }
  }
}

export function validateCalendar(calendar: Calendar): Calendar {
  const parsed = decodeCalendar(calendar);
  if (!parsed.versions.length) throw new Error("Расписание ещё не настроено.");
  for (const version of parsed.versions) {
    Temporal.PlainDate.from(version.from);
    localInstant(version.from, "12:00", version.timeZone);
    validateSlots(version.slots);
  }
  return parsed;
}

export function versionForDate(calendar: Calendar, date: string): CalendarVersion | undefined {
  const version = orderedVersions(calendar).find((version) => version.from <= date);
  return version ? withSlotNames(calendar, version) : undefined;
}

const orderedVersions = (calendar: Calendar) =>
  [...calendar.versions].sort(
    (a, b) => b.from.localeCompare(a.from) || (b.activatedAt ?? 0) - (a.activatedAt ?? 0),
  );

// Names identify slots across the calendar; only their interval geometry is dated.
// Reading the latest known names also repairs schedules saved by older clients.
function slotNames(calendar: Calendar): ReadonlyMap<string, string> {
  const names = new Map<string, string>();
  for (const version of orderedVersions(calendar))
    for (const slot of version.slots) if (!names.has(slot.id)) names.set(slot.id, slot.name);
  return names;
}

function withSlotNames(calendar: Calendar, version: CalendarVersion): CalendarVersion {
  const names = slotNames(calendar);
  return {
    ...version,
    slots: version.slots.map((slot) => ({ ...slot, name: names.get(slot.id) ?? slot.name })),
  };
}

export function activeVersion(calendar: Calendar, now: number): CalendarVersion {
  const first = calendar.versions[0];
  if (!first) throw new Error("Расписание ещё не настроено.");
  return withSlotNames(
    calendar,
    orderedVersions(calendar).find(
      (v) => v.from <= dateAt(now, v.timeZone) && (v.activatedAt ?? -Infinity) <= now,
    ) ?? first,
  );
}

export function makePolyday(slot: Slot, date: string, timeZone: string): Polyday {
  const endDate = minutes(slot.end) <= minutes(slot.start) ? addDays(date, 1) : date;
  return {
    id: polydayId(date, slot.id),
    slotId: slot.id,
    date,
    name: slot.name,
    start: localInstant(date, slot.start, timeZone),
    end: localInstant(endDate, slot.end, timeZone),
    startTime: slot.start,
    endTime: slot.end,
    timeZone,
  };
}

export function polydaysOn(calendar: Calendar, date: string): ReadonlyArray<Polyday> {
  const version = versionForDate(calendar, date);
  const names = slotNames(calendar);
  const saved = calendar.frozen
    .filter((p) => p.date === date)
    .map((p) => ({ ...p, name: names.get(p.slotId) ?? p.name }));
  const frozenIds = new Set(saved.map((p) => p.id));
  const generated =
    version?.slots
      .map((slot) => makePolyday(slot, date, version.timeZone))
      .filter((p) => p.end > (version.activatedAt ?? -Infinity)) ?? [];
  return [...saved, ...generated.filter((p) => !frozenIds.has(p.id))].sort(
    (a, b) => a.start - b.start,
  );
}

export function polydaysBetween(
  calendar: Calendar,
  from: string,
  until: string,
): ReadonlyArray<Polyday> {
  const result: Polyday[] = [];
  for (let date = from; date <= until; date = addDays(date, 1))
    result.push(...polydaysOn(calendar, date));
  return result;
}

export function polydayForInstant(
  calendar: Calendar,
  instant: number,
): { polyday: Polyday | null; inSleepGap: boolean } {
  const zone = activeVersion(calendar, instant).timeZone;
  const date = dateAt(instant, zone);
  const nearby = polydaysBetween(calendar, addDays(date, -2), addDays(date, 1));
  const containing = nearby.find((p) => p.start <= instant && instant < p.end);
  if (containing) return { polyday: containing, inSleepGap: false };
  const preceding = nearby.filter((p) => p.end <= instant).sort((a, b) => b.end - a.end)[0];
  return { polyday: preceding ?? null, inSleepGap: true };
}

export function currentPolyday(calendar: Calendar, now: number): Polyday | null {
  const date = dateAt(now, activeVersion(calendar, now).timeZone);
  const candidates = polydaysBetween(calendar, addDays(date, -1), addDays(date, 2));
  return (
    candidates.find((p) => p.start <= now && now < p.end) ??
    candidates.find((p) => p.start > now) ??
    null
  );
}

export function updateCalendar(
  calendar: Calendar,
  version: CalendarVersion,
  now: number,
): Calendar {
  validateSlots(version.slots);
  const earliest =
    [...calendar.versions].sort((a, b) => a.from.localeCompare(b.from))[0]?.from ?? version.from;
  const today = dateAt(now, activeVersion(calendar, now).timeZone);
  if (version.from < today) throw new Error("Новое расписание не должно менять прошлые полидни.");
  const frozen = new Map(calendar.frozen.map((p) => [p.id, p]));
  for (const p of polydaysBetween(calendar, earliest, today)) if (p.end <= now) frozen.set(p.id, p);
  const names = new Map(version.slots.map((slot) => [slot.id, slot.name]));
  return validateCalendar({
    ...calendar,
    versions: [
      ...calendar.versions
        .filter((v) => v.from !== version.from)
        .map((v) => ({
          ...v,
          slots: v.slots.map((slot) => ({ ...slot, name: names.get(slot.id) ?? slot.name })),
        })),
      version,
    ].sort((a, b) => a.from.localeCompare(b.from)),
    frozen: [...frozen.values()],
  });
}

export function changeTimeZone(calendar: Calendar, timeZone: string, now: number): Calendar {
  const current = activeVersion(calendar, now);
  localInstant(dateAt(now, timeZone), "12:00", timeZone);
  if (current.timeZone === timeZone) return calendar;
  const first =
    [...calendar.versions].sort((a, b) => a.from.localeCompare(b.from))[0]?.from ??
    dateAt(now, current.timeZone);
  const today = dateAt(now, current.timeZone);
  const frozen = new Map(calendar.frozen.map((p) => [p.id, p]));
  for (const p of polydaysBetween(calendar, first, addDays(today, 1)))
    if (p.end <= now) frozen.set(p.id, p);
  const localToday = dateAt(now, timeZone);
  const latest = new Map<string, CalendarVersion>();
  for (const version of orderedVersions(calendar))
    if (!latest.has(version.from)) latest.set(version.from, version);
  // Copy each scheduled geometry into the new zone, keeping old versions for
  // historical deadlines. Activation prevents inventing past intervals.
  const changed = [...latest.values()].map((version) => ({
    ...version,
    id: `zone:${now}:${version.id}`,
    timeZone,
    activatedAt: now,
    from:
      version.from === first && version.from > localToday ? addDays(localToday, -1) : version.from,
  }));
  return validateCalendar({
    ...calendar,
    versions: [...calendar.versions, ...changed],
    frozen: [...frozen.values()],
  });
}

export function deadlineInstant(calendar: Calendar, date: string, time: string): number {
  for (const version of orderedVersions(calendar)) {
    if (version.from > date) continue;
    const instant = localInstant(date, time, version.timeZone);
    if (version.activatedAt === undefined || instant >= version.activatedAt) return instant;
  }
  const first = calendar.versions[0];
  if (!first) throw new Error("Сначала настройте расписание.");
  return localInstant(date, time, first.timeZone);
}
