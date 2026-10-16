// The traps of the Gladys core that the fake Gladys does not catch
// (community feedback, thread 11005): a device is only polled with
// should_poll AND poll_frequency, every feature needs min / max / read_only /
// has_feedback, a wrong category / type pair shows no icon nor label, and a
// single invalid field rejects the whole discovery batch.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_FEATURE_UNITS,
} from '@gladysassistant/integration-sdk';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';

import { buildDevice, buildStates, idFromExternalId, featureSignature } from '../src/device.js';
import { computeOccurrence } from '../src/dates.js';
import { LANGUAGES } from '../src/i18n.js';
import { fakeGladys, DATES, MARIE, WEDDING, GRANDPA, MOVE, TODAY } from './helpers/fixtures.js';

const devices = (language) => DATES.map((entry) => buildDevice(fakeGladys, entry, language));

// DEVICE_FEATURE_UNITS_BY_CATEGORY of the Gladys core (server/utils/constants.js,
// v5.1.0 to v5.2.1) for `duration`, and the pairs with an icon in the front
// (front/src/utils/consts.js: duration/integer -> clock, text/text).
const DURATION_UNITS = [DEVICE_FEATURE_UNITS.DAYS, DEVICE_FEATURE_UNITS.YEARS];
const PAIRS = [
  [DEVICE_FEATURE_CATEGORIES.DURATION, DEVICE_FEATURE_TYPES.DURATION.INTEGER],
  [DEVICE_FEATURE_CATEGORIES.TEXT, DEVICE_FEATURE_TYPES.TEXT.TEXT],
];

test('devices are never polled by Gladys: the integration has its own clock', () => {
  for (const device of devices('en')) {
    assert.equal(device.should_poll, false, device.external_id);
    assert.equal(device.poll_frequency, undefined);
  }
});

test('every feature carries min, max, read_only and has_feedback, in every language', () => {
  for (const language of LANGUAGES) {
    for (const device of devices(language)) {
      for (const feature of device.features) {
        for (const key of ['min', 'max']) {
          assert.equal(typeof feature[key], 'number', `${feature.external_id}.${key}`);
        }
        assert.ok(feature.min <= feature.max, feature.external_id);
        assert.equal(feature.read_only, true, feature.external_id);
        assert.equal(feature.has_feedback, false, feature.external_id);
        assert.ok(feature.name, feature.external_id);
      }
    }
  }
});

test('every category / type pair has an icon in Gladys, every unit belongs to its category', () => {
  for (const device of devices('en')) {
    for (const feature of device.features) {
      assert.ok(
        PAIRS.some(([category, type]) => feature.category === category && feature.type === type),
        `${feature.external_id}: ${feature.category} / ${feature.type}`,
      );
      if (feature.category === DEVICE_FEATURE_CATEGORIES.DURATION) {
        assert.ok(DURATION_UNITS.includes(feature.unit), feature.external_id);
      }
    }
  }
});

test('the features follow the date: years with a year, options when chosen', () => {
  const keys = (entry) =>
    buildDevice(fakeGladys, entry).features.map((feature) => feature.external_id.split(':').pop());
  assert.deepEqual(keys(MARIE), ['days_remaining', 'years_next', 'years_current', 'next_date']);
  assert.deepEqual(keys(GRANDPA), ['days_remaining', 'next_date']);
  assert.deepEqual(keys(WEDDING), [
    'days_remaining',
    'years_next',
    'years_current',
    'days_since',
    'half_days_remaining',
    'next_date',
  ]);
  assert.deepEqual(keys(MOVE), ['days_remaining', 'days_since', 'next_date']);
  assert.notEqual(featureSignature(MARIE), featureSignature({ ...MARIE, countUp: true }));
});

test('external ids come from the identifier of the date, never from its name', () => {
  const device = buildDevice(fakeGladys, MARIE, 'fr');
  assert.equal(device.external_id, 'ext:test-integration:anniversary:a1b2c3d4');
  assert.equal(device.name, 'Marie');
  assert.equal(
    buildDevice(fakeGladys, { ...MARIE, name: 'Other' }).external_id,
    device.external_id,
  );
  assert.equal(idFromExternalId(device.external_id), 'a1b2c3d4');
  assert.equal(idFromExternalId('ext:x:other:a1b2c3d4'), null);
  assert.equal(device.features[1].name, 'Âge au prochain anniversaire');
});

test('the states of a day; unknown values are left out', () => {
  const states = buildStates(fakeGladys, MARIE, computeOccurrence(MARIE, TODAY), 'fr');
  const byKey = Object.fromEntries(
    states.map((s) => [s.device_feature_external_id.split(':').pop(), s.state ?? s.text]),
  );
  assert.deepEqual(byKey, {
    days_remaining: 69,
    years_next: 31,
    years_current: 30,
    next_date: 'jeudi 24 décembre 2026',
  });
  const future = { ...MARIE, year: 2030 };
  const ids = buildStates(fakeGladys, future, computeOccurrence(future, TODAY), 'en').map((s) =>
    s.device_feature_external_id.split(':').pop(),
  );
  assert.ok(!ids.includes('years_current'), 'not reached yet');
});

test('the host API accepts the discovery batch and the states', async () => {
  const gladys = createFakeGladys();
  await gladys.publishDiscoveredDevices(DATES.map((entry) => buildDevice(gladys, entry, 'de')));
  assert.equal(gladys.fake.discoveredDevices.length, DATES.length);
  for (const entry of DATES) {
    await gladys.publishStates(buildStates(gladys, entry, computeOccurrence(entry, TODAY), 'de'));
  }
});
