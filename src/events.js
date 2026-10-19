// -----------------------------------------------------------------------------
// Scene triggers and scene action of the Anniversaries integration.
//
// Triggers, fired once a day at the hour of the configuration (never twice
// for the same date and day, see fired.js):
//   - anniversary_today     a date is today;
//   - anniversary_upcoming  a date is in N days (1 to 60): fired every day of
//                           the countdown, the scene picks N with the
//                           "days remaining" filter (equality, as every
//                           filter of Gladys);
//   - anniversary_reminder  a date reaches its own reminder (its "days
//                           before", or the default one of the configuration);
//   - anniversary_days_milestone  a date with its year reaches a multiple of
//                           1,000 days since it happened (10,000 days old).
// Every event carries the date's device external id and kind (the filters),
// and its name, years, days remaining, dates and a summary sentence (the
// variables of the scene). The first three also carry `milestone` ("yes" for
// round years, see isRoundYears: a filter) and `wedding` (the traditional
// name of a wedding anniversary, in the language of the integration).
//
// Action get_upcoming: the dates of the next N days, as a summary to send in
// a message, with the nearest one in separate outputs.
// -----------------------------------------------------------------------------

import { t, formatDay, yearsText, formatNumber } from './i18n.js';
import { computeOccurrence, toIso, isRoundYears, daysSinceOrigin } from './dates.js';
import { idsOf } from './device.js';
import { weddingName } from './weddings.js';

const TRIGGERS = {
  TODAY: 'anniversary_today',
  UPCOMING: 'anniversary_upcoming',
  REMINDER: 'anniversary_reminder',
  DAYS_MILESTONE: 'anniversary_days_milestone',
};
// Every 1,000 days since the original date.
const DAYS_MILESTONE_STEP = 1000;
const SCENE_ACTIONS = { GET_UPCOMING: 'get_upcoming' };
const MAX_UPCOMING_DAYS = 60;
const UPCOMING_DAYS = { min: 0, max: 366, default: 7 };

/**
 * @description Every date with where it stands today, nearest first (passed
 * one-time dates last).
 * @param {object[]} entries - The dates.
 * @param {string} today - YYYY-MM-DD.
 * @returns {Array<{ entry: object, occurrence: object }>} The dates.
 */
function snapshot(entries, today) {
  return entries
    .map((entry) => ({ entry, occurrence: computeOccurrence(entry, today) }))
    .sort((a, b) => {
      const rank = (item) =>
        item.occurrence.passed
          ? 100000 - item.occurrence.daysRemaining
          : item.occurrence.daysRemaining;
      return rank(a) - rank(b) || a.entry.name.localeCompare(b.entry.name);
    });
}

/**
 * @description The years reached on the next occurrence, as text, or ''.
 * @param {object} entry - The date.
 * @param {object} occurrence - Its occurrence.
 * @param {string} language - The language.
 * @returns {string} "31 years" or ''.
 */
function yearsOf(entry, occurrence, language) {
  return entry.recurrence === 'yearly' && occurrence.yearsNext !== null && occurrence.yearsNext > 0
    ? yearsText(occurrence.yearsNext, language)
    : '';
}

/**
 * @description The traditional name of the next occurrence of a wedding
 * anniversary, or ''.
 * @param {object} entry - The date.
 * @param {object} occurrence - Its occurrence.
 * @param {string} language - The language.
 * @returns {string} "noces de porcelaine" or ''.
 */
const weddingOf = (entry, occurrence, language) =>
  entry.kind === 'wedding' && entry.recurrence === 'yearly'
    ? weddingName(occurrence.yearsNext, language)
    : '';

/**
 * @description One sentence for a date: "Marie: in 7 days, Thursday,
 * December 24, 2026 (31 years)", with the name of a wedding anniversary
 * ("(20 years, china anniversary)").
 * @param {object} entry - The date.
 * @param {object} occurrence - Its occurrence.
 * @param {string} language - The language.
 * @returns {string} The sentence.
 */
function summaryLine(entry, occurrence, language) {
  const years = [yearsOf(entry, occurrence, language), weddingOf(entry, occurrence, language)]
    .filter(Boolean)
    .join(', ');
  const values = {
    name: entry.name,
    n: occurrence.daysRemaining,
    date: formatDay(occurrence.next, language),
    years: years ? t('summaryYears', language, { years }) : '',
  };
  if (occurrence.daysRemaining === 0) return t('summaryToday', language, values);
  if (occurrence.daysRemaining === 1) return t('summaryTomorrow', language, values);
  return t('summaryIn', language, values);
}

/**
 * @description The scene events of a day.
 * @param {object[]} entries - The dates.
 * @param {string} today - YYYY-MM-DD.
 * @param {number} defaultReminder - Reminder of the dates without their own.
 * @returns {Array<{ id: string, key: string, entry: object, occurrence: object,
 *   today: string }>} The events.
 */
function eventsOfDay(entries, today, defaultReminder) {
  const events = [];
  for (const { entry, occurrence } of snapshot(entries, today)) {
    const days = occurrence.daysRemaining;
    const push = (key) => events.push({ id: `${entry.id}:${key}`, key, entry, occurrence, today });
    if (days === 0) {
      push(TRIGGERS.TODAY);
    }
    if (days >= 1 && days <= MAX_UPCOMING_DAYS) {
      push(TRIGGERS.UPCOMING);
    }
    const reminder = entry.reminder ?? defaultReminder;
    if (reminder >= 1 && days === reminder) {
      push(TRIGGERS.REMINDER);
    }
    const elapsed = daysSinceOrigin(entry, today);
    if (elapsed !== null && elapsed > 0 && elapsed % DAYS_MILESTONE_STEP === 0) {
      push(TRIGGERS.DAYS_MILESTONE);
    }
  }
  return events;
}

/**
 * @description The data of a scene event (flat, scalars only).
 * @param {object} gladys - The GladysIntegration instance.
 * @param {object} event - From eventsOfDay.
 * @param {string} language - Language of the summary.
 * @returns {object} The data.
 */
function eventData(gladys, { key, entry, occurrence, today }, language) {
  const anniversary = idsOf(gladys, entry.id).device;
  if (key === TRIGGERS.DAYS_MILESTONE) {
    const days = daysSinceOrigin(entry, today);
    return {
      anniversary,
      kind: entry.kind,
      name: entry.name,
      days,
      date: toIso(entry),
      summary: t('summaryDaysMilestone', language, {
        name: entry.name,
        n: formatNumber(days, language),
      }).slice(0, 1000),
    };
  }
  const years = entry.recurrence === 'yearly' ? occurrence.yearsNext : null;
  return {
    anniversary,
    kind: entry.kind,
    milestone: isRoundYears(years, entry.kind) ? 'yes' : 'no',
    name: entry.name,
    days_remaining: occurrence.daysRemaining,
    years,
    wedding: weddingOf(entry, occurrence, language),
    date: toIso(entry),
    next_date: occurrence.next,
    summary: summaryLine(entry, occurrence, language).slice(0, 1000),
  };
}

/**
 * @description The outputs of the get_upcoming scene action.
 * @param {object[]} entries - The dates.
 * @param {string} today - YYYY-MM-DD.
 * @param {object} fields - `{ days, kind }` (kind: an array of kinds, empty = all).
 * @param {string} language - Language of the summary.
 * @returns {object} `{ count, summary, next_name?, next_days?, next_date? }`.
 */
function upcomingOutputs(entries, today, fields, language) {
  const raw = Number(fields?.days);
  const days =
    fields?.days === '' ||
    fields?.days === null ||
    fields?.days === undefined ||
    !Number.isFinite(raw)
      ? UPCOMING_DAYS.default
      : Math.min(UPCOMING_DAYS.max, Math.max(UPCOMING_DAYS.min, Math.round(raw)));
  const kinds = [].concat(fields?.kind ?? []).filter(Boolean);
  const listed = snapshot(entries, today).filter(
    ({ entry, occurrence }) =>
      !occurrence.passed &&
      occurrence.daysRemaining <= days &&
      (kinds.length === 0 || kinds.includes(entry.kind)),
  );
  if (listed.length === 0) {
    return {
      count: 0,
      summary:
        days === 0 ? t('summaryNoneToday', language) : t('summaryNone', language, { n: days }),
    };
  }
  const [first] = listed;
  return {
    count: listed.length,
    summary: listed
      .map(({ entry, occurrence }) => summaryLine(entry, occurrence, language))
      .join('\n')
      .slice(0, 10000),
    next_name: first.entry.name,
    next_days: first.occurrence.daysRemaining,
    next_date: first.occurrence.next,
  };
}

export {
  TRIGGERS,
  SCENE_ACTIONS,
  DAYS_MILESTONE_STEP,
  MAX_UPCOMING_DAYS,
  UPCOMING_DAYS,
  snapshot,
  yearsOf,
  weddingOf,
  summaryLine,
  eventsOfDay,
  eventData,
  upcomingOutputs,
};
