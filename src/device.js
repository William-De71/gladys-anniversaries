// -----------------------------------------------------------------------------
// One device per date, offered on the Discovery screen, named after the date.
//
// Features (category / type pairs of the SDK constants, with an icon and the
// unit in the Gladys front; `duration` accepts days and years):
//   - days_remaining       duration / integer, days: until the next occurrence
//                          (0 on the day; a one-time date already passed
//                          goes negative, as in Home Assistant)
//   - years_next           duration / integer, years: reached on the next
//                          occurrence ("turns 31") — yearly date with its year
//   - years_current        duration / integer, years: reached so far ("is 30")
//                          — yearly date with its year
//   - days_since           duration / integer, days: since the last
//                          occurrence (yearly) or since the date (one time) —
//                          "count up" option
//   - half_days_remaining  duration / integer, days: until the half
//                          anniversary — "half anniversary" option
//   - next_date            text / text: the next occurrence, written in the
//                          language of the integration
//
// External ids: `anniversary:<id>`, the random identifier given to the date at
// creation: never its name. The values change once a day, at midnight in the
// timezone of Gladys, on the integration's own timer: `should_poll` is false.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as CATEGORIES,
  DEVICE_FEATURE_TYPES as TYPES,
  DEVICE_FEATURE_UNITS as UNITS,
} from '@gladysassistant/integration-sdk';
import { t, formatDay } from './i18n.js';
import { toIso } from './dates.js';

const DEVICE_TYPE = 'anniversary';
// About a century either way, for one-time dates far away.
const MAX_DAYS = 36600;
const MAX_YEARS = 2000;

const duration = (unit, min, max) => ({
  category: CATEGORIES.DURATION,
  type: TYPES.DURATION.INTEGER,
  unit,
  min,
  max,
  read_only: true,
  has_feedback: false,
  keep_history: true,
});

const FEATURES = [
  {
    key: 'days_remaining',
    name: () => 'featureDaysRemaining',
    shape: duration(UNITS.DAYS, -MAX_DAYS, MAX_DAYS),
    when: () => true,
    state: (o) => o.daysRemaining,
  },
  {
    key: 'years_next',
    name: (entry) => (entry.kind === 'birthday' ? 'featureYearsNext_birthday' : 'featureYearsNext'),
    shape: duration(UNITS.YEARS, 0, MAX_YEARS),
    when: (entry) => entry.recurrence === 'yearly' && entry.year !== null,
    state: (o) => o.yearsNext,
  },
  {
    key: 'years_current',
    name: (entry) =>
      entry.kind === 'birthday' ? 'featureYearsCurrent_birthday' : 'featureYearsCurrent',
    shape: duration(UNITS.YEARS, 0, MAX_YEARS),
    when: (entry) => entry.recurrence === 'yearly' && entry.year !== null,
    state: (o) => o.yearsCurrent,
  },
  {
    key: 'days_since',
    name: () => 'featureDaysSince',
    shape: duration(UNITS.DAYS, -MAX_DAYS, MAX_DAYS),
    when: (entry) => entry.countUp,
    state: (o) => o.daysSince,
  },
  {
    key: 'half_days_remaining',
    name: () => 'featureHalfDays',
    shape: duration(UNITS.DAYS, 0, 366),
    when: (entry) => entry.half && entry.recurrence === 'yearly',
    state: (o) => o.halfDaysRemaining,
  },
  {
    key: 'next_date',
    name: (entry) => (entry.recurrence === 'once' ? 'featureDate' : 'featureNextDate'),
    shape: {
      category: CATEGORIES.TEXT,
      type: TYPES.TEXT.TEXT,
      min: 0,
      max: 0,
      read_only: true,
      has_feedback: false,
      keep_history: false,
    },
    when: () => true,
    state: (o, language) => ({ text: formatDay(o.next, language) }),
  },
];

/**
 * @description The external ids of a date.
 * @param {object} gladys - The GladysIntegration instance.
 * @param {string} id - The identifier of the date.
 * @returns {{ device: string, feature: Function }} The ids.
 */
const idsOf = (gladys, id) => gladys.externalIds(DEVICE_TYPE, id);

/**
 * @description The identifier of a date from a device external id.
 * @param {string} externalId - `ext:<selector>:anniversary:<id>`.
 * @returns {string|null} The identifier.
 */
function idFromExternalId(externalId) {
  const match = /:anniversary:([0-9a-f]{8})$/.exec(String(externalId ?? ''));
  return match ? match[1] : null;
}

/**
 * @description The feature specs a date has (they depend on its options).
 * @param {object} entry - The date.
 * @returns {object[]} The specs.
 */
const specsOf = (entry) => FEATURES.filter((spec) => spec.when(entry));

/**
 * @description The device of a date.
 * @param {object} gladys - The GladysIntegration instance.
 * @param {object} entry - The date.
 * @param {string} [language] - Language of the feature names.
 * @returns {object} The discovered device.
 * @example
 * buildDevice(gladys, entry, 'fr');
 */
function buildDevice(gladys, entry, language = 'en') {
  const ids = idsOf(gladys, entry.id);
  return {
    name: entry.name,
    external_id: ids.device,
    model: t(`kind_${entry.kind}`, language),
    should_poll: false,
    params: [
      { name: 'DATE', value: toIso(entry) },
      { name: 'KIND', value: entry.kind },
    ],
    features: specsOf(entry).map((spec) => ({
      name: t(spec.name(entry), language),
      external_id: ids.feature(spec.key),
      ...spec.shape,
    })),
  };
}

/**
 * @description The states of a date on a day.
 * @param {object} gladys - The GladysIntegration instance.
 * @param {object} entry - The date.
 * @param {object} occurrence - computeOccurrence(entry, today).
 * @param {string} language - Language of the texts.
 * @returns {object[]} The states (unknown values are left out).
 */
function buildStates(gladys, entry, occurrence, language) {
  const ids = idsOf(gladys, entry.id);
  return specsOf(entry).flatMap((spec) => {
    const value = spec.state(occurrence, language);
    if (value === null || value === undefined) {
      return [];
    }
    const id = ids.feature(spec.key);
    return [
      typeof value === 'object'
        ? { device_feature_external_id: id, text: value.text }
        : { device_feature_external_id: id, state: value },
    ];
  });
}

/**
 * @description The feature keys of a date, to tell whether an edit changed
 * them (Gladys then shows "Update" on the Discovery screen).
 * @param {object} entry - The date.
 * @returns {string} The keys.
 */
const featureSignature = (entry) =>
  specsOf(entry)
    .map((spec) => spec.key)
    .join(',');

export {
  DEVICE_TYPE,
  FEATURES,
  idsOf,
  idFromExternalId,
  specsOf,
  buildDevice,
  buildStates,
  featureSignature,
};
