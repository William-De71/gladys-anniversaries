// -----------------------------------------------------------------------------
// Configuration of the Anniversaries integration.
//
// Fields of the config_schema:
//   - `event_hour`     local hour (0-23) the daily scene events are fired at;
//   - `reminder_days`  default reminder of the dates added without their own
//                      (days before, 0 = no reminder);
//   - `language`       language of the texts Gladys does not ask for in a
//                      language (feature names, next date, scene summaries,
//                      messages of the configuration buttons): `auto` follows
//                      the language of the last widget request.
//
// Internal keys, outside the config_schema (never shown in the UI, stored by
// setConfig in the Gladys database, so they follow the Gladys backups):
//   - `anniversaries`  the registry of the dates (see registry.js);
//   - `last_language`  language of the last widget request.
// -----------------------------------------------------------------------------

import { isLanguage } from './i18n.js';

const EVENT_HOUR = { min: 0, max: 23, default: 9 };
const REMINDER_DAYS = { min: 0, max: 60, default: 7 };
const AUTO_LANGUAGE = 'auto';
const INTERNAL_KEYS = { registry: 'anniversaries', language: 'last_language' };

/**
 * @description Read a bounded whole number, falling back to its default.
 * @param {unknown} raw - The raw value (the form can send numbers as strings).
 * @param {{ min: number, max: number, default: number }} bounds - The bounds.
 * @returns {number} The value.
 * @example
 * readNumber('8', EVENT_HOUR); // -> 8
 */
function readNumber(raw, bounds) {
  if (raw === '' || raw === null || raw === undefined) {
    return bounds.default;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return bounds.default;
  }
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(value)));
}

/**
 * @description Normalize the raw config object from the host API.
 * @param {object} [rawConfig] - The raw config values.
 * @returns {{ eventHour: number, reminderDays: number, language: string }} The config.
 * @example
 * normalizeConfig({ event_hour: 8 });
 */
function normalizeConfig(rawConfig = {}) {
  const config = rawConfig ?? {};
  return {
    eventHour: readNumber(config.event_hour, EVENT_HOUR),
    reminderDays: readNumber(config.reminder_days, REMINDER_DAYS),
    language: isLanguage(config.language) ? config.language : AUTO_LANGUAGE,
  };
}

/**
 * @description Read the stored language of the last widget request.
 * @param {object} [rawConfig] - The raw config values.
 * @param {string} fallback - The language to keep when nothing valid is stored.
 * @returns {string} The language.
 */
function readLanguage(rawConfig, fallback) {
  const language = (rawConfig ?? {})[INTERNAL_KEYS.language];
  return isLanguage(language) ? language : fallback;
}

export {
  EVENT_HOUR,
  REMINDER_DAYS,
  AUTO_LANGUAGE,
  INTERNAL_KEYS,
  readNumber,
  normalizeConfig,
  readLanguage,
};
