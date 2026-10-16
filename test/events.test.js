// Scene events of a day and the get_upcoming outputs: which dates fire which
// trigger, and the payload limits of the host API (flat, 30 keys at most,
// scalars, strings up to 1,000 characters).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  eventsOfDay,
  eventData,
  upcomingOutputs,
  summaryLine,
  snapshot,
  TRIGGERS,
  MAX_UPCOMING_DAYS,
} from '../src/events.js';
import { computeOccurrence } from '../src/dates.js';
import { LANGUAGES } from '../src/i18n.js';
import { fakeGladys, DATES, MARIE, WEDDING, GRANDPA, MOVE, TODAY } from './helpers/fixtures.js';

const fired = (day, reminder = 7) =>
  eventsOfDay(DATES, day, reminder).map((event) => `${event.entry.name}:${event.key}`);

test('today, in N days (1 to 60) and the reminder of each date', () => {
  assert.deepEqual(fired(TODAY), [
    `${WEDDING.name}:${TRIGGERS.TODAY}`,
    `${GRANDPA.name}:${TRIGGERS.UPCOMING}`,
    `${GRANDPA.name}:${TRIGGERS.REMINDER}`,
  ]);
  // 60 days before Marie's birthday, still "in N days"; 61, not yet.
  assert.ok(fired('2026-10-25').includes(`Marie:${TRIGGERS.UPCOMING}`));
  assert.ok(!fired('2026-10-24').includes(`Marie:${TRIGGERS.UPCOMING}`));
  assert.equal(MAX_UPCOMING_DAYS, 60);
  // The default reminder (7 days) for Marie, her own would win.
  assert.ok(fired('2026-12-17').includes(`Marie:${TRIGGERS.REMINDER}`));
  assert.ok(!fired('2026-12-17', 0).includes(`Marie:${TRIGGERS.REMINDER}`));
  // A passed one-time date fires nothing.
  assert.deepEqual(
    fired('2027-03-02').filter((id) => id.startsWith(MOVE.name)),
    [],
  );
});

test('event data: flat scalars the scene can filter on and use', () => {
  for (const language of LANGUAGES) {
    for (const event of eventsOfDay(DATES, '2026-12-24', 7)) {
      const data = eventData(fakeGladys, event, language);
      assert.ok(Object.keys(data).length <= 30);
      for (const [key, value] of Object.entries(data)) {
        assert.ok(
          value === null ||
            typeof value === 'boolean' ||
            (typeof value === 'number' && Number.isFinite(value)) ||
            (typeof value === 'string' && value.length <= 1000),
          `${key}: ${value}`,
        );
      }
    }
  }
  const [today] = eventsOfDay([MARIE], '2026-12-24', 7);
  assert.deepEqual(eventData(fakeGladys, today, 'en'), {
    anniversary: 'ext:test-integration:anniversary:a1b2c3d4',
    kind: 'birthday',
    name: 'Marie',
    days_remaining: 0,
    years: 31,
    date: '1995-12-24',
    next_date: '2026-12-24',
    summary: 'Marie: today (31 years)',
  });
});

test('summaries in the four languages', () => {
  const o = computeOccurrence(MARIE, TODAY);
  assert.equal(
    summaryLine(MARIE, o, 'fr'),
    'Marie : dans 69 jours, jeudi 24 décembre 2026 (31 ans)',
  );
  assert.equal(
    summaryLine(MARIE, o, 'de'),
    'Marie: in 69 Tagen, Donnerstag, 24. Dezember 2026 (31 Jahre)',
  );
  assert.equal(
    summaryLine(GRANDPA, computeOccurrence(GRANDPA, '2026-10-22'), 'es'),
    'Grandpa: mañana, viernes, 23 de octubre de 2026',
  );
});

test('get_upcoming: count, one line per date, the nearest one apart', () => {
  const out = upcomingOutputs(DATES, TODAY, { days: 7 }, 'en');
  assert.equal(out.count, 2);
  assert.deepEqual(out.summary.split('\n'), [
    'Our wedding: today (16 years)',
    'Grandpa: in 7 days, Friday, October 23, 2026',
  ]);
  assert.deepEqual([out.next_name, out.next_days, out.next_date], ['Our wedding', 0, '2026-10-16']);
  assert.deepEqual(upcomingOutputs(DATES, TODAY, { days: 7, kind: ['birthday'] }, 'en').count, 1);
  assert.deepEqual(upcomingOutputs(DATES, '2026-10-17', { days: 0 }, 'fr'), {
    count: 0,
    summary: 'Aucune date aujourd’hui.',
  });
  assert.equal(upcomingOutputs(DATES, TODAY, {}, 'en').count, 2, 'default: 7 days');
  for (const value of Object.values(upcomingOutputs(DATES, TODAY, { days: 366 }, 'en'))) {
    assert.ok(['number', 'string'].includes(typeof value));
  }
});

test('the nearest dates first, passed one-time dates last', () => {
  const order = snapshot(DATES, '2027-03-05').map(({ entry }) => entry.name);
  assert.equal(order.at(-1), MOVE.name);
});
