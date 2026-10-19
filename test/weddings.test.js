// The traditional names of the wedding anniversaries: one tradition per
// language, the French elision, the years a tradition does not name.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weddingName, capitalize } from '../src/weddings.js';

test('each language follows its own tradition', () => {
  assert.deepEqual(
    [1, 20, 25, 50, 60].map((n) => weddingName(n, 'fr')),
    ['noces de coton', 'noces de porcelaine', 'noces d’argent', 'noces d’or', 'noces de diamant'],
  );
  assert.deepEqual(
    [1, 20, 25, 50, 60].map((n) => weddingName(n, 'en')),
    [
      'paper anniversary',
      'china anniversary',
      'silver anniversary',
      'golden anniversary',
      'diamond anniversary',
    ],
  );
  assert.deepEqual(
    [1, 20, 25, 50, 60].map((n) => weddingName(n, 'de')),
    [
      'Papierhochzeit',
      'Porzellanhochzeit',
      'Silberhochzeit',
      'Goldene Hochzeit',
      'Diamantene Hochzeit',
    ],
  );
  assert.deepEqual(
    [1, 20, 25, 50, 60].map((n) => weddingName(n, 'es')),
    ['bodas de papel', 'bodas de porcelana', 'bodas de plata', 'bodas de oro', 'bodas de diamante'],
  );
});

test('every French year from 1 to 80, none beyond; the others only the years they name', () => {
  for (let n = 1; n <= 80; n += 1) {
    assert.match(weddingName(n, 'fr'), /^noces d(e |’)\S/, String(n));
  }
  assert.equal(weddingName(10, 'fr'), 'noces d’étain');
  assert.equal(weddingName(81, 'fr'), '');
  assert.equal(weddingName(16, 'en'), '');
  assert.equal(weddingName(17, 'de'), '');
  assert.equal(weddingName(51, 'es'), '');
  assert.equal(weddingName(100, 'es'), 'bodas de hueso');
  for (const n of [0, -1, null, 2.5]) {
    assert.equal(weddingName(n, 'fr'), '', String(n));
  }
  assert.equal(weddingName(25, 'xx'), 'silver anniversary', 'English otherwise');
  assert.equal(capitalize('noces d’or'), 'Noces d’or');
  assert.equal(capitalize(''), '');
});
