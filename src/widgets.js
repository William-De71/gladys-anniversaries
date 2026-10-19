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
//                  anniversary, name of a wedding anniversary and reminder;
//   - `month`      the dates of the current (or next) month, past days
//                  included; settings: which month, which kinds.
// `upcoming` and `month` carry an "Add a date" button: a form of four fields
// (the most a widget button takes): name, typed date, kind, repeat. The other
// options stay in the configuration ("Edit a date").
//
// The contents change once a day: they are cached until the next midnight of
// the Gladys timezone (one hour at most), and refreshed at midnight and on
// every change of the dates. Every text exists in the four languages (the
// content is cached per language). Content budget of a card: 8 components,
// 1 main one, 6 tiles, 2 texts, 1 status, 4 buttons.
// -----------------------------------------------------------------------------

import { t, all, formatDay, formatMonth, relativeDays, relativeInline, yearsText } from './i18n.js';
import { KINDS, RECURRENCES, toIso, parseDay, daysBetween, occurrenceInMonth } from './dates.js';
import { snapshot, yearsOf, weddingOf } from './events.js';
import { weddingName, capitalize } from './weddings.js';

const WIDGETS = { UPCOMING: 'upcoming', COUNTDOWN: 'countdown', MONTH: 'month' };
const WIDGET_ACTIONS = { ADD: 'add_date' };
const MONTHS = { CURRENT: 'current', NEXT: 'next' };
// The rows of a card-list in list display.
const MAX_ITEMS = 8;
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
 * @description A widget content made of one message, and optional extra
 * components (the "Add a date" button).
 * @param {string} message - The message.
 * @param {number} ttl - Its freshness.
 * @param {object[]} [extra] - Components after the message.
 * @returns {object} The content.
 */
const messageContent = (message, ttl, extra = []) => ({
  ttl_seconds: ttl,
  components: [{ type: 'text', variant: 'body', text: clip(message, 300) }, ...extra],
});

/**
 * @description The "Add a date" button and its form, in a language. The
 * fields of a form are multi-language objects (the core asks for "en").
 * @param {string} language - The language of the button.
 * @returns {object} The button component.
 */
function addButton(language) {
  const text = (key, max) =>
    Object.fromEntries(Object.entries(all(key)).map(([lang, value]) => [lang, clip(value, max)]));
  return {
    type: 'button',
    label: clip(t('buttonAdd', language), 24),
    icon: 'plus',
    style: 'secondary',
    action: {
      key: WIDGET_ACTIONS.ADD,
      fields: [
        {
          key: 'name',
          type: 'string',
          required: true,
          label: text('formName', 40),
          placeholder: text('formNamePlaceholder', 40),
        },
        {
          key: 'date',
          type: 'string',
          required: true,
          label: text('formDate', 40),
          placeholder: text('formDatePlaceholder', 40),
          description: text('formDateDescription', 200),
        },
        {
          key: 'kind',
          type: 'select',
          default: 'birthday',
          label: text('formKind', 40),
          options: KINDS.map((value) => ({ value, label: text(`kind_${value}`, 40) })),
        },
        {
          key: 'recurrence',
          type: 'select',
          default: 'yearly',
          label: text('formRecurrence', 40),
          options: RECURRENCES.map((value) => ({
            value,
            label: Object.fromEntries(
              Object.entries(text(`recurrence_${value}`, 40)).map(([lang, v]) => [
                lang,
                capitalize(v),
              ]),
            ),
          })),
        },
      ],
    },
  };
}

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
 * @description The name of the date an anniversary counts from: date of
 * birth, wedding date, date of the event ("original date" said nothing).
 * @param {object} entry - The date.
 * @param {string} language - The language.
 * @returns {string} The label.
 */
const originalLabelOf = (entry, language) =>
  ['birthday', 'wedding'].includes(entry.kind)
    ? t(`statusOriginal_${entry.kind}`, language)
    : t('statusOriginal', language);

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
    return messageContent(t('widgetEmpty', language), ttl, [addButton(language)]);
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
    return messageContent(t('widgetNothingSoon', language, { days: within }), ttl, [
      addButton(language),
    ]);
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
        description: describeItem(entry, {
          date: occurrence.next,
          days: occurrence.daysRemaining,
          years,
          wedding: weddingOf(entry, occurrence, language),
          language,
        }),
      };
    }),
  });
  components.push(addButton(language));
  return { ttl_seconds: ttl, components };
}

/**
 * @description The detail panel of a date in a card-list.
 * @param {object} entry - The date.
 * @param {object} at - The occurrence shown.
 * @param {string} at.date - Its day, YYYY-MM-DD.
 * @param {number} at.days - Days from today (negative in the past).
 * @param {string} at.years - The years reached that day, as text, or ''.
 * @param {string} at.wedding - The name of a wedding anniversary, or ''.
 * @param {string} at.language - The language.
 * @returns {string} The description.
 */
function describeItem(entry, { date, days, years, wedding, language }) {
  const text = t('itemDescription', language, {
    kind: t(`kind_${entry.kind}`, language),
    recurrence: t(`recurrence_${entry.recurrence}`, language),
    date: formatDay(date, language),
    relative: relativeInline(days, language),
    years: years ? t('itemYears', language, { years }) : '',
    original: originalOf(entry, language),
    originalLabel: originalLabelOf(entry, language),
  });
  return clip(wedding ? `${text} ${capitalize(wedding)}.` : text, 2000);
}

/**
 * @description The "month" widget: the dates of a month, past days included.
 * @param {object} options - Options.
 * @param {object[]} options.entries - The dates.
 * @param {string} options.today - YYYY-MM-DD.
 * @param {string} options.language - The language.
 * @param {object} [options.settings] - `{ month: 'current'|'next', kinds }`.
 * @param {number} options.ttl - Cache duration.
 * @param {number} options.defaultReminder - Default reminder, in days.
 * @returns {object} The content.
 */
function buildMonthWidget({ entries, today, language, settings = {}, ttl, defaultReminder }) {
  if (entries.length === 0) {
    return messageContent(t('widgetEmpty', language), ttl, [addButton(language)]);
  }
  const now = parseDay(today);
  const next = settings.month === MONTHS.NEXT;
  const year = next && now.month === 12 ? now.year + 1 : now.year;
  const month = next ? (now.month % 12) + 1 : now.month;
  const kinds = [].concat(settings.kinds ?? []).filter(Boolean);
  const listed = entries
    .filter((entry) => kinds.length === 0 || kinds.includes(entry.kind))
    .map((entry) => ({ entry, at: occurrenceInMonth(entry, year, month) }))
    .filter(({ at }) => at !== null)
    .sort((a, b) => a.at.date.localeCompare(b.at.date) || a.entry.name.localeCompare(b.entry.name));
  const title = formatMonth(year, month, language);
  if (listed.length === 0) {
    return {
      ttl_seconds: ttl,
      components: [
        { type: 'text', variant: 'heading', text: clip(title, 40) },
        {
          type: 'text',
          variant: 'body',
          text: clip(t('monthNothing', language, { month: title }), 300),
        },
        addButton(language),
      ],
    };
  }
  const shown = listed.slice(0, MAX_ITEMS);
  return {
    ttl_seconds: ttl,
    components: [
      { type: 'text', variant: 'heading', text: clip(title, 40) },
      {
        type: 'text',
        variant: 'caption',
        text: clip(
          listed.length > shown.length
            ? t('monthCaptionMore', language, { shown: shown.length, count: listed.length })
            : t('monthCaption', language, { count: listed.length }),
          80,
        ),
      },
      {
        type: 'card-list',
        display: 'list',
        items: shown.map(({ entry, at }) => {
          const days = daysBetween(today, at.date);
          const years = at.years !== null && at.years > 0 ? yearsText(at.years, language) : '';
          const wedding =
            entry.kind === 'wedding' && entry.recurrence === 'yearly'
              ? weddingName(at.years, language)
              : '';
          return {
            title: clip(years ? `${entry.name} · ${years}` : entry.name, 60),
            date: `${at.date}T00:00:00.000Z`,
            badge: {
              text: clip(relativeDays(days, language), 16),
              color: colorOf(entry, { daysRemaining: days, passed: days < 0 }, defaultReminder),
            },
            description: describeItem(entry, { date: at.date, days, years, wedding, language }),
          };
        }),
      },
      addButton(language),
    ],
  };
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
    { label: originalLabelOf(entry, language), value: clip(originalOf(entry, language), 40) },
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
  const wedding = weddingOf(entry, occurrence, language);
  if (wedding) {
    items.push({ label: t('statusWedding', language), value: clip(capitalize(wedding), 40) });
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
  WIDGET_ACTIONS,
  MONTHS,
  COUNT,
  WITHIN,
  TTL,
  clip,
  ttlUntil,
  messageContent,
  colorOf,
  addButton,
  buildUpcomingWidget,
  buildCountdownWidget,
  buildMonthWidget,
};
