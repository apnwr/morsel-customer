/**
 * Menu availability utilities
 *
 * Checks whether a menu is currently available based on its
 * availability window (days + startTime/endTime) and the
 * active timezone from LocaleContext.
 */

import type { MenuAvailability } from '@/types/api/menu';

const DAY_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

/**
 * Normalize the raw `availability` field into a single object or null.
 * Handles both object and single-element array formats.
 * Returns null when the menu is always available.
 */
export function normalizeAvailability(
  raw: MenuAvailability | MenuAvailability[] | undefined | null,
): MenuAvailability | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.length > 0 ? raw[0] : null;
  return raw;
}

/**
 * Normalize `days` into a lowercase string array.
 * `"all"` expands to all 7 days; a missing/empty value means always available.
 */
function normalizeDays(days: string[] | string | undefined): string[] {
  if (!days) return [];
  if (typeof days === 'string') {
    return days.toLowerCase() === 'all' ? [...DAY_ORDER] : [days.toLowerCase()];
  }
  return days.map((d) => d.toLowerCase());
}

// ---------------------------------------------------------------------------
// Time helpers (Intl-based, no external deps)
// ---------------------------------------------------------------------------

function getCurrentDayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: timezone })
    .format(new Date())
    .toLowerCase();
}

function getCurrentMinutes(timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).formatToParts(new Date());

  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  return h * 60 + m;
}

/** Parse "HH:mm" into minutes-since-midnight. Returns -1 on invalid input. */
function parseTime(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time?.trim());
  if (!match) return -1;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

/** Format "HH:mm" → "9:00 AM" */
export function formatTimeForDisplay(time24: string): string {
  const mins = parseTime(time24);
  if (mins < 0) return time24; // fallback: return as-is
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Core check
// ---------------------------------------------------------------------------

export function isMenuCurrentlyAvailable(
  availability: MenuAvailability | MenuAvailability[] | undefined | null,
  timezone: string,
): boolean {
  const av = normalizeAvailability(availability);
  if (!av) return true; // no restrictions

  const start = parseTime(av.startTime);
  const end = parseTime(av.endTime);
  if (start < 0 || end < 0) return true; // invalid time format → always available

  const days = normalizeDays(av.days);
  // Empty days after normalization → no day restriction (time-only)
  if (days.length > 0) {
    const today = getCurrentDayInTimezone(timezone);
    if (!days.includes(today)) return false;
  }

  const now = getCurrentMinutes(timezone);

  if (start <= end) {
    // Normal range: e.g. 09:00–21:00
    return now >= start && now < end;
  }
  // Overnight range: e.g. 22:00–02:00
  return now >= start || now < end;
}

// ---------------------------------------------------------------------------
// "Next available" computation
// ---------------------------------------------------------------------------

export interface NextAvailableSlot {
  time: string; // display string e.g. "9:00 AM"
  day: string;  // capitalized e.g. "Thursday"
}

export function getNextAvailableSlot(
  availability: MenuAvailability | MenuAvailability[] | undefined | null,
  timezone: string,
): NextAvailableSlot | null {
  const av = normalizeAvailability(availability);
  if (!av) return null;

  const start = parseTime(av.startTime);
  const end = parseTime(av.endTime);
  if (start < 0 || end < 0) return null;

  const days = normalizeDays(av.days);
  const today = getCurrentDayInTimezone(timezone);
  const now = getCurrentMinutes(timezone);
  const todayIdx = DAY_ORDER.indexOf(today as typeof DAY_ORDER[number]);

  if (days.length === 0) {
    // Time-only restriction — next slot is today or tomorrow at startTime
    if (now < start) {
      return { time: formatTimeForDisplay(av.startTime), day: capitalize(today) };
    }
    const tomorrow = DAY_ORDER[(todayIdx + 1) % 7];
    return { time: formatTimeForDisplay(av.startTime), day: capitalize(tomorrow) };
  }

  // Today is a valid day and we're before the window opens
  if (days.includes(today) && now < start) {
    return { time: formatTimeForDisplay(av.startTime), day: capitalize(today) };
  }

  // Find the next available day (search up to 7 days ahead)
  for (let i = 1; i <= 7; i++) {
    const candidate = DAY_ORDER[(todayIdx + i) % 7];
    if (days.includes(candidate)) {
      return { time: formatTimeForDisplay(av.startTime), day: capitalize(candidate) };
    }
  }

  // Fallback
  return { time: formatTimeForDisplay(av.startTime), day: capitalize(days[0]) };
}

/**
 * Build a human-readable unavailability message.
 */
export function getUnavailableMessage(
  availability: MenuAvailability | MenuAvailability[] | undefined | null,
  timezone: string,
): string | null {
  if (isMenuCurrentlyAvailable(availability, timezone)) return null;

  const slot = getNextAvailableSlot(availability, timezone);
  if (!slot) return null;

  return `Next available at ${slot.time} on ${slot.day}`;
}
