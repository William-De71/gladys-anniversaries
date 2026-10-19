import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { TRIGGERS, SCENE_ACTIONS, MAX_UPCOMING_DAYS, UPCOMING_DAYS } from '../src/events.js';
import { ACTIONS } from '../src/app.js';
import { WIDGETS, WIDGET_ACTIONS, MONTHS, COUNT, WITHIN } from '../src/widgets.js';
import { EVENT_HOUR, REMINDER_DAYS, AUTO_LANGUAGE } from '../src/config.js';
import { KINDS, RECURRENCES, YEAR } from '../src/dates.js';
import { KEEP } from '../src/registry.js';
import { LANGUAGES } from '../src/i18n.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const manifest = read('../gladys-assistant-integration.json');
const pkg = read('../package.json');
const byKey = (list) => new Map(list.map((entry) => [entry.key, entry]));
const values = (field) => field.options.map((option) => option.value);
const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('a device integration, in lockstep with package.json, at 0.x until 1.0.0 is decided', () => {
  assert.equal(manifest.type, 'device');
  assert.equal(manifest.name, 'Anniversaries');
  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.docker_image, `ghcr.io/william-de71/gladys-anniversaries:${pkg.version}`);
  assert.equal(
    manifest.cover_image,
    'https://raw.githubusercontent.com/William-De71/gladys-anniversaries/main/cover.jpg',
  );
  assert.equal(pkg.license, 'Apache-2.0');
  assert.equal(pkg.name, 'gladys-anniversaries');
});

test('declares the local transport: no network call at all', () => {
  assert.deepEqual(manifest.transports, ['local']);
  for (const file of [
    'app',
    'registry',
    'events',
    'widgets',
    'device',
    'dates',
    'fired',
    'time',
    'weddings',
  ]) {
    assert.doesNotMatch(
      source(`../src/${file}.js`),
      /fetch\(|node:https?|node:net|node:dgram/,
      file,
    );
  }
  assert.doesNotMatch(source('../src/app.js'), /publishTransports|GLADYS_PREFER_LOCAL/);
});

test('requires the first Gladys accepting widget buttons with a form; no extra permission', () => {
  // The "Add a date" button of the widgets carries a form (Gladys 5.2.0).
  assert.equal(manifest.gladys_version, '>=5.2.0');
  assert.match(source('../src/widgets.js'), /type: 'button'/);
  assert.deepEqual(manifest.categories, ['services']);
  for (const key of ['location', 'network_wake', 'containers', 'network_discovery', 'webhooks']) {
    assert.equal(manifest[key], undefined, key);
  }
  assert.doesNotMatch(JSON.stringify(manifest), /"source":"houses"/);
});

test('declares exactly the scene triggers, actions and widgets the code handles', () => {
  const app = source('../src/app.js');
  assert.deepEqual(
    manifest.scene_triggers.map((t) => t.key).sort(),
    Object.values(TRIGGERS).sort(),
  );
  assert.deepEqual(
    manifest.scene_actions.map((a) => a.key),
    Object.values(SCENE_ACTIONS),
  );
  assert.deepEqual(
    manifest.widgets.map((w) => w.key),
    Object.values(WIDGETS),
  );
  for (const key of Object.keys(WIDGETS)) {
    assert.match(app, new RegExp(`onWidgetGet\\(WIDGETS\\.${key}`), key);
  }
  for (const key of ['UPCOMING', 'MONTH']) {
    assert.match(app, new RegExp(`onWidgetAction\\(WIDGETS\\.${key}`), key);
  }
  assert.deepEqual(Object.values(WIDGET_ACTIONS), ['add_date']);
  for (const key of Object.keys(SCENE_ACTIONS)) {
    assert.match(app, new RegExp(`onSceneAction\\(SCENE_ACTIONS\\.${key}`), key);
  }
  assert.deepEqual(
    manifest.actions.map((a) => a.key),
    Object.values(ACTIONS),
  );
  for (const key of Object.keys(ACTIONS)) {
    assert.match(app, new RegExp(`onAction\\(ACTIONS\\.${key}`), key);
  }
  // The trigger fields are keys of the event data (the core compares them).
  for (const trigger of manifest.scene_triggers) {
    for (const field of trigger.fields) {
      assert.ok(
        ['anniversary', 'kind', 'days_remaining', 'milestone'].includes(field.key),
        field.key,
      );
    }
  }
});

test('mirrors the bounds and values of the code', () => {
  const config = byKey(manifest.config_schema);
  for (const bound of ['min', 'max', 'default']) {
    assert.equal(config.get('event_hour')[bound], EVENT_HOUR[bound]);
    assert.equal(config.get('reminder_days')[bound], REMINDER_DAYS[bound]);
  }
  const add = byKey(byKey(manifest.actions).get('add_date').fields);
  assert.deepEqual(values(add.get('kind')), KINDS);
  assert.deepEqual(values(add.get('recurrence')), RECURRENCES);
  assert.deepEqual(
    values(add.get('month')),
    Array.from({ length: 12 }, (_, i) => String(i + 1)),
  );
  assert.deepEqual([add.get('year').min, add.get('year').max], [YEAR.min, YEAR.max]);
  assert.equal(add.get('reminder_days').max, REMINDER_DAYS.max);
  const edit = byKey(byKey(manifest.actions).get('edit_date').fields);
  assert.deepEqual(values(edit.get('kind')), [KEEP, ...KINDS]);
  assert.deepEqual(values(edit.get('count_up')), [KEEP, 'yes', 'no']);
  assert.equal(edit.get('year').min, 0, '0 removes the year');
  const upcoming = byKey(byKey(manifest.widgets).get('upcoming').settings);
  assert.deepEqual(
    [upcoming.get('count').min, upcoming.get('count').max, upcoming.get('count').default],
    [COUNT.min, COUNT.max, COUNT.default],
  );
  assert.equal(upcoming.get('days').max, WITHIN.max);
  assert.deepEqual(values(upcoming.get('kinds')), KINDS);
  const month = byKey(byKey(manifest.widgets).get('month').settings);
  assert.deepEqual(values(month.get('month')), Object.values(MONTHS));
  assert.equal(month.get('month').default, MONTHS.CURRENT);
  assert.deepEqual(values(month.get('kinds')), KINDS);
  for (const trigger of manifest.scene_triggers.slice(0, 3)) {
    assert.deepEqual(values(byKey(trigger.fields).get('milestone')), ['yes'], trigger.key);
  }
  const days = byKey(byKey(manifest.scene_triggers).get('anniversary_upcoming').fields).get(
    'days_remaining',
  );
  assert.deepEqual([days.min, days.max, days.required], [1, MAX_UPCOMING_DAYS, true]);
  const action = byKey(manifest.scene_actions[0].fields).get('days');
  assert.deepEqual(
    [action.min, action.max, action.default],
    [UPCOMING_DAYS.min, UPCOMING_DAYS.max, UPCOMING_DAYS.default],
  );
});

test('limits of the store: counts, timeouts, sizes, no secret in widget settings', () => {
  assert.ok(manifest.actions.length <= 10);
  assert.ok(manifest.widgets.length >= 1 && manifest.widgets.length <= 5);
  for (const trigger of manifest.scene_triggers) {
    assert.ok(trigger.fields.length <= 10 && trigger.variables.length <= 20, trigger.key);
    assert.ok(trigger.key.length <= 40);
  }
  for (const action of [...manifest.scene_actions, ...manifest.actions]) {
    assert.ok(action.timeout_seconds >= 5 && action.timeout_seconds <= 120, action.key);
  }
  for (const widget of manifest.widgets) {
    for (const setting of widget.settings ?? []) {
      assert.ok(!['secret', 'oauth2', 'account_link'].includes(setting.type));
    }
  }
  const size = statSync(new URL('../gladys-assistant-integration.json', import.meta.url)).size;
  assert.ok(size < 100 * 1024, `${size} bytes`);
  const cover = readFileSync(new URL('../cover.jpg', import.meta.url));
  assert.ok(cover.length < 150 * 1024, `cover.jpg: ${cover.length} bytes`);
  assert.equal(cover.readUInt16BE(0), 0xffd8, 'cover.jpg is a JPEG');
});

test('offers the languages of the code, automatic by default', () => {
  const field = byKey(manifest.config_schema).get('language');
  assert.deepEqual(values(field), [AUTO_LANGUAGE, ...LANGUAGES]);
  assert.equal(field.default, AUTO_LANGUAGE);
});
