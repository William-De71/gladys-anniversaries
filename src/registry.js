// -----------------------------------------------------------------------------
// The registry of the dates the user declared with the configuration buttons
// ("Add a date", "Edit a date", "Remove a date"): no JSON to type, a plain
// form whose fields are checked here.
//
// Stored through setConfig() under INTERNAL_KEYS.registry, a key outside the
// config_schema: the configuration lives in the Gladys database, so the dates
// follow the Gladys backups (/data does not). A change is applied in memory
// only once Gladys saved it, and changes run one after the other: two quick
// buttons never lose a date.
//
// Each date gets a random identifier at creation (8 hex digits), kept for
// ever: it builds the external ids of its device, never its name.
// -----------------------------------------------------------------------------

import { randomBytes } from 'node:crypto';
import { INTERNAL_KEYS, REMINDER_DAYS } from './config.js';
import { KINDS, RECURRENCES, YEAR, NAME_MAX, daysInMonth } from './dates.js';

// Far beyond a family, and the scene events of a day stay within the
// 300 events per minute of the host API.
const MAX_DATES = 200;
const KEEP = 'keep';
const ID_PATTERN = /^[0-9a-f]{8}$/;

class RegistryError extends Error {
  /**
   * @param {string} key - The TEXTS key of the message.
   * @param {object} [params] - Its substitutions.
   */
  constructor(key, params = {}) {
    super(key);
    this.key = key;
    this.params = params;
  }
}

const isEmpty = (value) => value === undefined || value === null || value === '';

/**
 * @description Read a whole number of a form (numbers can come as strings).
 * @param {unknown} raw - The value.
 * @returns {number|null|undefined} The number, null when empty, undefined when invalid.
 */
function readInteger(raw) {
  if (isEmpty(raw)) {
    return null;
  }
  const value = Number(typeof raw === 'string' ? raw.trim() : raw);
  return Number.isInteger(value) ? value : undefined;
}

/**
 * @description Read a boolean of a form, or of a keep/yes/no select.
 * @param {unknown} raw - The value.
 * @returns {boolean|null} The boolean, null for keep or empty.
 */
function readFlag(raw) {
  if (raw === true || raw === 'true' || raw === 'yes' || raw === 1 || raw === '1') return true;
  if (raw === false || raw === 'false' || raw === 'no' || raw === 0 || raw === '0') return false;
  return null;
}

/**
 * @description Check a complete date and return its normalized form.
 * @param {object} entry - The candidate.
 * @returns {object} The entry.
 * @throws {RegistryError} When a field is invalid.
 */
function validateEntry(entry) {
  const name = typeof entry.name === 'string' ? entry.name.trim().replace(/\s+/g, ' ') : '';
  if (name.length === 0 || name.length > NAME_MAX) {
    throw new RegistryError('errorName', { max: NAME_MAX });
  }
  if (!Number.isInteger(entry.month) || entry.month < 1 || entry.month > 12) {
    throw new RegistryError('errorMonth');
  }
  if (!Number.isInteger(entry.day) || entry.day < 1 || entry.day > 31) {
    throw new RegistryError('errorDay');
  }
  const year = entry.year ?? null;
  if (year !== null && (!Number.isInteger(year) || year < YEAR.min || year > YEAR.max)) {
    throw new RegistryError('errorYear', YEAR);
  }
  if (entry.day > daysInMonth(year, entry.month)) {
    throw new RegistryError('errorNoSuchDay', {
      day: entry.day,
      month: entry.month,
      year: year === null ? '' : `/${year}`,
    });
  }
  if (!KINDS.includes(entry.kind)) {
    throw new RegistryError('errorChoice', { value: entry.kind });
  }
  if (!RECURRENCES.includes(entry.recurrence)) {
    throw new RegistryError('errorChoice', { value: entry.recurrence });
  }
  if (entry.recurrence === 'once' && year === null) {
    throw new RegistryError('errorOnceNeedsYear');
  }
  const reminder = entry.reminder ?? null;
  if (
    reminder !== null &&
    (!Number.isInteger(reminder) || reminder < REMINDER_DAYS.min || reminder > REMINDER_DAYS.max)
  ) {
    throw new RegistryError('errorReminder', { max: REMINDER_DAYS.max });
  }
  return {
    id: entry.id,
    name,
    day: entry.day,
    month: entry.month,
    year,
    kind: entry.kind,
    recurrence: entry.recurrence,
    reminder,
    countUp: Boolean(entry.countUp),
    half: entry.recurrence === 'yearly' && Boolean(entry.half),
  };
}

/**
 * @description A new date from the fields of the "Add a date" form.
 * @param {object} fields - The form values.
 * @param {string} id - Its identifier.
 * @returns {object} The entry.
 * @throws {RegistryError} When a field is invalid.
 * @example
 * entryFromFields({ name: 'Marie', day: 24, month: '12', year: 1995 }, 'a1b2c3d4');
 */
function entryFromFields(fields, id) {
  const read = (key, error, params) => {
    const value = readInteger(fields[key]);
    if (value === undefined) {
      throw new RegistryError(error, params);
    }
    return value;
  };
  return validateEntry({
    id,
    name: fields.name,
    day: read('day', 'errorDay'),
    month: read('month', 'errorMonth'),
    year: read('year', 'errorYear', YEAR),
    kind: isEmpty(fields.kind) ? 'birthday' : fields.kind,
    recurrence: isEmpty(fields.recurrence) ? 'yearly' : fields.recurrence,
    reminder: read('reminder_days', 'errorReminder', { max: REMINDER_DAYS.max }),
    countUp: readFlag(fields.count_up) ?? false,
    half: readFlag(fields.half_anniversary) ?? false,
  });
}

/**
 * @description Read a date typed day first, as in the form of the widgets:
 * 24/12/1995, 24.12.1995, 24-12-1995, 24/12 (no year), or 1995-12-24.
 * Whether the day exists is checked later, with the other fields.
 * @param {unknown} raw - The typed text.
 * @returns {{ day: number, month: number, year: number|null }} The date.
 * @throws {RegistryError} When the text is not a date.
 * @example
 * parseTypedDate('24/12/1995'); // -> { day: 24, month: 12, year: 1995 }
 */
function parseTypedDate(raw) {
  const text = String(raw ?? '').trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (iso) {
    return { day: Number(iso[3]), month: Number(iso[2]), year: Number(iso[1]) };
  }
  const dayFirst = /^(\d{1,2})\s*[/.-]\s*(\d{1,2})(?:\s*[/.-]\s*(\d{4}))?\s*\.?$/.exec(text);
  if (!dayFirst) {
    throw new RegistryError('errorTypedDate');
  }
  return {
    day: Number(dayFirst[1]),
    month: Number(dayFirst[2]),
    year: dayFirst[3] === undefined ? null : Number(dayFirst[3]),
  };
}

/**
 * @description The fields of the "Add a date" form from the form of the
 * widgets (name, typed date, kind, repeat): the options left out take their
 * defaults.
 * @param {object} values - The typed values.
 * @returns {object} The fields of entryFromFields.
 * @throws {RegistryError} When the date is not a date.
 */
function fieldsFromWidget(values) {
  const { day, month, year } = parseTypedDate(values?.date);
  if (month < 1 || month > 12) {
    throw new RegistryError('errorMonth');
  }
  return {
    name: values?.name,
    day,
    month,
    year,
    kind: values?.kind,
    recurrence: values?.recurrence,
  };
}

/**
 * @description A date changed by the fields of the "Edit a date" form: an
 * empty field (or "Unchanged") keeps the current value, a year of 0 removes
 * the year.
 * @param {object} current - The current entry.
 * @param {object} fields - The form values.
 * @returns {object} The new entry.
 * @throws {RegistryError} When a field is invalid.
 */
function editedEntry(current, fields) {
  const integer = (key, error, params) => {
    const value = readInteger(fields[key]);
    if (value === undefined) {
      throw new RegistryError(error, params);
    }
    return value;
  };
  const choice = (key) => (isEmpty(fields[key]) || fields[key] === KEEP ? undefined : fields[key]);
  const next = { ...current };
  if (!isEmpty(fields.name)) next.name = fields.name;
  const day = integer('day', 'errorDay');
  if (day !== null) next.day = day;
  const month = choice('month');
  if (month !== undefined) {
    next.month = readInteger(month);
    if (!next.month) throw new RegistryError('errorMonth');
  }
  const year = integer('year', 'errorYear', YEAR);
  if (year !== null) next.year = year === 0 ? null : year;
  const kind = choice('kind');
  if (kind !== undefined) next.kind = kind;
  const recurrence = choice('recurrence');
  if (recurrence !== undefined) next.recurrence = recurrence;
  const reminder = integer('reminder_days', 'errorReminder', { max: REMINDER_DAYS.max });
  if (reminder !== null) next.reminder = reminder;
  const countUp = readFlag(choice('count_up'));
  if (countUp !== null) next.countUp = countUp;
  const half = readFlag(choice('half_anniversary'));
  if (half !== null) next.half = half;
  return validateEntry(next);
}

/**
 * @description Read the stored registry, dropping what is not a valid date.
 * @param {*} stored - The stored value (an array, or its JSON).
 * @param {object} [logger] - Logger.
 * @returns {object[]} The entries.
 */
function parseRegistry(stored, logger) {
  let list = stored;
  if (typeof stored === 'string') {
    try {
      list = JSON.parse(stored);
    } catch {
      logger?.warn('Anniversaries: the stored dates are not valid JSON, ignored');
      return [];
    }
  }
  if (!Array.isArray(list)) {
    return [];
  }
  const seen = new Set();
  const entries = [];
  for (const raw of list) {
    try {
      if (!raw || !ID_PATTERN.test(raw.id) || seen.has(raw.id)) {
        throw new RegistryError('invalid');
      }
      entries.push(validateEntry(raw));
      seen.add(raw.id);
    } catch {
      logger?.warn(`Anniversaries: stored date ignored: ${JSON.stringify(raw)?.slice(0, 200)}`);
    }
  }
  return entries.slice(0, MAX_DATES);
}

/**
 * @description The registry of the dates.
 * @param {object} gladys - SDK client (setConfig).
 * @param {object} [options] - Options.
 * @param {object} [options.logger] - Logger.
 * @param {Function} [options.newId] - `() => string`, 8 hex digits (tests).
 * @returns {object} The registry.
 */
function createRegistry(gladys, { logger, newId = () => randomBytes(4).toString('hex') } = {}) {
  let entries = [];
  let writing = Promise.resolve();

  // One change at a time, computed from the previous one once it is saved.
  const serial = (change) => {
    const run = writing.then(async () => {
      const { next, result } = change(entries);
      await gladys.setConfig({ [INTERNAL_KEYS.registry]: next });
      entries = next;
      return result;
    });
    writing = run.catch(() => {});
    return run;
  };

  const registry = {
    /** @param {object} config - `gladys.config`. @returns {object[]} The entries. */
    load(config) {
      entries = parseRegistry(config?.[INTERNAL_KEYS.registry], logger);
      return entries;
    },

    list: () => entries,

    /** @param {string} id - Identifier. @returns {object|undefined} The entry. */
    byId: (id) => entries.find((entry) => entry.id === id),

    /**
     * @description Find a date by its number in the list (#2 or 2), its name
     * (any case) or its identifier.
     * @param {string} query - What the user typed.
     * @returns {object} The entry.
     * @throws {RegistryError} When none or several match.
     */
    find(query) {
      const value = String(query ?? '').trim();
      if (!value) {
        throw new RegistryError('errorTarget');
      }
      const number = /^#?(\d{1,4})$/.exec(value);
      if (number) {
        const entry = entries[Number(number[1]) - 1];
        if (entry) return entry;
      }
      const lower = value.toLocaleLowerCase();
      const byName = entries.filter((entry) => entry.name.toLocaleLowerCase() === lower);
      if (byName.length === 1) return byName[0];
      if (byName.length > 1) {
        throw new RegistryError('errorAmbiguous', {
          query: value,
          numbers: byName.map((entry) => `#${entries.indexOf(entry) + 1}`).join(', '),
        });
      }
      const byId = entries.find((entry) => entry.id === lower);
      if (byId) return byId;
      throw new RegistryError('errorNotFound', { query: value });
    },

    /**
     * @description Add a date from the "Add a date" form.
     * @param {object} fields - The form values.
     * @returns {Promise<object>} The new entry.
     */
    add(fields) {
      return serial((current) => {
        if (current.length >= MAX_DATES) {
          throw new RegistryError('errorFull', { max: MAX_DATES });
        }
        let id = newId();
        while (current.some((entry) => entry.id === id)) {
          id = newId();
        }
        const entry = entryFromFields(fields, id);
        return { next: [...current, entry], result: entry };
      });
    },

    /**
     * @description Change a date from the "Edit a date" form.
     * @param {object} fields - The form values (`date`: which one).
     * @returns {Promise<{ before: object, after: object }>} The change.
     */
    edit(fields) {
      return serial((current) => {
        const before = registry.find(fields.date);
        const after = editedEntry(before, fields);
        return {
          next: current.map((entry) => (entry.id === before.id ? after : entry)),
          result: { before, after },
        };
      });
    },

    /**
     * @description Remove a date.
     * @param {string} query - Its number, name or identifier.
     * @returns {Promise<object>} The removed entry.
     */
    remove(query) {
      return serial((current) => {
        const entry = registry.find(query);
        return { next: current.filter((other) => other.id !== entry.id), result: entry };
      });
    },
  };
  return registry;
}

export {
  MAX_DATES,
  KEEP,
  RegistryError,
  validateEntry,
  entryFromFields,
  parseTypedDate,
  fieldsFromWidget,
  editedEntry,
  parseRegistry,
  createRegistry,
};
