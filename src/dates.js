// -----------------------------------------------------------------------------
// Calendar arithmetic of the anniversaries (pure functions, no clock).
//
// A date is { day, month, year|null, recurrence, ... }: a yearly date
// (birthday, wedding) with or without its year, or a one-time date (an event,
// a deadline) that needs its year. Same semantics as the Home Assistant
// Anniversaries integration (pinkywafer/Anniversaries, MIT), rewritten:
//   - 29 February falls on 28 February in the other years;
//   - the years are those reached on the next occurrence ("turns 31") and
//     those reached so far ("is 30"), only when the year is known;
//   - "count up" gives the days since the last occurrence (yearly) or since
//     the date (one time, negative before it);
//   - the half anniversary is six months after the date, every year.
// Days are calendar days: a YYYY-MM-DD "today" in the timezone of Gladys is
// the only input, so the whole module is timezone-free.
// -----------------------------------------------------------------------------

const MS_PER_DAY = 86400000;
const KINDS = ['birthday', 'wedding', 'anniversary', 'memorial', 'event', 'other'];
const RECURRENCES = ['yearly', 'once'];
const YEAR = { min: 1000, max: 2999 };
const NAME_MAX = 60;

const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/**
 * @description Days in a month; February has 29 days when the year is unknown.
 * @param {number|null} year - The year, or null.
 * @param {number} month - 1-12.
 * @returns {number} The number of days.
 * @example
 * daysInMonth(null, 2); // -> 29
 */
function daysInMonth(year, month) {
  if (month === 2) {
    return year === null || isLeap(year) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/**
 * @description Day number (days since 1970-01-01) of a calendar date.
 * @param {{ year: number, month: number, day: number }} date - The date.
 * @returns {number} The day number.
 */
const dayNumber = ({ year, month, day }) => Date.UTC(year, month - 1, day) / MS_PER_DAY;

/**
 * @description A calendar date from a day number.
 * @param {number} number - The day number.
 * @returns {{ year: number, month: number, day: number }} The date.
 */
function fromDayNumber(number) {
  const date = new Date(number * MS_PER_DAY);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/**
 * @description Read a YYYY-MM-DD day.
 * @param {string} iso - The day.
 * @returns {{ year: number, month: number, day: number }} The date.
 * @example
 * parseDay('2026-10-16'); // -> { year: 2026, month: 10, day: 16 }
 */
function parseDay(iso) {
  const [year, month, day] = String(iso).split('-').map(Number);
  return { year, month, day };
}

/**
 * @description Write a date as YYYY-MM-DD (or --MM-DD without a year).
 * @param {{ year: number|null, month: number, day: number }} date - The date.
 * @returns {string} The ISO text.
 * @example
 * toIso({ year: 1995, month: 12, day: 24 }); // -> '1995-12-24'
 */
function toIso({ year, month, day }) {
  const md = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return year === null || year === undefined ? `--${md}` : `${String(year).padStart(4, '0')}-${md}`;
}

/**
 * @description The occurrence of a day and month in a year (29 February on
 * 28 February in the other years, 31st on the last day of a short month).
 * @param {number} year - The year.
 * @param {number} month - 1-12.
 * @param {number} day - 1-31.
 * @returns {{ year: number, month: number, day: number }} The date.
 */
const occurrenceIn = (year, month, day) => ({
  year,
  month,
  day: Math.min(day, daysInMonth(year, month)),
});

/**
 * @description The next yearly occurrence of a day and month, on or after
 * a day and on or after a first possible day.
 * @param {number} month - 1-12.
 * @param {number} day - 1-31.
 * @param {number} from - Day number of today.
 * @param {number|null} first - Day number of the first occurrence, or null.
 * @returns {{ year: number, month: number, day: number }} The occurrence.
 */
function nextYearly(month, day, from, first) {
  const bound = first === null ? from : Math.max(from, first);
  const { year } = fromDayNumber(bound);
  for (let candidate = year - 1; candidate <= year + 1; candidate += 1) {
    const occurrence = occurrenceIn(candidate, month, day);
    if (dayNumber(occurrence) >= bound) {
      return occurrence;
    }
  }
  return occurrenceIn(year + 2, month, day);
}

/**
 * @description Where a date stands on a day.
 * @param {object} entry - The date (registry entry).
 * @param {string} today - Today, YYYY-MM-DD in the timezone of Gladys.
 * @returns {{ next: string, daysRemaining: number, isToday: boolean,
 *   passed: boolean, yearsNext: number|null, yearsCurrent: number|null,
 *   daysSince: number|null, halfNext: string|null,
 *   halfDaysRemaining: number|null }} The occurrence.
 * @example
 * computeOccurrence({ day: 24, month: 12, year: 1995, recurrence: 'yearly' }, '2026-10-16');
 */
function computeOccurrence(entry, today) {
  const now = dayNumber(parseDay(today));
  const { day, month } = entry;
  const year = entry.year ?? null;
  const original = year === null ? null : { year, month, day };
  const result = {
    yearsNext: null,
    yearsCurrent: null,
    daysSince: null,
    halfNext: null,
    halfDaysRemaining: null,
  };

  if (entry.recurrence === 'once') {
    const remaining = dayNumber(original) - now;
    return {
      ...result,
      next: toIso(original),
      daysRemaining: remaining,
      isToday: remaining === 0,
      passed: remaining < 0,
      daysSince: -remaining,
    };
  }

  const first = original === null ? null : dayNumber(original);
  const next = nextYearly(month, day, now, first);
  const remaining = dayNumber(next) - now;
  const isToday = remaining === 0;
  let last = isToday ? next : occurrenceIn(next.year - 1, month, day);
  if (first !== null && dayNumber(last) < first) {
    last = null;
  }
  if (year !== null) {
    result.yearsNext = next.year - year;
    result.yearsCurrent = last === null ? null : last.year - year;
  }
  result.daysSince = last === null ? (first === null ? null : now - first) : now - dayNumber(last);

  // Half anniversary: six months later, every year, from the first one on.
  const halfMonth = ((month + 5) % 12) + 1;
  const firstHalf =
    year === null ? null : dayNumber(occurrenceIn(year + (month > 6 ? 1 : 0), halfMonth, day));
  const half = nextYearly(halfMonth, day, now, firstHalf);
  result.halfNext = toIso(half);
  result.halfDaysRemaining = dayNumber(half) - now;

  return { ...result, next: toIso(next), daysRemaining: remaining, isToday, passed: false };
}

/**
 * @description Add days to a YYYY-MM-DD day.
 * @param {string} iso - The day.
 * @param {number} days - Days to add.
 * @returns {string} The day.
 * @example
 * addDays('2026-12-31', 1); // -> '2027-01-01'
 */
const addDays = (iso, days) => toIso(fromDayNumber(dayNumber(parseDay(iso)) + days));

export {
  KINDS,
  RECURRENCES,
  YEAR,
  NAME_MAX,
  isLeap,
  daysInMonth,
  parseDay,
  toIso,
  computeOccurrence,
  addDays,
};
