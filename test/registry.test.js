// The registry of the dates: the forms of the configuration buttons, their
// checks, the stored value and the serialized writes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRegistry,
  entryFromFields,
  editedEntry,
  parseRegistry,
  parseTypedDate,
  fieldsFromWidget,
  RegistryError,
  MAX_DATES,
} from '../src/registry.js';
import { MARIE, silent } from './helpers/fixtures.js';

const fields = { name: ' Marie ', day: 24, month: '12', year: 1995 };

/**
 * @description A fake setConfig that records what Gladys stored.
 * @returns {object} The fake client.
 */
function store() {
  const saved = [];
  return {
    saved,
    setConfig: async (values) => {
      saved.push(structuredClone(values));
    },
  };
}

const ids = () => {
  let n = 0;
  return () => `0000000${(n += 1)}`.slice(-8);
};

test('a form becomes a date, with the defaults of the form', () => {
  assert.deepEqual(entryFromFields(fields, 'a1b2c3d4'), {
    id: 'a1b2c3d4',
    name: 'Marie',
    day: 24,
    month: 12,
    year: 1995,
    kind: 'birthday',
    recurrence: 'yearly',
    reminder: null,
    countUp: false,
    half: false,
  });
  const text = entryFromFields({ ...fields, day: '24', year: '', reminder_days: '0' }, 'a1b2c3d4');
  assert.deepEqual([text.day, text.year, text.reminder], [24, null, 0]);
});

test('every invalid field is refused with its own message', () => {
  const refused = (values, key) =>
    assert.throws(
      () => entryFromFields({ ...fields, ...values }, 'a1b2c3d4'),
      (err) => err instanceof RegistryError && err.key === key,
      JSON.stringify(values),
    );
  refused({ name: '  ' }, 'errorName');
  refused({ name: 'x'.repeat(61) }, 'errorName');
  refused({ day: 32 }, 'errorDay');
  refused({ day: 2.5 }, 'errorDay');
  refused({ month: '' }, 'errorMonth');
  refused({ month: '13' }, 'errorMonth');
  refused({ year: 999 }, 'errorYear');
  refused({ day: 31, month: '4' }, 'errorNoSuchDay');
  refused({ day: 29, month: '2', year: 2023 }, 'errorNoSuchDay');
  refused({ kind: 'party' }, 'errorChoice');
  refused({ recurrence: 'once', year: '' }, 'errorOnceNeedsYear');
  refused({ reminder_days: 61 }, 'errorReminder');
  // 29 February without a year, or in a leap year, is fine.
  assert.equal(entryFromFields({ ...fields, day: 29, month: '2', year: '' }, 'a').day, 29);
});

test('the half anniversary only exists for yearly dates', () => {
  const once = entryFromFields({ ...fields, recurrence: 'once', half_anniversary: true }, 'a');
  assert.equal(once.half, false);
});

test('an edit keeps what is left empty or unchanged, and 0 removes the year', () => {
  const unchanged = {
    date: '#1',
    name: '',
    month: 'keep',
    kind: 'keep',
    recurrence: 'keep',
    count_up: 'keep',
    half_anniversary: 'keep',
  };
  assert.deepEqual(editedEntry(MARIE, unchanged), MARIE);
  const edited = editedEntry(MARIE, {
    ...unchanged,
    name: 'Marie D.',
    day: '25',
    year: 0,
    count_up: 'yes',
    reminder_days: 3,
  });
  assert.deepEqual(
    [edited.name, edited.day, edited.year, edited.countUp, edited.reminder],
    ['Marie D.', 25, null, true, 3],
  );
  assert.equal(editedEntry(MARIE, { ...unchanged, month: '2', day: 29, year: 0 }).month, 2);
  assert.throws(
    () => editedEntry(MARIE, { ...unchanged, recurrence: 'once', year: 0 }),
    RegistryError,
  );
});

test('the stored value: an array (or its JSON), invalid or duplicated entries dropped', () => {
  assert.deepEqual(parseRegistry([MARIE, MARIE, { ...MARIE, id: 'bad' }], silent), [MARIE]);
  assert.deepEqual(parseRegistry(JSON.stringify([MARIE]), silent), [MARIE]);
  assert.deepEqual(parseRegistry('{not json', silent), []);
  assert.deepEqual(parseRegistry(undefined, silent), []);
});

test('add, find, edit and remove go through setConfig, one change at a time', async () => {
  const gladys = store();
  const registry = createRegistry(gladys, { logger: silent, newId: ids() });
  registry.load({});
  // Two quick buttons: neither date is lost.
  const [one, two] = await Promise.all([
    registry.add(fields),
    registry.add({ ...fields, name: 'Paul', day: 3, month: '5' }),
  ]);
  assert.deepEqual(
    registry.list().map((entry) => entry.id),
    [one.id, two.id],
  );
  assert.equal(gladys.saved.at(-1).anniversaries.length, 2);
  assert.equal(registry.find('#2').name, 'Paul');
  assert.equal(registry.find('2').name, 'Paul');
  assert.equal(registry.find('marie').id, one.id);
  assert.equal(registry.find(one.id).name, 'Marie');
  await registry.add(fields);
  assert.throws(
    () => registry.find('Marie'),
    (err) => err.key === 'errorAmbiguous',
  );
  assert.throws(
    () => registry.find('Nobody'),
    (err) => err.key === 'errorNotFound',
  );
  assert.throws(
    () => registry.find(' '),
    (err) => err.key === 'errorTarget',
  );
  const { after } = await registry.edit({ date: 'Paul', name: 'Paul B.' });
  assert.equal(after.id, two.id, 'an edit keeps the identifier');
  await registry.remove('#1');
  assert.deepEqual(
    registry.list().map((entry) => entry.name),
    ['Paul B.', 'Marie'],
  );
});

test('a failed save changes nothing in memory', async () => {
  const registry = createRegistry(
    {
      setConfig: async () => {
        throw new Error('HTTP 500');
      },
    },
    { logger: silent },
  );
  registry.load({ anniversaries: [MARIE] });
  await assert.rejects(registry.add({ ...fields, name: 'Paul' }), /HTTP 500/);
  assert.deepEqual(registry.list(), [MARIE]);
  // The next change still runs.
  await assert.rejects(registry.remove('Marie'), /HTTP 500/);
});

test(`at most ${MAX_DATES} dates`, async () => {
  const registry = createRegistry(store(), { logger: silent, newId: ids() });
  registry.load({
    anniversaries: Array.from({ length: MAX_DATES }, (_, i) => ({
      ...MARIE,
      id: (0x10000000 + i).toString(16),
    })),
  });
  await assert.rejects(registry.add(fields), (err) => err.key === 'errorFull');
});

test('the date typed in the form of the widgets, day first', () => {
  assert.deepEqual(parseTypedDate('24/12/1995'), { day: 24, month: 12, year: 1995 });
  assert.deepEqual(parseTypedDate(' 24.12.1995 '), { day: 24, month: 12, year: 1995 });
  assert.deepEqual(parseTypedDate('24.12.'), { day: 24, month: 12, year: null });
  assert.deepEqual(parseTypedDate('3-5'), { day: 3, month: 5, year: null });
  assert.deepEqual(parseTypedDate('1995-12-24'), { day: 24, month: 12, year: 1995 });
  for (const text of ['', 'tomorrow', '24/12/95', '24 12 1995', '12/24/1995/1', null]) {
    assert.throws(() => parseTypedDate(text), RegistryError, String(text));
  }
  assert.deepEqual(
    fieldsFromWidget({ name: 'Marie', date: '24/12', kind: 'birthday', recurrence: 'yearly' }),
    { name: 'Marie', day: 24, month: 12, year: null, kind: 'birthday', recurrence: 'yearly' },
  );
  assert.throws(() => fieldsFromWidget({ name: 'X', date: '12/24/1995' }), { key: 'errorMonth' });
  // The other checks are those of the configuration form.
  assert.throws(() => entryFromFields(fieldsFromWidget({ name: 'X', date: '31/4' }), 'a'), {
    key: 'errorNoSuchDay',
  });
});
