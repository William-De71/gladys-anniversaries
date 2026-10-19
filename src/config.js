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
//                      the language of the last widget request, and guesses
//                      it from the timezone of Gladys until a widget is shown
//                      (Gladys gives the integration no other language).
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

// Timezones of the countries speaking one of the languages of the
// integration; any other one is English. A guess for the first devices only:
// the first widget shown gives the real language.
const TIMEZONE_LANGUAGES = {
  fr: [
    'Europe/Paris',
    'Europe/Monaco',
    'Europe/Brussels',
    'Europe/Luxembourg',
    'Indian/Reunion',
    'Indian/Mayotte',
    'America/Guadeloupe',
    'America/Martinique',
    'America/Cayenne',
    'America/Miquelon',
    'America/St_Barthelemy',
    'America/Marigot',
    'Pacific/Noumea',
    'Pacific/Tahiti',
    'Pacific/Wallis',
    'America/Montreal',
    'Africa/Abidjan',
    'Africa/Dakar',
    'Africa/Casablanca',
    'Africa/Algiers',
    'Africa/Tunis',
  ],
  de: ['Europe/Berlin', 'Europe/Busingen', 'Europe/Vienna', 'Europe/Zurich', 'Europe/Vaduz'],
  es: [
    'Europe/Madrid',
    'Atlantic/Canary',
    'Africa/Ceuta',
    'America/Mexico_City',
    'America/Bogota',
    'America/Lima',
    'America/Santiago',
    'America/Caracas',
    'America/Montevideo',
    'America/Asuncion',
    'America/La_Paz',
    'America/Guayaquil',
    'America/Havana',
    'America/Panama',
    'America/Costa_Rica',
    'America/Guatemala',
    'America/El_Salvador',
    'America/Tegucigalpa',
    'America/Managua',
    'America/Santo_Domingo',
    'America/Puerto_Rico',
  ],
};

/**
 * @description The language of the texts guessed from a timezone, before
 * any widget was shown.
 * @param {string} timezone - IANA timezone of Gladys.
 * @returns {string} en, fr, de or es.
 * @example
 * guessLanguage('Europe/Paris'); // -> 'fr'
 */
function guessLanguage(timezone) {
  const zone = String(timezone ?? '');
  if (zone.startsWith('America/Argentina/')) return 'es';
  const found = Object.entries(TIMEZONE_LANGUAGES).find(([, zones]) => zones.includes(zone));
  return found ? found[0] : 'en';
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
  guessLanguage,
  normalizeConfig,
  readLanguage,
};
