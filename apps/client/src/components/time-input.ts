/** Accept clock time with or without a separator, including whole hours. */
export function normalizeTimeInput(input: string): string | null {
  const value = input.trim();
  const separated = /^(\d{1,2})[:.](\d{2})$/.exec(value);
  let hours: string;
  let minutes: string;
  if (separated) {
    hours = separated[1]!;
    minutes = separated[2]!;
  } else if (/^\d{1,4}$/.test(value)) {
    hours = value.length <= 2 ? value : value.slice(0, -2);
    minutes = value.length <= 2 ? "00" : value.slice(-2);
  } else {
    return null;
  }
  if (Number(hours) > 23 || Number(minutes) > 59) return null;
  return `${hours.padStart(2, "0")}:${minutes}`;
}
