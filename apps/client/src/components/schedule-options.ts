import timeZones from "./time-zones.json";

const cities: Readonly<Record<string, string>> = {
  "Asia/Tbilisi": "Тбилиси",
  "Asia/Yerevan": "Ереван",
  "Asia/Baku": "Баку",
  "Asia/Dubai": "Дубай",
  "Asia/Almaty": "Алматы",
  "Asia/Tashkent": "Ташкент",
  "Asia/Bangkok": "Бангкок",
  "Asia/Tokyo": "Токио",
  "Asia/Shanghai": "Шанхай",
  "Asia/Yekaterinburg": "Екатеринбург",
  "Asia/Novosibirsk": "Новосибирск",
  "Asia/Vladivostok": "Владивосток",
  "Europe/Moscow": "Москва",
  "Europe/Kyiv": "Киев",
  "Europe/Kiev": "Киев",
  "Europe/Minsk": "Минск",
  "Europe/Berlin": "Берлин",
  "Europe/Paris": "Париж",
  "Europe/London": "Лондон",
  "Europe/Istanbul": "Стамбул",
  "Europe/Lisbon": "Лиссабон",
  "America/New_York": "Нью-Йорк",
  "America/Los_Angeles": "Лос-Анджелес",
  "America/Chicago": "Чикаго",
  "Australia/Sydney": "Сидней",
  UTC: "Всемирное время",
};

export const timeZoneCity = (zone: string): string =>
  cities[zone] ?? zone.split("/").at(-1)!.replaceAll("_", " ");

export function timeZoneOffset(zone: string, now: number): string {
  // Avoid shortOffset and supportedValuesOf, which are unavailable in some native engines.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)!.value);
  const local = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour") % 24,
    part("minute"),
  );
  const offset = Math.round((local - Math.floor(now / 60_000) * 60_000) / 60_000);
  if (offset === 0) return "UTC";
  const absolute = Math.abs(offset);
  const minutes = absolute % 60;
  return `UTC${offset > 0 ? "+" : "−"}${Math.floor(absolute / 60)}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

export const timeZoneLabel = (zone: string, now: number): string =>
  `${timeZoneCity(zone)} · ${timeZoneOffset(zone, now)}`;

export function timeZoneChoices(current: string, local: string): string[] {
  // The bundled ICU identifiers keep the full picker available on native platforms.
  return [...new Set([current, local, "UTC", ...timeZones])]
    .filter((zone) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: zone });
        return true;
      } catch {
        return false;
      }
    })
    .sort((a, b) => timeZoneCity(a).localeCompare(timeZoneCity(b), "ru"));
}

export function calendarDateLabel(date: string, today: string): string {
  const label = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    ...(date.slice(0, 4) !== today.slice(0, 4) ? { year: "numeric" } : {}),
  }).format(new Date(`${date}T12:00:00Z`));
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (date === today) return `Сегодня, ${label}`;
  if (date === tomorrow.toISOString().slice(0, 10)) return `Завтра, ${label}`;
  return label;
}

export function shiftMonth(month: string, offset: number): string {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export function calendarDays(month: string): string[] {
  const first = new Date(`${month}-01T12:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
    const date = new Date(first);
    date.setUTCDate(index - offset + 1);
    return date.toISOString().slice(0, 10);
  });
}
