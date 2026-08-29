// day ("YYYY-MM-DD") + time ("HH:mm") -> an absolute instant in the server's timezone.
// Returns null when the calendar date does not exist -- JS would otherwise roll 2026-02-31 over to Mar 3.
export function parseSendAt(day: string, time: string): Date | null {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);

  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}
