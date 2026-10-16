// The calendar arithmetic, against the semantics of the Home Assistant
// Anniversaries integration (years at the next occurrence, current years,
// count up, half anniversary, one-time dates) and the calendar traps (29
// February, the end of the year, short months).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeOccurrence, daysInMonth, toIso, addDays } from '../src/dates.js';
import { entry } from './helpers/fixtures.js';

const birthday = entry({ day: 24, month: 12, year: 1995 });

test('a yearly date with its year: days left, years at the next occurrence and so far', () => {
  const o = computeOccurrence(birthday, '2026-10-16');
  assert.equal(o.next, '2026-12-24');
  assert.equal(o.daysRemaining, 69);
  assert.equal(o.yearsNext, 31);
  assert.equal(o.yearsCurrent, 30);
  assert.equal(o.isToday, false);
  assert.equal(o.passed, false);
});

test('on the day: 0 days left, the years reached today', () => {
  const o = computeOccurrence(birthday, '2026-12-24');
  assert.deepEqual([o.daysRemaining, o.isToday, o.yearsNext, o.yearsCurrent], [0, true, 31, 31]);
  assert.equal(o.daysSince, 0);
});

test('the day after: next year, 364 days left (2027 is not a leap year)', () => {
  const o = computeOccurrence(birthday, '2026-12-25');
  assert.equal(o.next, '2027-12-24');
  assert.equal(o.daysRemaining, 364);
  assert.deepEqual([o.yearsNext, o.yearsCurrent, o.daysSince], [32, 31, 1]);
});

test('without a year: no years, the same countdown', () => {
  const o = computeOccurrence({ ...birthday, year: null }, '2026-10-16');
  assert.deepEqual(
    [o.next, o.daysRemaining, o.yearsNext, o.yearsCurrent],
    ['2026-12-24', 69, null, null],
  );
});

test('29 February falls on 28 February in the other years, on 29 in leap years', () => {
  const leap = entry({ day: 29, month: 2, year: 2000 });
  assert.equal(computeOccurrence(leap, '2026-02-01').next, '2026-02-28');
  assert.equal(computeOccurrence(leap, '2027-03-01').next, '2028-02-29');
  const o = computeOccurrence(leap, '2026-02-28');
  assert.deepEqual([o.isToday, o.yearsNext], [true, 26]);
  assert.equal(computeOccurrence({ ...leap, year: null }, '2026-03-01').next, '2027-02-28');
});

test('a yearly date whose first occurrence is still to come counts down to it', () => {
  const o = computeOccurrence(entry({ day: 1, month: 3, year: 2030 }), '2026-10-16');
  assert.equal(o.next, '2030-03-01');
  assert.deepEqual([o.yearsNext, o.yearsCurrent], [0, null]);
  assert.ok(o.daysSince < 0);
});

test('a one-time date: countdown, then negative days once passed, as in Home Assistant', () => {
  const once = entry({ day: 1, month: 3, year: 2027, recurrence: 'once' });
  const before = computeOccurrence(once, '2026-10-16');
  assert.deepEqual([before.next, before.daysRemaining, before.passed], ['2027-03-01', 136, false]);
  assert.equal(before.yearsNext, null);
  const after = computeOccurrence(once, '2027-03-11');
  assert.deepEqual([after.daysRemaining, after.daysSince, after.passed], [-10, 10, true]);
  assert.equal(after.halfNext, null);
});

test('count up: days since the last occurrence of a yearly date', () => {
  assert.equal(computeOccurrence(birthday, '2027-01-03').daysSince, 10);
});

test('half anniversary: six months later, clamped to the end of a short month', () => {
  const o = computeOccurrence(birthday, '2026-10-16');
  assert.deepEqual([o.halfNext, o.halfDaysRemaining], ['2027-06-24', 251]);
  const august = entry({ day: 31, month: 8, year: 2026 });
  assert.equal(computeOccurrence(august, '2026-09-01').halfNext, '2027-02-28');
  // The first half anniversary of a baby born in May comes in November.
  const baby = entry({ day: 10, month: 5, year: 2026 });
  assert.equal(computeOccurrence(baby, '2026-06-01').halfNext, '2026-11-10');
});

test('helpers: days in a month, ISO texts, day arithmetic', () => {
  assert.equal(daysInMonth(null, 2), 29);
  assert.equal(daysInMonth(1900, 2), 28);
  assert.equal(daysInMonth(2000, 2), 29);
  assert.equal(daysInMonth(2026, 4), 30);
  assert.equal(toIso({ year: null, month: 3, day: 7 }), '--03-07');
  assert.equal(toIso({ year: 1564, month: 4, day: 23 }), '1564-04-23');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});
