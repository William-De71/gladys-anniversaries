// The integration end to end, against the fake Gladys of the SDK: the
// configuration buttons, the Discovery list, the states of the created
// devices, the clock (midnight, event hour, never twice a day), the widgets
// and the scene action.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { createApp, ACTIONS } from '../src/app.js';
import { TRIGGERS } from '../src/events.js';
import { DATES, MARIE, WEDDING, GRANDPA, silent, firedPath } from './helpers/fixtures.js';

/**
 * @description A started integration on a controllable clock.
 * @param {object} [options] - Options.
 * @param {string} [options.at] - The instant (ISO, UTC).
 * @param {object} [options.config] - The configuration.
 * @param {string} [options.path] - File of the fired events.
 * @returns {Promise<object>} `{ gladys, app, clock }`.
 */
async function start({ at = '2026-10-16T05:00:00Z', config = {}, path = firedPath() } = {}) {
  const clock = { now: new Date(at) };
  const gladys = createFakeGladys({ config: { language: 'en', ...config } });
  let n = 0;
  const app = createApp(gladys, {
    now: () => clock.now,
    timezone: 'Europe/Paris',
    firedPath: path,
    sleep: async () => {},
    newId: () => `e000000${(n += 1)}`.slice(-8),
    tickMs: 0,
    logger: silent,
  });
  await gladys.connect();
  return { gladys, app, clock, path };
}

const ok = (ack) => {
  assert.equal(ack.success, true, ack.error);
  return ack.data.message ?? ack.data.content ?? ack.data.outputs;
};
const keyOf = (state) => state.device_feature_external_id.split(':').pop();

test('no date: an empty Discovery list and a status that says what to do', async () => {
  const { gladys } = await start();
  assert.deepEqual(gladys.fake.discoveredDevices, []);
  assert.equal(gladys.fake.connectionStatus.connected, true);
  assert.match(gladys.fake.connectionStatus.message.fr, /Ajouter une date/);
  assert.deepEqual(ok(await gladys.fake.action(ACTIONS.LIST)).en, 'No date yet: use “Add a date”.');
});

test('add a date: stored in Gladys, offered on the Discovery screen, explained', async () => {
  const { gladys } = await start();
  const message = ok(
    await gladys.fake.action(ACTIONS.ADD, {
      name: 'Marie',
      day: 24,
      month: '12',
      year: 1995,
      kind: 'birthday',
      recurrence: 'yearly',
      count_up: false,
      half_anniversary: false,
    }),
  );
  assert.match(message.fr, /^Ajoutée : #1 Marie — Anniversaire, 24 déc\. 1995 \(chaque année\)/);
  assert.match(message.en, /in 69 days \(31 years\) — reminder 7 d before/);
  assert.equal(gladys.fake.config.anniversaries.length, 1);
  assert.deepEqual(
    gladys.fake.discoveredDevices.map((device) => device.name),
    ['Marie'],
  );
  assert.match(gladys.fake.connectionStatus.message.en, /1 date\(s\) registered/);
  // An invalid form is refused, in the language of the integration.
  const refused = await gladys.fake.action(ACTIONS.ADD, { name: 'X', day: 31, month: '4' });
  assert.equal(refused.success, false);
  assert.match(refused.error, /This day does not exist: 31\/4/);
});

test('edit, list and remove, by name or number', async () => {
  const { gladys } = await start({ config: { anniversaries: [MARIE, GRANDPA] } });
  const edited = ok(await gladys.fake.action(ACTIONS.EDIT, { date: 'marie', count_up: 'yes' }));
  assert.match(edited.en, /^Updated: #1 Marie/);
  assert.match(edited.en, /click “Update” on its device/, 'a feature was added');
  const list = ok(await gladys.fake.action(ACTIONS.LIST)).fr.split('\n');
  assert.equal(list.length, 3);
  assert.match(
    list[0],
    /^2 date\(s\), nous sommes le vendredi 16 octobre 2026 \(Europe\/Paris\) :$/,
  );
  assert.match(list[2], /^#2 Grandpa — Anniversaire, 23 octobre \(chaque année\)/);
  const removed = ok(await gladys.fake.action(ACTIONS.REMOVE, { date: '#2' }));
  assert.match(removed.de, /^Entfernt: Grandpa/);
  assert.deepEqual(
    gladys.fake.discoveredDevices.map((device) => device.name),
    ['Marie'],
  );
  const unknown = await gladys.fake.action(ACTIONS.REMOVE, { date: 'Nobody' });
  assert.match(unknown.error, /No date matches “Nobody”/);
});

test('a created device gets its states at once, then at every midnight', async () => {
  const { gladys, app, clock } = await start({ config: { anniversaries: [MARIE] } });
  assert.equal(gladys.fake.states.length, 0, 'no device created yet');
  await gladys.fake.deviceCreated(gladys.fake.discoveredDevices[0]);
  const first = Object.fromEntries(gladys.fake.states.map((s) => [keyOf(s), s.state ?? s.text]));
  assert.deepEqual(first, {
    days_remaining: 69,
    years_next: 31,
    years_current: 30,
    next_date: 'Thursday, December 24, 2026',
  });
  assert.ok(gladys.fake.widgetRefreshes.includes('countdown'));
  const count = gladys.fake.states.length;
  await app.tick();
  assert.equal(gladys.fake.states.length, count, 'same day: nothing new');
  // 23:59:59 in Paris, then 00:00:30: a new day.
  clock.now = new Date('2026-10-16T21:59:59Z');
  await app.tick();
  assert.equal(gladys.fake.states.length, count);
  clock.now = new Date('2026-10-16T22:00:30Z');
  await app.tick();
  const changed = gladys.fake.states.slice(count);
  assert.deepEqual(
    changed.map((s) => [keyOf(s), s.state]),
    [['days_remaining', 68]],
    'only the changed values',
  );
});

test('scene events: at the event hour, once a day, again after a restart only if missed', async () => {
  const at = '2026-10-16T06:30:00Z'; // 08:30 in Paris, before 09:00.
  const first = await start({ at, config: { anniversaries: DATES } });
  assert.deepEqual(first.gladys.fake.sceneEvents, []);
  first.clock.now = new Date('2026-10-16T07:00:05Z'); // 09:00:05
  await first.app.tick();
  assert.deepEqual(
    first.gladys.fake.sceneEvents.map((event) => [event.key, event.data.name]),
    [
      [TRIGGERS.TODAY, WEDDING.name],
      [TRIGGERS.UPCOMING, GRANDPA.name],
      [TRIGGERS.REMINDER, GRANDPA.name],
    ],
  );
  await first.app.tick();
  assert.equal(first.gladys.fake.sceneEvents.length, 3, 'never twice');
  // A restart later the same day fires nothing again.
  const again = await start({
    at: '2026-10-16T12:00:00Z',
    config: { anniversaries: DATES },
    path: first.path,
  });
  assert.deepEqual(again.gladys.fake.sceneEvents, []);
  // Gladys stopped at 09:00: the events come when it is back, the same day.
  const late = await start({ at: '2026-10-16T12:00:00Z', config: { anniversaries: DATES } });
  assert.equal(late.gladys.fake.sceneEvents.length, 3);
});

test('events missed by a 429 are retried', async (t) => {
  const gladys = createFakeGladys({
    config: { language: 'en', anniversaries: DATES, event_hour: 0 },
  });
  const publish = gladys.publishSceneEvent.bind(gladys);
  let refuse = true;
  t.mock.method(gladys, 'publishSceneEvent', async (...args) => {
    if (refuse && args[0] === TRIGGERS.UPCOMING) throw new Error('429 TOO_MANY_REQUESTS');
    return publish(...args);
  });
  const app = createApp(gladys, {
    now: () => new Date('2026-10-16T05:00:00Z'),
    timezone: 'Europe/Paris',
    firedPath: firedPath(),
    sleep: async () => {},
    tickMs: 0,
    logger: silent,
  });
  await gladys.connect();
  assert.deepEqual(
    gladys.fake.sceneEvents.map((e) => e.key),
    [TRIGGERS.TODAY],
  );
  refuse = false;
  await app.tick();
  assert.deepEqual(
    gladys.fake.sceneEvents.map((e) => e.key),
    [TRIGGERS.TODAY, TRIGGERS.UPCOMING, TRIGGERS.REMINDER],
  );
});

test('widgets and the scene action answer from the registry', async () => {
  const { gladys } = await start({ config: { anniversaries: DATES } });
  const upcoming = ok(
    await gladys.fake.widgetGet('upcoming', { settings: { count: 2 }, language: 'es' }),
  );
  assert.equal(upcoming.components[0].items.length, 2);
  assert.equal(upcoming.components[0].items[0].badge.text, 'Hoy');
  assert.ok(upcoming.ttl_seconds <= 3600);
  const device = 'ext:test-integration:anniversary:a1b2c3d4';
  const countdown = ok(
    await gladys.fake.widgetGet('countdown', { settings: { anniversary: device } }),
  );
  assert.equal(countdown.components[0].text, 'Marie');
  const gone = ok(
    await gladys.fake.widgetGet('countdown', {
      settings: { anniversary: 'ext:test-integration:anniversary:ffffffff' },
    }),
  );
  assert.match(gone.components[0].text, /no longer exists/);
  const out = ok(await gladys.fake.sceneAction('get_upcoming', { days: 7 }));
  assert.equal(out.count, 2);
});

test('the "Add a date" button of the widgets: added, explained, refused in a toast', async () => {
  const { gladys } = await start();
  const form = (values) => gladys.fake.widgetAction('upcoming', 'add_date', {}, { values });
  const added = ok(
    await form({ name: 'Marie', date: '24/12/1995', kind: 'birthday', recurrence: 'yearly' }),
  );
  assert.match(added.fr, /^Date ajoutée : Marie\. .*Découverte/);
  assert.ok(Object.values(added).every((text) => text.length <= 200));
  assert.deepEqual(
    gladys.fake.config.anniversaries.map((e) => [e.name, e.day, e.month, e.year, e.kind]),
    [['Marie', 24, 12, 1995, 'birthday']],
  );
  assert.deepEqual(
    gladys.fake.discoveredDevices.map((device) => device.name),
    ['Marie'],
  );
  // From the month widget too.
  ok(
    await gladys.fake.widgetAction(
      'month',
      'add_date',
      {},
      { values: { name: 'Us', date: '16.10.2010', kind: 'wedding', recurrence: 'yearly' } },
    ),
  );
  assert.equal(gladys.fake.config.anniversaries.length, 2);
  // A wrong date is answered in the toast, nothing is stored.
  assert.match(ok(await form({ name: 'X', date: '31/04' })).en, /This day does not exist/);
  assert.match(ok(await form({ name: 'X', date: 'soon' })).fr, /en commençant par le jour/);
  // An older core sends the action without its form.
  assert.match(
    ok(await gladys.fake.widgetAction('upcoming', 'add_date', {})).en,
    /does not send the form/,
  );
  assert.equal(gladys.fake.config.anniversaries.length, 2);
});

test('the month widget lists the dates of the month', async () => {
  const { gladys } = await start({ config: { anniversaries: DATES } });
  const content = ok(await gladys.fake.widgetGet('month', { settings: {}, language: 'de' }));
  assert.equal(content.components[0].text, 'Oktober 2026');
  assert.deepEqual(
    content.components[2].items.map((item) => item.title),
    ['Our wedding · 16 Jahre', 'Grandpa'],
  );
  const next = ok(await gladys.fake.widgetGet('month', { settings: { month: 'next' } }));
  assert.equal(next.components[1].text, 'No date in November 2026.');
});

test('a date reaching 1,000 days fires its scene event at the event hour', async () => {
  const tom = { ...MARIE, id: 'f0f0f0f0', name: 'Tom', day: 1, month: 1, year: 2000 };
  const { gladys } = await start({
    at: '2027-05-19T07:00:05Z',
    config: { anniversaries: [tom] },
  });
  assert.deepEqual(
    gladys.fake.sceneEvents.map((event) => [event.key, event.data.days]),
    [[TRIGGERS.DAYS_MILESTONE, 10000]],
  );
});

test('the automatic language follows the dashboard and is remembered', async () => {
  const { gladys } = await start({ config: { language: 'auto', anniversaries: [MARIE] } });
  assert.equal(gladys.fake.discoveredDevices[0].features[1].name, 'Age at next birthday');
  await gladys.fake.widgetGet('upcoming', { language: 'fr' });
  assert.equal(gladys.fake.config.last_language, 'fr');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(gladys.fake.discoveredDevices[0].features[1].name, 'Âge au prochain anniversaire');
});

test('a configuration change applies the new event hour at once', async () => {
  const { gladys } = await start({ at: '2026-10-16T05:00:00Z', config: { anniversaries: DATES } });
  assert.equal(gladys.fake.sceneEvents.length, 0, '07:00 in Paris, before 09:00');
  await gladys.fake.configUpdated({ ...gladys.fake.config, event_hour: 6 });
  assert.equal(gladys.fake.sceneEvents.length, 3);
});

test('shutdown stops the clock', async () => {
  const { gladys } = await start();
  await gladys.fake.shutdown('SIGTERM');
});
