// -----------------------------------------------------------------------------
// The Anniversaries integration: every handler, registered on a Gladys client.
//
// Counts down to birthdays, wedding anniversaries and important dates:
//   - the dates are declared with the configuration buttons (registry.js),
//     stored in the Gladys configuration;
//   - one device per date (device.js): days remaining, years, days elapsed,
//     half anniversary, next date — refreshed at midnight in the timezone of
//     Gladys (TZ, given to the container by the supervisor);
//   - scene triggers (events.js): a date today, in N days, at its reminder,
//     every 1,000 days — fired once a day at the hour of the configuration;
//   - scene action: the dates of the next N days, as a text to send;
//   - dashboard widgets (widgets.js): upcoming dates, countdown of one date,
//     dates of the month; an "Add a date" button on the lists.
//
// Transport: local. The integration calls no network service at all.
//
// index.js only creates the SDK client; the tests drive this module with the
// fake Gladys of the SDK (test/app.test.js).
// -----------------------------------------------------------------------------

import { logger as sdkLogger } from '@gladysassistant/integration-sdk';
import { normalizeConfig, readLanguage, INTERNAL_KEYS, AUTO_LANGUAGE } from './config.js';
import { createRegistry, RegistryError, fieldsFromWidget } from './registry.js';
import { createFired, DEFAULT_PATH } from './fired.js';
import { resolveTimezone, localDay, wallClock, secondsUntilMidnight } from './time.js';
import { computeOccurrence, toIso } from './dates.js';
import { buildDevice, buildStates, idFromExternalId, featureSignature } from './device.js';
import { SCENE_ACTIONS, eventsOfDay, eventData, upcomingOutputs, yearsOf } from './events.js';
import {
  WIDGETS,
  WIDGET_ACTIONS,
  ttlUntil,
  buildUpcomingWidget,
  buildCountdownWidget,
  buildMonthWidget,
} from './widgets.js';
import { t, all, formatDay, relativeInline, isLanguage } from './i18n.js';

const ACTIONS = {
  ADD: 'add_date',
  EDIT: 'edit_date',
  REMOVE: 'remove_date',
  LIST: 'list_dates',
};
// The clock is read this often: a day change and the event hour are noticed
// within this delay (the day of a date never depends on it).
const TICK_MS = 30000;
// Scene events of a day are spaced, far under the 300 events per minute.
const EVENT_SPACING_MS = 250;

/**
 * @description Register every handler of the integration on a Gladys client.
 * @param {object} gladys - A GladysIntegration (or the fake Gladys of the SDK).
 * @param {object} [options] - Options.
 * @param {Function} [options.now] - `() => Date` (tests).
 * @param {string} [options.timezone] - IANA timezone (default: TZ).
 * @param {string|null} [options.firedPath] - File of the events fired today.
 * @param {Function} [options.sleep] - `(ms) => Promise` (tests).
 * @param {Function} [options.newId] - Identifier of a new date (tests).
 * @param {number} [options.tickMs] - Clock period, 0 for none (tests).
 * @param {object} [options.logger] - Logger.
 * @returns {{ tick: Function, registry: object, stop: Function }} Handles for the tests.
 * @example
 * createApp(new GladysIntegration());
 */
function createApp(
  gladys,
  {
    now = () => new Date(),
    timezone = resolveTimezone(),
    firedPath = DEFAULT_PATH,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    newId,
    tickMs = TICK_MS,
    logger = sdkLogger,
  } = {},
) {
  let config = normalizeConfig();
  // Language of the last widget request: the language of the texts Gladys
  // does not ask for in a language, when the `language` setting is `auto`.
  let language = 'en';
  let lastDay = null;
  let timer = null;
  let running = Promise.resolve();
  let lastStatus = null;

  const registry = createRegistry(gladys, { logger, ...(newId ? { newId } : {}) });
  const fired = createFired({ path: firedPath, logger });

  const today = () => localDay(now(), timezone);
  const textLanguage = () => (config.language === AUTO_LANGUAGE ? language : config.language);
  const ttl = () => ttlUntil(secondsUntilMidnight(now(), timezone));

  /**
   * @description Remember the language of a widget request, and store it
   * when it changed.
   * @param {string} next - The language.
   */
  function rememberLanguage(next) {
    if (!isLanguage(next) || next === language) {
      return;
    }
    language = next;
    gladys
      .setConfig({ [INTERNAL_KEYS.language]: next })
      .catch((err) => logger.warn(`Unable to store the language: ${err.message}`));
    if (config.language === AUTO_LANGUAGE) {
      publishDiscovery();
      publishStates();
    }
  }

  /** @description Offer every date on the Discovery screen. */
  async function publishDiscovery() {
    if (!gladys.connected) return;
    try {
      await gladys.publishDiscoveredDevices(
        registry.list().map((entry) => buildDevice(gladys, entry, textLanguage())),
      );
    } catch (err) {
      logger.error('Unable to publish the discovered dates', err);
    }
  }

  /**
   * @description Publish the states of the created devices (only the changed
   * values).
   * @param {object[]} [devices] - The devices (default: every created one).
   */
  async function publishStates(devices = gladys.devices ?? []) {
    if (!gladys.connected) return;
    const day = today();
    const states = devices.flatMap((device) => {
      const entry = registry.byId(idFromExternalId(device.external_id));
      return entry ? buildStates(gladys, entry, computeOccurrence(entry, day), textLanguage()) : [];
    });
    if (states.length === 0) return;
    try {
      await gladys.publishChangedStates(states);
    } catch (err) {
      logger.error('Unable to publish the states', err);
    }
  }

  /** @description Ask Gladys to fetch the widgets again. */
  function refreshWidgets() {
    if (!gladys.connected) return;
    Object.values(WIDGETS).forEach((key) => {
      try {
        gladys.requestWidgetRefresh(key);
      } catch (err) {
        logger.warn(`Unable to refresh the widget ${key}: ${err.message}`);
      }
    });
  }

  /** @description Show the number of dates in the Configuration screen. */
  async function reportStatus() {
    const count = registry.list().length;
    const message = count === 0 ? all('statusEmpty') : all('statusOk', { count });
    const signature = JSON.stringify(message);
    if (!gladys.connected || signature === lastStatus) return;
    lastStatus = signature;
    try {
      await gladys.setConnectionStatus(true, message);
    } catch (err) {
      lastStatus = null;
      logger.error('Unable to report the status', err);
    }
  }

  /**
   * @description Fire the scene events of the day not fired yet, once the
   * event hour is reached. A refused event stops the round: it is fired
   * again at the next tick.
   * @param {string} day - YYYY-MM-DD.
   */
  async function fireEvents(day) {
    if (!gladys.connected || wallClock(now(), timezone).hour < config.eventHour) return;
    const pending = eventsOfDay(registry.list(), day, config.reminderDays).filter(
      (event) => !fired.has(day, event.id),
    );
    for (const [index, event] of pending.entries()) {
      if (index > 0) await sleep(EVENT_SPACING_MS);
      try {
        await gladys.publishSceneEvent(event.key, eventData(gladys, event, textLanguage()));
        fired.add(day, event.id);
      } catch (err) {
        logger.warn(`Scene event ${event.key} of ${event.entry.id} refused: ${err.message}`);
        return;
      }
    }
  }

  /**
   * @description One look at the clock: a new day refreshes the devices and
   * the widgets, the event hour fires the scene events. Never two at once.
   * @returns {Promise<void>}
   */
  function tick() {
    running = running.then(async () => {
      const day = today();
      if (day !== lastDay) {
        lastDay = day;
        await publishStates();
        refreshWidgets();
      }
      await fireEvents(day);
    });
    running = running.catch((err) => logger.error('Clock round failed', err));
    return running;
  }

  /** @description Everything that follows a change of the dates. */
  async function datesChanged() {
    await publishDiscovery();
    await publishStates();
    refreshWidgets();
    await reportStatus();
    await tick();
  }

  /**
   * @description A one-line description of a date.
   * @param {object} entry - The date.
   * @param {string} lang - The language.
   * @returns {string} The line.
   */
  function describe(entry, lang) {
    const occurrence = computeOccurrence(entry, today());
    const years = yearsOf(entry, occurrence, lang);
    const reminder = entry.reminder ?? config.reminderDays;
    const options = [
      reminder >= 1 ? t('listOptionReminder', lang, { n: reminder }) : null,
      entry.countUp ? t('listOptionCountUp', lang) : null,
      entry.half ? t('listOptionHalf', lang) : null,
    ].filter(Boolean);
    return t('listLine', lang, {
      n: registry.list().findIndex((other) => other.id === entry.id) + 1,
      name: entry.name,
      kind: t(`kind_${entry.kind}`, lang),
      original: formatDay(toIso(entry), lang, entry.year === null ? 'long' : 'short'),
      recurrence: t(`recurrence_${entry.recurrence}`, lang),
      date: formatDay(occurrence.next, lang),
      relative: relativeInline(occurrence.daysRemaining, lang),
      years: years ? ` (${years})` : '',
      options: options.length > 0 ? ` — ${options.join(', ')}` : '',
    });
  }

  /**
   * @description Run a change of the registry, turning its errors into a
   * message in the language of the integration.
   * @param {Function} change - `() => Promise`.
   * @returns {Promise<*>} The result of the change.
   */
  async function guarded(change) {
    try {
      return await change();
    } catch (err) {
      if (err instanceof RegistryError) {
        throw new Error(t(err.key, textLanguage(), err.params), { cause: err });
      }
      throw new Error(t('errorSave', textLanguage(), { message: err.message }), { cause: err });
    }
  }

  // --- Configuration buttons ------------------------------------------------
  gladys.onAction(ACTIONS.ADD, async (fields = {}) => {
    const entry = await guarded(() => registry.add(fields));
    logger.info(`Date ${entry.id} added`);
    await datesChanged();
    return all((lang) => t('added', lang, { line: describe(entry, lang) }));
  });

  gladys.onAction(ACTIONS.EDIT, async (fields = {}) => {
    const { before, after } = await guarded(() => registry.edit(fields));
    logger.info(`Date ${after.id} edited`);
    await datesChanged();
    const featuresChanged = featureSignature(before) !== featureSignature(after);
    return all(
      (lang) =>
        t('edited', lang, { line: describe(after, lang) }) +
        (featuresChanged ? t('editedFeatures', lang) : ''),
    );
  });

  gladys.onAction(ACTIONS.REMOVE, async (fields = {}) => {
    const entry = await guarded(() => registry.remove(fields.date));
    logger.info(`Date ${entry.id} removed`);
    await datesChanged();
    return all('removed', { name: entry.name });
  });

  gladys.onAction(ACTIONS.LIST, async () => {
    const entries = registry.list();
    if (entries.length === 0) {
      return all('listEmpty');
    }
    return all((lang) =>
      [
        t('listHeader', lang, {
          count: entries.length,
          today: formatDay(today(), lang),
          timezone,
        }),
        ...entries.map((entry) => describe(entry, lang)),
      ].join('\n'),
    );
  });

  // --- Scene action ---------------------------------------------------------
  gladys.onSceneAction(SCENE_ACTIONS.GET_UPCOMING, async (fields = {}) =>
    upcomingOutputs(registry.list(), today(), fields, textLanguage()),
  );

  // --- Widgets --------------------------------------------------------------
  gladys.onWidgetGet(WIDGETS.UPCOMING, async ({ settings = {}, language: lang } = {}) => {
    rememberLanguage(lang);
    return buildUpcomingWidget({
      entries: registry.list(),
      today: today(),
      language: isLanguage(lang) ? lang : textLanguage(),
      settings,
      ttl: ttl(),
      defaultReminder: config.reminderDays,
    });
  });

  gladys.onWidgetGet(WIDGETS.MONTH, async ({ settings = {}, language: lang } = {}) => {
    rememberLanguage(lang);
    return buildMonthWidget({
      entries: registry.list(),
      today: today(),
      language: isLanguage(lang) ? lang : textLanguage(),
      settings,
      ttl: ttl(),
      defaultReminder: config.reminderDays,
    });
  });

  /**
   * @description The "Add a date" button of the lists. The answer is a toast
   * (200 characters at most), a refused form included: the user reads why,
   * in their language.
   * @param {string} actionKey - The action of the button.
   * @param {object} params - Its params (none).
   * @param {object} [context] - `{ values }`, the typed form.
   * @returns {Promise<object>} The toast, in every language.
   */
  async function widgetAction(actionKey, params, { values } = {}) {
    if (actionKey !== WIDGET_ACTIONS.ADD) {
      throw new Error(`Unknown widget action ${actionKey}`);
    }
    // An older core drops the form and sends the action alone.
    if (!values) {
      return all('toastNoForm');
    }
    try {
      const entry = await registry.add(fieldsFromWidget(values));
      logger.info(`Date ${entry.id} added from a widget`);
      await datesChanged();
      return all((lang) => t('toastAdded', lang, { name: entry.name }).slice(0, 200));
    } catch (err) {
      if (err instanceof RegistryError) {
        return all((lang) => t(err.key, lang, err.params).slice(0, 200));
      }
      logger.error('Unable to add a date from a widget', err);
      return all((lang) => t('errorSave', lang, { message: err.message }).slice(0, 200));
    }
  }
  gladys.onWidgetAction(WIDGETS.UPCOMING, widgetAction);
  gladys.onWidgetAction(WIDGETS.MONTH, widgetAction);

  gladys.onWidgetGet(WIDGETS.COUNTDOWN, async ({ settings = {}, language: lang } = {}) => {
    rememberLanguage(lang);
    const entry = registry.byId(idFromExternalId(settings.anniversary)) ?? null;
    return buildCountdownWidget({
      entry,
      occurrence: entry ? computeOccurrence(entry, today()) : null,
      chosen: Boolean(settings.anniversary),
      language: isLanguage(lang) ? lang : textLanguage(),
      ttl: ttl(),
      defaultReminder: config.reminderDays,
    });
  });

  // --- Devices and configuration --------------------------------------------
  gladys.onScanRequest(async () => {
    await publishDiscovery();
  });

  gladys.onDeviceCreated(async (device) => {
    await publishStates([device]);
    refreshWidgets();
  });

  gladys.onDeviceUpdated(async (device) => {
    await publishStates([device]);
  });

  gladys.onConfigUpdated(async (raw) => {
    const previous = textLanguage();
    config = normalizeConfig(raw);
    if (textLanguage() !== previous) {
      await publishDiscovery();
      await publishStates();
    }
    refreshWidgets();
    await tick();
  });

  gladys.on('connected', async () => {
    const raw = gladys.config ?? {};
    config = normalizeConfig(raw);
    language = readLanguage(raw, language);
    registry.load(raw);
    lastDay = null;
    lastStatus = null;
    logger.info(`${registry.list().length} date(s), timezone ${timezone}`);
    await publishDiscovery();
    await reportStatus();
    await tick();
    if (tickMs > 0 && timer === null) {
      timer = setInterval(() => tick(), tickMs);
      timer.unref?.();
    }
  });

  const stop = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  gladys.handleShutdown(async (signal) => {
    logger.info(`Received ${signal} -> graceful shutdown`);
    stop();
    await running;
  });

  return { tick, registry, stop };
}

export { ACTIONS, TICK_MS, createApp };
