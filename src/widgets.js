// -----------------------------------------------------------------------------
// Dashboard widgets of the Anniversaries integration.
//
//   - `upcoming`   the next dates, as a list: name and years, the day (a
//                  calendar date the front shows in the user's language,
//                  never shifted by the timezone), a badge ("Today", "In 3
//                  days") and a detail panel; settings: how many, within how
//                  many days, which kinds;
//   - `countdown`  one date, chosen among the created devices: days left,
//                  years reached, days elapsed, original date, half
//                  anniversary and reminder.
//
// The contents change once a day: they are cached until the next midnight of
// the Gladys timezone (one hour at most), and refreshed at midnight and on
// every change of the dates. Every text exists in the four languages (the
// content is cached per language). Content budget of a card: 8 components,
// 1 main one, 6 tiles, 2 texts, 1 status, 4 buttons.
// -----------------------------------------------------------------------------

import { t, formatDay, relativeDays, relativeInline } from './i18n.js';
import { toIso } from './dates.js';
import { snapshot, yearsOf } from './events.js';

const WIDGETS = { UPCOMING: 'upcoming', COUNTDOWN: 'countdown' };
const COUNT = { min: 1, max: 8, default: 5 };
const WITHIN = { min: 1, max: 366, default: 366 };
const TTL = { min: 10, max: 3600 };

/**
 * @description Truncate a text to a bound, with an ellipsis.
 * @param {string} value - The text.
 * @param {number} max - The bound.
 * @returns {string} The text.
 */
function clip(value, max) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * @description A bounded whole number of a widget setting.
 * @param {unknown} raw - The value.
 * @param {{ min: number, max: number, default: number }} bounds - The bounds.
 * @returns {number} The value.
 */
function setting(raw, bounds) {
  const value = Number(raw);
  if (raw === '' || raw === null || raw === undefined || !Number.isFinite(value)) {
    return bounds.default;
  }
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(value)));
}

/**
 * @description The cache duration of a content: until the next midnight (a
 * few seconds after), one hour at most.
 * @param {number} secondsToMidnight - Seconds until the next local midnight.
 * @returns {number} The ttl in seconds.
 */
const ttlUntil = (secondsToMidnight) =>
  Math.min(TTL.max, Math.max(TTL.min, Math.round(secondsToMidnight) + 5));

/**
 * @description A widget content made of one message.
 * @param {string} message - The message.
 * @param {number} ttl - Its freshness.
 * @returns {object} The content.
 */
const messageContent = (message, ttl) => ({
  ttl_seconds: ttl,
  components: [{ type: 'text', variant: 'body', text: clip(message, 300) }],
});

/**
 * @description The color of a date: today, within its reminder, later.
 * @param {object} entry - The date.
 * @param {object} occurrence - Its occurrence.
 * @param {number} defaultReminder - Reminder of the dates without their own.
 * @returns {string} A semantic color.
 */
function colorOf(entry, occurrence, defaultReminder) {
  if (occurrence.daysRemaining === 0) return 'success';
  if (occurrence.passed) return 'neutral';
  const reminder = entry.reminder ?? defaultReminder;
  return occurrence.daysRemaining <= Math.max(1, reminder) ? 'warning' : 'info';
}

/**
 * @description The original date as text ("Dec 24, 1995", "December 24").
 * @param {object} entry - The date.
 * @param {string} language - The language.
 * @returns {string} The text.
 */
const originalOf = (entry, language) =>
  formatDay(toIso(entry), language, entry.year === null ? 'long' : 'short');

/**
 * @description The "upcoming" widget.
 * @param {object} options - Options.
 * @param {object[]} options.entries - The dates.
 * @param {string} options.today - YYYY-MM-DD.
 * @param {string} options.language - The language.
 * @param {object} [options.settings] - `{ count, days, kinds }`.
 * @param {number} options.ttl - Cache duration.
 * @param {number} options.defaultReminder - Default reminder, in days.
 * @returns {object} The content.
 */
function buildUpcomingWidget({ entries, today, language, settings = {}, ttl, defaultReminder }) {
  if (entries.length === 0) {
    return messageContent(t('widgetEmpty', language), ttl);
  }
  const count = setting(settings.count, COUNT);
  const within = setting(settings.days, WITHIN);
  const kinds = [].concat(settings.kinds ?? []).filter(Boolean);
  const listed = snapshot(entries, today).filter(
    ({ entry, occurrence }) =>
      !occurrence.passed &&
      occurrence.daysRemaining <= within &&
      (kinds.length === 0 || kinds.includes(entry.kind)),
  );
  if (listed.length === 0) {
    return messageContent(t('widgetNothingSoon', language, { days: within }), ttl);
  }
  const components = [];
  if (within < WITHIN.max) {
    components.push({
      type: 'text',
      variant: 'caption',
      text: clip(t('upcomingCaption', language, { count: listed.length, days: within }), 80),
    });
  }
  components.push({
    type: 'card-list',
    display: 'list',
    items: listed.slice(0, count).map(({ entry, occurrence }) => {
      const years = yearsOf(entry, occurrence, language);
      return {
        title: clip(years ? `${entry.name} · ${years}` : entry.name, 60),
        // A calendar day: the front shows it as a day, in the user's
        // language, without shifting it west of Greenwich.
        date: `${occurrence.next}T00:00:00.000Z`,
        badge: {
          text: clip(relativeDays(occurrence.daysRemaining, language), 16),
          color: colorOf(entry, occurrence, defaultReminder),
        },
        description: clip(
          t('itemDescription', language, {
            kind: t(`kind_${entry.kind}`, language),
            recurrence: t(`recurrence_${entry.recurrence}`, language),
            date: formatDay(occurrence.next, language),
            relative: relativeInline(occurrence.daysRemaining, language),
            years: years ? t('itemYears', language, { years }) : '',
            original: originalOf(entry, language),
          }),
          2000,
        ),
      };
    }),
  });
  return { ttl_seconds: ttl, components };
}

/**
 * @description The "countdown" widget of one date.
 * @param {object} options - Options.
 * @param {object|null} options.entry - The date (null: not chosen or removed).
 * @param {object|null} options.occurrence - Its occurrence.
 * @param {boolean} [options.chosen] - Whether a date is chosen in the settings.
 * @param {string} options.language - The language.
 * @param {number} options.ttl - Cache duration.
 * @param {number} options.defaultReminder - Default reminder, in days.
 * @returns {object} The content.
 */
function buildCountdownWidget({
  entry,
  occurrence,
  chosen = true,
  language,
  ttl,
  defaultReminder,
}) {
  if (!entry) {
    return messageContent(t(chosen ? 'widgetUnknownDate' : 'widgetChooseDate', language), ttl);
  }
  const color = colorOf(entry, occurrence, defaultReminder);
  const kind = t(`kind_${entry.kind}`, language);
  const components = [
    { type: 'text', variant: 'heading', text: clip(entry.name, 40) },
    {
      type: 'text',
      variant: 'caption',
      text: clip(
        occurrence.passed
          ? `${kind} · ${t('passedCaption', language, { date: formatDay(occurrence.next, language) })}`
          : `${kind} · ${formatDay(occurrence.next, language)}`,
        80,
      ),
    },
  ];
  if (occurrence.passed) {
    components.push({
      type: 'value',
      value: occurrence.daysSince,
      unit: t('unitDays', language),
      label: t('tileDaysSince', language),
      icon: 'rotate-ccw',
      color,
    });
  } else {
    components.push(
      occurrence.daysRemaining === 0
        ? {
            type: 'value',
            value: clip(t('today', language), 12),
            label: t('tileDays', language),
            icon: 'gift',
            color,
          }
        : {
            type: 'value',
            value: occurrence.daysRemaining,
            unit: t('unitDays', language),
            label: t('tileDays', language),
            icon: 'calendar',
            color,
          },
    );
  }
  if (entry.recurrence === 'yearly' && occurrence.yearsNext !== null && occurrence.yearsNext > 0) {
    components.push({
      type: 'value',
      value: occurrence.yearsNext,
      unit: t('unitYears', language),
      label: t(entry.kind === 'birthday' ? 'tileYearsNext_birthday' : 'tileYearsNext', language),
      icon: 'award',
    });
  }
  if (entry.countUp && !occurrence.passed && occurrence.daysSince !== null) {
    components.push({
      type: 'value',
      value: occurrence.daysSince,
      unit: t('unitDays', language),
      label: t('tileDaysSince', language),
      icon: 'rotate-ccw',
    });
  }
  const reminder = entry.reminder ?? defaultReminder;
  const items = [
    { label: t('statusOriginal', language), value: clip(originalOf(entry, language), 40) },
  ];
  if (entry.half && occurrence.halfDaysRemaining !== null) {
    items.push({
      label: t('statusHalf', language),
      value: clip(
        `${formatDay(occurrence.halfNext, language, 'short')} · ${relativeInline(occurrence.halfDaysRemaining, language)}`,
        40,
      ),
    });
  }
  if (entry.recurrence === 'yearly' || !occurrence.passed) {
    items.push({
      label: t('statusReminder', language),
      value:
        reminder >= 1 ? t('reminderDays', language, { n: reminder }) : t('reminderOff', language),
    });
  }
  components.push({ type: 'status', items: items.map((item) => ({ ...item, color: 'neutral' })) });
  return { ttl_seconds: ttl, components };
}

export {
  WIDGETS,
  COUNT,
  WITHIN,
  TTL,
  clip,
  ttlUntil,
  messageContent,
  colorOf,
  buildUpcomingWidget,
  buildCountdownWidget,
};
