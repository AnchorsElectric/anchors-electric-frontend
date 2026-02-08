/**
 * Format a date-only value (e.g. DOB) for display without timezone shifting the day.
 * Use this when the value represents a calendar date (YYYY-MM-DD), not a moment in time.
 */
export function formatDateOnly(isoOrDateString: string | null | undefined): string {
  if (isoOrDateString == null) return 'N/A';
  const s = typeof isoOrDateString === 'string' ? isoOrDateString.slice(0, 10) : '';
  if (s.length < 10 || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'N/A';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString();
}
