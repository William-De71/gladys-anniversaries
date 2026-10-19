// Every widget content through validateWidgetContent (the checks of the core,
// which only run in debug mode in production) and the content budget of a
// card, in the four languages and in the edge cases.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';

import {
  buildUpcomingWidget,
  buildCountdownWidget,
  buildMonthWidget,
  ttlUntil,
} from '../src/widgets.js';
import { computeOccurrence } from '../src/dates.js';
import { LANGUAGES } from '../src/i18n.js';
import { DATES, MARIE, WEDDING, MOVE, GRANDPA, TODAY, entry } from './helpers/fixtures.js';

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
  assert.ok(count(['button']) <= 4, label);
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
  assert.deepEqual(types(content), ['card-list', 'button']);
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
  assert.deepEqual(types(upcoming('en', { days: 30 })), ['text', 'card-list', 'button']);
  // A passed one-time date is not listed.
  const later = upcoming('en', {}, [MOVE], '2027-03-02');
  assert.deepEqual(types(later), ['text', 'button']);
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
    ['Wedding date', 'Half anniversary', 'Reminder'],
  );
  assert.equal(countdown(MARIE, 'de', '2026-12-24').components[2].value, 'Heute');
  assert.equal(countdown(GRANDPA, 'en').components.length, 4, 'no year: no years tile');
});

test('upcoming: the traditional name of a wedding anniversary in its detail panel', () => {
  const [list] = upcoming('fr', { count: 1 }).components;
  assert.match(list.items[0].description, /16 ans ce jour-là\. .* Noces de saphir\.$/);
});

test('the "Add a date" button: a form of four fields, in every language', () => {
  for (const language of LANGUAGES) {
    const button = upcoming(language).components.find((c) => c.type === 'button');
    assert.equal(button.action.key, 'add_date');
    assert.deepEqual(
      button.action.fields.map((field) => [field.key, field.type]),
      [
        ['name', 'string'],
        ['date', 'string'],
        ['kind', 'select'],
        ['recurrence', 'select'],
      ],
    );
    for (const field of button.action.fields) {
      assert.ok(field.label.en && field.label.fr && field.label.de && field.label.es, field.key);
    }
  }
  assert.equal(upcoming('fr').components.at(-1).label, 'Ajouter une date');
});

const month = (language, settings = {}, entries = DATES, today = TODAY) =>
  buildMonthWidget({ entries, today, language, settings, ttl: 600, defaultReminder: 7 });
const crowd = Array.from({ length: 12 }, (_, i) =>
  entry({ id: `0000000${i}`.slice(-8), name: `P${i}`, day: i + 1, month: 10 }),
);

test('month: valid in every language and case', () => {
  for (const language of LANGUAGES) {
    assertValid(month(language), `${language} current`);
    assertValid(month(language, { month: 'next' }), `${language} next`);
    assertValid(month(language, {}, []), `${language} empty`);
    assertValid(month(language, { kinds: ['memorial'] }), `${language} nothing`);
    assertValid(month(language, {}, crowd), `${language} crowd`);
  }
});

test('month: the whole month, past days included, in the order of the days', () => {
  const tom = entry({ id: 'f0f0f0f0', name: 'Tom', day: 2, month: 10, year: 2016 });
  const content = month('fr', {}, [...DATES, tom]);
  assert.deepEqual(types(content), ['text', 'text', 'card-list', 'button']);
  const [heading, caption, list] = content.components;
  assert.equal(heading.text, 'Octobre 2026');
  assert.equal(caption.text, '3 date(s) ce mois-ci');
  assert.deepEqual(
    list.items.map((item) => [item.title, item.date, item.badge.text, item.badge.color]),
    [
      ['Tom · 10 ans', '2026-10-02T00:00:00.000Z', 'Il y a 14 jours', 'neutral'],
      ['Our wedding · 16 ans', '2026-10-16T00:00:00.000Z', 'Aujourd’hui', 'success'],
      ['Grandpa', '2026-10-23T00:00:00.000Z', 'Dans 7 jours', 'warning'],
    ],
  );
  // The next month, across the end of the year.
  assert.equal(
    month('en', { month: 'next' }, DATES, '2026-11-30').components[0].text,
    'December 2026',
  );
  assert.equal(
    month('en', { month: 'next' }, DATES, '2026-12-01').components[0].text,
    'January 2027',
  );
  // A one-time date in its own month only; a date not born yet is left out.
  assert.equal(month('en', {}, [MOVE], '2027-03-10').components[2].items.length, 1);
  assert.equal(month('en', {}, [MOVE], '2028-03-10').components[1].text, 'No date in March 2028.');
  assert.equal(
    month('en', {}, [MARIE], '1990-12-01').components[1].text,
    'No date in December 1990.',
  );
  // More than 8: the caption says how many are shown.
  const crowded = month('en', {}, crowd);
  assert.equal(crowded.components[1].text, '8 of 12 dates this month');
  assert.equal(crowded.components[2].items.length, 8);
});

test('countdown: the traditional name of a wedding anniversary', () => {
  const status = countdown(WEDDING, 'fr', '2026-10-10').components.at(-1);
  assert.deepEqual(
    status.items.map((item) => [item.label, item.value]),
    [
      ['Date du mariage', '16 oct. 2010'],
      ['Demi-anniversaire', '16 avr. 2027 · dans 188 jours'],
      ['Noces', 'Noces de saphir'],
      ['Rappel', '7 jours avant'],
    ],
  );
});

test('the labels read naturally: next age, date of birth, wedding date', () => {
  const [, , , years] = countdown(MARIE, 'fr').components;
  assert.deepEqual([years.value, years.unit, years.label], [31, 'ans', 'Prochain âge']);
  assert.equal(countdown(WEDDING, 'fr', '2026-10-10').components[4].label, 'Jours écoulés');
  assert.equal(countdown(MOVE, 'fr', '2027-04-01').components[2].label, 'Jours écoulés');
  const status = (entry) => countdown(entry, 'fr').components.at(-1).items[0].label;
  assert.deepEqual(
    [status(MARIE), status(WEDDING), status(MOVE)],
    ['Date de naissance', 'Date du mariage', 'Date de l’événement'],
  );
  const [list] = upcoming('en', { count: 3 }).components;
  assert.match(list.items[2].description, /Date of birth: Dec 24, 1995\.$/);
});

test('the cache lasts until midnight, one hour at most', () => {
  assert.equal(ttlUntil(120), 125);
  assert.equal(ttlUntil(86000), 3600);
  assert.equal(ttlUntil(1), 10);
});
