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
import { entry } from './helpers/fixtures.js';
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
    milestone: 'no',
    name: 'Marie',
    days_remaining: 0,
    years: 31,
    wedding: '',
    date: '1995-12-24',
    next_date: '2026-12-24',
    summary: 'Marie: today (31 years)',
  });
});

test('wedding anniversaries: their traditional name, in the language of each tradition', () => {
  const [today] = eventsOfDay([WEDDING], TODAY, 7);
  assert.equal(eventData(fakeGladys, today, 'fr').wedding, 'noces de saphir');
  assert.equal(eventData(fakeGladys, today, 'de').wedding, 'Saphirhochzeit');
  assert.equal(eventData(fakeGladys, today, 'es').wedding, 'bodas de hiedra');
  // The US tradition does not name the 16th year.
  assert.equal(eventData(fakeGladys, today, 'en').wedding, '');
  assert.equal(
    eventData(fakeGladys, today, 'fr').summary,
    'Our wedding : aujourd’hui (16 ans, noces de saphir)',
  );
  const silver = entry({ ...WEDDING, year: 2001 });
  assert.equal(
    summaryLine(silver, computeOccurrence(silver, TODAY), 'en'),
    'Our wedding: today (25 years, silver anniversary)',
  );
  // A birthday has no wedding name.
  const [birthday] = eventsOfDay([MARIE], '2026-12-24', 7);
  assert.equal(eventData(fakeGladys, birthday, 'fr').wedding, '');
});

test('round years: a filter value on the three daily triggers', () => {
  const milestone = (values, day) =>
    eventsOfDay([entry(values)], day, 7).map((event) => [
      event.key,
      eventData(fakeGladys, event, 'en').milestone,
    ]);
  assert.deepEqual(milestone({ id: 'a', name: 'A', day: 1, month: 11, year: 1976 }, '2026-11-01'), [
    [TRIGGERS.TODAY, 'yes'],
  ]);
  assert.deepEqual(milestone({ id: 'a', name: 'A', day: 1, month: 11, year: 2008 }, '2026-11-01'), [
    [TRIGGERS.TODAY, 'yes'],
  ]);
  assert.deepEqual(
    milestone({ id: 'a', name: 'A', day: 1, month: 11, year: 2008, kind: 'wedding' }, '2026-11-01'),
    [[TRIGGERS.TODAY, 'no']],
    '18 years is round for a birthday only',
  );
  assert.deepEqual(milestone({ id: 'a', name: 'A', day: 1, month: 11 }, '2026-11-01'), [
    [TRIGGERS.TODAY, 'no'],
  ]);
});

test('every 1,000 days since a date with its year', () => {
  const tom = entry({ id: 'f0f0f0f0', name: 'Tom', day: 1, month: 1, year: 2000 });
  // 1 January 2000 + 10,000 days = 19 May 2027.
  const events = eventsOfDay([tom], '2027-05-19', 7);
  assert.deepEqual(
    events.map((event) => event.key),
    [TRIGGERS.DAYS_MILESTONE],
  );
  assert.deepEqual(eventData(fakeGladys, events[0], 'fr'), {
    anniversary: 'ext:test-integration:anniversary:f0f0f0f0',
    kind: 'birthday',
    name: 'Tom',
    days: 10000,
    date: '2000-01-01',
    summary: 'Tom : 10\u202f000 jours aujourd’hui',
  });
  assert.equal(eventsOfDay([tom], '2027-05-18', 7).length, 0);
  // The day itself is not a milestone, nor a date without its year.
  assert.equal(eventsOfDay([entry({ ...tom, year: 2027 })], '2027-01-01', 7).length, 1);
  assert.equal(eventsOfDay([entry({ ...tom, year: null })], '2027-05-19', 7).length, 0);
  // A one-time date counts too, once passed.
  const move = eventsOfDay([MOVE], '2029-11-25', 7);
  assert.deepEqual(
    move.map((event) => event.key),
    [TRIGGERS.DAYS_MILESTONE],
  );
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
