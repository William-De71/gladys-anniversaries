// -----------------------------------------------------------------------------
// Dashboard widgets of the Anniversaries integration.
//
//   - `upcoming`   the nearest date put forward (its name, kind and day, a
//                  colored tile of the days left and one of the years), then
//                  the next ones as a list: name, a subtitle (day, kind,
//                  years, wedding anniversary), a badge ("Today", "In 3
//                  days") and a detail panel; settings: how many, within how many days, which
//                  kinds, whether to show the button;
//   - `countdown`  one date, chosen among the created devices: days left,
//                  years reached, days elapsed, original date (not for a
//                  birthday: the age says it), half anniversary and name of a
//                  wedding anniversary;
//   - `month`      the dates of the current (or next) month, past days
//                  included, and the tiles of the next one to come in it;
//                  settings: which month, which kinds, whether to show the
//                  button.
// `upcoming` and `month` carry an "Add a date" button (unless turned off in
// the settings: the core decides its size): a form of four fields (the most a
// widget button takes): name, typed date, kind, repeat. The other options stay
// in the configuration ("Edit a date").
//
// The contents change once a day: they are cached until the next midnight of
// the Gladys timezone (one hour at most), and refreshed at midnight and on
// every change of the dates. Every text exists in the four languages (the
// content is cached per language). Content budget of a card: 8 components,
// 1 main one, 6 tiles, 2 texts, 1 status, 4 buttons.
// -----------------------------------------------------------------------------

import { t, all, formatDay, formatMonth, relativeDays, relativeInline, yearsText } from './i18n.js';
import {
  KINDS,
  RECURRENCES,
  toIso,
  parseDay,
  daysBetween,
  occurrenceInMonth,
  isRoundYears,
} from './dates.js';
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
 * @description Whether the "Add a date" button is shown (a boolean setting,
 * on unless turned off).
 * @param {object} settings - The widget settings.
 * @param {string} language - The language of the button.
 * @returns {object[]} The button, or nothing.
 */
const addButtonIf = (settings, language) =>
  settings.show_add_button === false ? [] : [addButton(language)];

/**
 * @description The color of a date: today, within its reminder, round years
 * (10, 25, 18 for a birthday...), later. The light blue badges of `primary`
 * and `info` look alike in the Gladys theme: a later date is grey in a list
 * (`later`), so that only the dates that matter are colored; a tile keeps
 * its blue (`later: 'info'`).
 * @param {object} entry - The date.
 * @param {object} occurrence - Its occurrence.
 * @param {number} defaultReminder - Reminder of the dates without their own.
 * @param {number|null} [years] - The years reached that day.
 * @param {string} [later] - The color of a later date.
 * @returns {string} A semantic color.
 */
function colorOf(entry, occurrence, defaultReminder, years = null, later = 'neutral') {
  if (occurrence.daysRemaining === 0) return 'success';
  if (occurrence.passed) return 'neutral';
  const reminder = entry.reminder ?? defaultReminder;
  if (occurrence.daysRemaining <= Math.max(1, reminder)) return 'warning';
  return entry.recurrence === 'yearly' && isRoundYears(years, entry.kind) ? 'primary' : later;
}

/**
 * @description The subtitle of a date in a list: the day, the kind, the years
 * reached ("Dec 24, 2026 · Birthday · 31 years"); for a wedding anniversary,
 * its traditional name in place of the kind ("Oct 16, 2026 · 16 years ·
 * Sapphire"). The front shows either the `date` of an item or its subtitle,
 * never both: the day is written here, and no `date` is sent.
 * @param {object} entry - The date.
 * @param {string} date - The day, YYYY-MM-DD.
 * @param {string} years - The years reached, as text, or ''.
 * @param {string} wedding - The name of a wedding anniversary, or ''.
 * @param {string} language - The language.
 * @returns {string} The subtitle.
 */
const subtitleOf = (entry, date, years, wedding, language) =>
  clip(
    [
      formatDay(date, language, 'short'),
      wedding ? '' : t(`kind_${entry.kind}`, language),
      years,
      wedding ? capitalize(wedding) : '',
    ]
      .filter(Boolean)
      .join(' · '),
    60,
  );

/**
 * @description The tile of the days left: "Today" on the day.
 * @param {number} days - Days left.
 * @param {string} color - Its color.
 * @param {string} language - The language.
 * @returns {object} The value component.
 */
const daysTile = (days, color, language) =>
  days === 0
    ? {
        type: 'value',
        value: clip(t('today', language), 12),
        label: t('tileDays', language),
        icon: 'gift',
        color,
      }
    : {
        type: 'value',
        value: days,
        unit: t('unitDays', language),
        label: t('tileDays', language),
        icon: 'calendar',
        color,
      };

/**
 * @description The tile of the years reached (the next age of a birthday),
 * for a yearly date whose year is known.
 * @param {object} entry - The date.
 * @param {number|null} years - The years reached that day.
 * @param {string} language - The language.
 * @returns {object[]} The value component, or nothing.
 */
const yearsTile = (entry, years, language) =>
  entry.recurrence === 'yearly' && years !== null && years > 0
    ? [
        {
          type: 'value',
          value: years,
          unit: t('unitYears', language),
          label: t(
            entry.kind === 'birthday' ? 'tileYearsNext_birthday' : 'tileYearsNext',
            language,
          ),
          icon: 'award',
        },
      ]
    : [];

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
 * @description The "upcoming" widget: the nearest date put forward (heading,
 * caption and tiles, which fill the card), the next ones in a list.
 * @param {object} options - Options.
 * @param {object[]} options.entries - The dates.
 * @param {string} options.today - YYYY-MM-DD.
 * @param {string} options.language - The language.
 * @param {object} [options.settings] - `{ count, days, kinds, show_add_button }`.
 * @param {number} options.ttl - Cache duration.
 * @param {number} options.defaultReminder - Default reminder, in days.
 * @returns {object} The content.
 */
function buildUpcomingWidget({ entries, today, language, settings = {}, ttl, defaultReminder }) {
  const buttons = addButtonIf(settings, language);
  if (entries.length === 0) {
    return messageContent(t('widgetEmpty', language), ttl, buttons);
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
    return messageContent(t('widgetNothingSoon', language, { days: within }), ttl, buttons);
  }
  const [first, ...rest] = listed.slice(0, count).map(({ entry, occurrence }) => {
    const years = entry.recurrence === 'yearly' ? occurrence.yearsNext : null;
    return {
      entry,
      occurrence,
      years,
      color: colorOf(entry, occurrence, defaultReminder, years),
      yearsLabel: yearsOf(entry, occurrence, language),
      wedding: weddingOf(entry, occurrence, language),
    };
  });
  const components = [
    { type: 'text', variant: 'heading', text: clip(first.entry.name, 40) },
    {
      type: 'text',
      variant: 'caption',
      text: clip(
        [
          first.wedding ? capitalize(first.wedding) : t(`kind_${first.entry.kind}`, language),
          formatDay(first.occurrence.next, language),
        ]
          .filter(Boolean)
          .join(' · '),
        80,
      ),
    },
    daysTile(
      first.occurrence.daysRemaining,
      colorOf(first.entry, first.occurrence, defaultReminder, first.years, 'info'),
      language,
    ),
    ...yearsTile(first.entry, first.years, language),
  ];
  if (rest.length > 0) {
    components.push({
      type: 'card-list',
      display: 'list',
      items: rest.map(({ entry, occurrence, color, yearsLabel, wedding }) => ({
        title: clip(entry.name, 60),
        subtitle: subtitleOf(entry, occurrence.next, yearsLabel, wedding, language),
        badge: { text: clip(relativeDays(occurrence.daysRemaining, language), 16), color },
        description: describeItem(entry, {
          date: occurrence.next,
          days: occurrence.daysRemaining,
          years: yearsLabel,
          wedding,
          language,
        }),
      })),
    });
  }
  return { ttl_seconds: ttl, components: [...components, ...buttons] };
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
 * @description The "month" widget: the dates of a month, past days included,
 * and the tiles of the next one to come in it.
 * @param {object} options - Options.
 * @param {object[]} options.entries - The dates.
 * @param {string} options.today - YYYY-MM-DD.
 * @param {string} options.language - The language.
 * @param {object} [options.settings] - `{ month: 'current'|'next', kinds, show_add_button }`.
 * @param {number} options.ttl - Cache duration.
 * @param {number} options.defaultReminder - Default reminder, in days.
 * @returns {object} The content.
 */
function buildMonthWidget({ entries, today, language, settings = {}, ttl, defaultReminder }) {
  const buttons = addButtonIf(settings, language);
  if (entries.length === 0) {
    return messageContent(t('widgetEmpty', language), ttl, buttons);
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
        ...buttons,
      ],
    };
  }
  const shown = listed.slice(0, MAX_ITEMS).map(({ entry, at }) => {
    const days = daysBetween(today, at.date);
    const years = at.years !== null && at.years > 0 ? at.years : null;
    return {
      entry,
      at,
      days,
      years,
      color: colorOf(entry, { daysRemaining: days, passed: days < 0 }, defaultReminder, years),
      yearsLabel: years === null ? '' : yearsText(years, language),
      wedding:
        entry.kind === 'wedding' && entry.recurrence === 'yearly'
          ? weddingName(at.years, language)
          : '',
    };
  });
  // The next date to come this month, put forward with its tiles; the
  // caption then names it, and counts the dates in short.
  const coming = shown.find(({ days }) => days >= 0);
  const more = listed.length > shown.length;
  const values = { shown: shown.length, count: listed.length };
  const counted = coming
    ? t(more ? 'monthCountMore' : 'monthCount', language, values)
    : t(more ? 'monthCaptionMore' : 'monthCaption', language, values);
  return {
    ttl_seconds: ttl,
    components: [
      { type: 'text', variant: 'heading', text: clip(title, 40) },
      {
        type: 'text',
        variant: 'caption',
        text: clip(
          coming
            ? `${t('monthNext', language, { name: clip(coming.entry.name, 30) })} · ${counted}`
            : counted,
          80,
        ),
      },
      ...(coming
        ? [
            daysTile(
              coming.days,
              colorOf(
                coming.entry,
                { daysRemaining: coming.days, passed: false },
                defaultReminder,
                coming.years,
                'info',
              ),
              language,
            ),
            ...yearsTile(coming.entry, coming.years, language),
          ]
        : []),
      {
        type: 'card-list',
        display: 'list',
        items: shown.map(({ entry, at, days, color, yearsLabel, wedding }) => ({
          title: clip(entry.name, 60),
          subtitle: subtitleOf(entry, at.date, yearsLabel, wedding, language),
          badge: { text: clip(relativeDays(days, language), 16), color },
          description: describeItem(entry, {
            date: at.date,
            days,
            years: yearsLabel,
            wedding,
            language,
          }),
        })),
      },
      ...buttons,
    ],
  };
}

/**
 * @description The "countdown" widget of one date. The original date is left
 * out for a birthday (the age and the day say it), and the reminder is not
 * shown (it only matters to the scenes).
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
  const years = entry.recurrence === 'yearly' ? occurrence.yearsNext : null;
  const color = colorOf(entry, occurrence, defaultReminder, years, 'info');
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
  components.push(
    occurrence.passed
      ? {
          type: 'value',
          value: occurrence.daysSince,
          unit: t('unitDays', language),
          label: t('tileDaysSince', language),
          icon: 'rotate-ccw',
          color,
        }
      : daysTile(occurrence.daysRemaining, color, language),
    ...yearsTile(entry, years, language),
  );
  if (entry.countUp && !occurrence.passed && occurrence.daysSince !== null) {
    components.push({
      type: 'value',
      value: occurrence.daysSince,
      unit: t('unitDays', language),
      label: t('tileDaysSince', language),
      icon: 'rotate-ccw',
    });
  }
  const items = [];
  if (entry.kind !== 'birthday') {
    items.push({
      label: originalLabelOf(entry, language),
      value: clip(originalOf(entry, language), 40),
    });
  }
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
  if (items.length > 0) {
    components.push({
      type: 'status',
      items: items.map((item) => ({ ...item, color: 'neutral' })),
    });
  }
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
