// Every widget content through validateWidgetContent (the checks of the core,
// which only run in debug mode in production) and the content budget of a
// card, in the four languages and in the edge cases.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';

import { buildUpcomingWidget, buildCountdownWidget, ttlUntil } from '../src/widgets.js';
import { computeOccurrence } from '../src/dates.js';
import { LANGUAGES } from '../src/i18n.js';
import { DATES, MARIE, WEDDING, MOVE, GRANDPA, TODAY } from './helpers/fixtures.js';

const types = (content) => content.components.map((component) => component.type);

/**
 * @description Assert a content is valid and within the budget of a card.
 * @param {object} content - The content.
 * @param {string} label - For the messages.
 */
function assertValid(content, label) {
  assert.deepEqual(validateWidgetContent(content), [], label);
  const count = (list) => types(content).filter((type) => list.includes(type)).length;
  assert.ok(content.components.length <= 8, label);
  assert.ok(count(['value', 'gauge']) <= 6, label);
  assert.ok(count(['chart', 'card-list', 'image']) <= 1, label);
  assert.ok(count(['text']) <= 2, label);
  assert.ok(count(['status']) <= 1, label);
  assert.ok(content.ttl_seconds >= 10 && content.ttl_seconds <= 3600, label);
  for (const component of content.components) {
    if (component.type === 'status') {
      component.items.forEach((item) => assert.ok(item.value, `${label}: status without value`));
    }
    if (component.type === 'value') {
      assert.ok(String(component.label).length <= 24, `${label}: ${component.label}`);
      assert.ok(typeof component.value === 'number' || component.value.length <= 12, label);
      assert.ok(!component.unit || component.unit.length <= 6, `${label}: ${component.unit}`);
    }
  }
}

const upcoming = (language, settings = {}, entries = DATES, today = TODAY) =>
  buildUpcomingWidget({ entries, today, language, settings, ttl: 600, defaultReminder: 7 });
const countdown = (entry, language, today = TODAY) =>
  buildCountdownWidget({
    entry,
    occurrence: entry ? computeOccurrence(entry, today) : null,
    language,
    ttl: 600,
    defaultReminder: 7,
  });

test('upcoming: valid in every language and case', () => {
  for (const language of LANGUAGES) {
    assertValid(upcoming(language), `${language} all`);
    assertValid(upcoming(language, { count: 8, days: 30, kinds: ['birthday'] }), language);
    assertValid(upcoming(language, {}, []), `${language} empty`);
    assertValid(upcoming(language, { days: 1, kinds: ['memorial'] }), `${language} nothing`);
  }
});

test('upcoming: nearest first, calendar dates, badges and colors', () => {
  const content = upcoming('fr', { count: 3 });
  assert.deepEqual(types(content), ['card-list']);
  const [list] = content.components;
  assert.deepEqual(
    list.items.map((item) => [item.title, item.date, item.badge.text, item.badge.color]),
    [
      ['Our wedding · 16 ans', '2026-10-16T00:00:00.000Z', 'Aujourd’hui', 'success'],
      ['Grandpa', '2026-10-23T00:00:00.000Z', 'Dans 7 jours', 'warning'],
      ['Marie · 31 ans', '2026-12-24T00:00:00.000Z', 'Dans 69 jours', 'info'],
    ],
  );
  assert.match(
    list.items[2].description,
    /Anniversaire, chaque année\. Prochaine : jeudi 24 décembre 2026/,
  );
  // Within 30 days: a caption counts them.
  assert.deepEqual(types(upcoming('en', { days: 30 })), ['text', 'card-list']);
  // A passed one-time date is not listed.
  const later = upcoming('en', {}, [MOVE], '2027-03-02');
  assert.deepEqual(types(later), ['text']);
});

test('countdown: valid for every kind of date, in every language', () => {
  for (const language of LANGUAGES) {
    for (const entry of DATES) {
      assertValid(countdown(entry, language), `${language} ${entry.name}`);
    }
    assertValid(countdown(MOVE, language, '2027-04-01'), `${language} passed`);
    assertValid(countdown(null, language), `${language} none`);
    assertValid(
      buildCountdownWidget({ entry: null, chosen: false, language, ttl: 600, defaultReminder: 7 }),
      `${language} not chosen`,
    );
  }
});

test('countdown: days left, years, days elapsed, original date and reminder', () => {
  const content = countdown(WEDDING, 'en', '2026-10-10');
  assert.deepEqual(types(content), ['text', 'text', 'value', 'value', 'value', 'status']);
  const [heading, caption, days, years, since, status] = content.components;
  assert.equal(heading.text, 'Our wedding');
  assert.equal(caption.text, 'Wedding anniversary · Friday, October 16, 2026');
  assert.deepEqual([days.value, days.color, years.value, since.value], [6, 'warning', 16, 359]);
  assert.deepEqual(
    status.items.map((item) => item.label),
    ['Original date', 'Half anniversary', 'Reminder'],
  );
  assert.equal(countdown(MARIE, 'de', '2026-12-24').components[2].value, 'Heute');
  assert.equal(countdown(GRANDPA, 'en').components.length, 4, 'no year: no years tile');
});

test('the cache lasts until midnight, one hour at most', () => {
  assert.equal(ttlUntil(120), 125);
  assert.equal(ttlUntil(86000), 3600);
  assert.equal(ttlUntil(1), 10);
});
