// Shared fixtures of the tests: a few dates of a family, a fixed day, a
// silent logger. Tests never touch the network.

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Friday 16 October 2026.
const TODAY = '2026-10-16';
const silent = { info() {}, warn() {}, error() {}, debug() {} };

// Only what the device builders use from the SDK client.
const fakeGladys = {
  externalIds: (type, id) => {
    const device = `ext:test-integration:${type}:${id}`;
    return { device, feature: (key) => `${device}:${key}` };
  },
};

const entry = (values) => ({
  year: null,
  kind: 'birthday',
  recurrence: 'yearly',
  reminder: null,
  countUp: false,
  half: false,
  ...values,
});

const MARIE = entry({ id: 'a1b2c3d4', name: 'Marie', day: 24, month: 12, year: 1995 });
const WEDDING = entry({
  id: 'b2c3d4e5',
  name: 'Our wedding',
  day: 16,
  month: 10,
  year: 2010,
  kind: 'wedding',
  countUp: true,
  half: true,
});
const GRANDPA = entry({ id: 'c3d4e5f6', name: 'Grandpa', day: 23, month: 10, reminder: 7 });
const MOVE = entry({
  id: 'd4e5f6a7',
  name: 'Moving day',
  day: 1,
  month: 3,
  year: 2027,
  kind: 'event',
  recurrence: 'once',
  countUp: true,
});
const DATES = [MARIE, WEDDING, GRANDPA, MOVE];

/**
 * @description A temporary file path for the fired events.
 * @returns {string} The path (its directory exists, the file does not).
 */
const firedPath = () => join(mkdtempSync(join(tmpdir(), 'anniversaries-')), 'fired.json');

export { TODAY, silent, fakeGladys, entry, MARIE, WEDDING, GRANDPA, MOVE, DATES, firedPath };
