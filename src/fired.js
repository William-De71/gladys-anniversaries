// -----------------------------------------------------------------------------
// The scene events already fired today, kept in /data/fired.json so a restart
// (or a change of the event hour) never fires the same date twice in a day,
// while an event missed because Gladys was stopped at the event hour is still
// fired later the same day. Only the current day is kept.
// -----------------------------------------------------------------------------

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DEFAULT_PATH = '/data/fired.json';

/**
 * @description The record of the events fired today.
 * @param {object} [options] - Options.
 * @param {string|null} [options.path] - The file (null: memory only).
 * @param {object} [options.logger] - Logger.
 * @returns {{ has: Function, add: Function }} The record.
 */
function createFired({ path = DEFAULT_PATH, logger } = {}) {
  let day = null;
  let fired = new Set();
  if (path) {
    try {
      const stored = JSON.parse(readFileSync(path, 'utf8'));
      if (typeof stored?.day === 'string' && Array.isArray(stored.fired)) {
        day = stored.day;
        fired = new Set(stored.fired.filter((id) => typeof id === 'string'));
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger?.warn(`Anniversaries: ${path} unreadable, starting afresh: ${err.message}`);
      }
    }
  }

  const save = () => {
    if (!path) return;
    try {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify({ day, fired: [...fired] }));
    } catch (err) {
      logger?.warn(`Anniversaries: unable to write ${path}: ${err.message}`);
    }
  };

  return {
    /**
     * @param {string} today - YYYY-MM-DD.
     * @param {string} id - `<date id>:<trigger key>`.
     * @returns {boolean} True when already fired today.
     */
    has: (today, id) => day === today && fired.has(id),
    /**
     * @param {string} today - YYYY-MM-DD.
     * @param {string} id - `<date id>:<trigger key>`.
     */
    add(today, id) {
      if (day !== today) {
        day = today;
        fired = new Set();
      }
      fired.add(id);
      save();
    },
  };
}

export { DEFAULT_PATH, createFired };
