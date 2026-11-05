/**
 * Timezone helpers for Asia/Kolkata (IST: UTC +05:30)
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns the current date in Asia/Kolkata formatted as YYYY-MM-DD
 */
export function getKolkataDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // outputs "YYYY-MM-DD"
}

/**
 * Returns current time in Asia/Kolkata formatted as HH:mm:ss
 */
export function getKolkataTimeString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(date);
}

/**
 * Returns a human-friendly format for display e.g. "05 Nov 2026, 11:30 PM"
 */
export function formatKolkataDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Returns human-friendly date e.g. "05 Nov 2026"
 */
export function formatKolkataDateOnly(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  // If dateString is in "YYYY-MM-DD" format
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }
  return dateString;
}

/**
 * Get current ISO string
 */
export function getKolkataISOString(): string {
  return new Date().toISOString();
}

