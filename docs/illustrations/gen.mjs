// Builds the widget contents of the illustrations with the integration's own
// code: node gen.mjs <repo> <out.json> (run by render.sh)
//
// The three widgets on the made-up dates of a family, on a fixed day (Friday
// 16 October 2026): the upcoming dates, the countdown of a wedding
// anniversary with the "count up" and "half anniversary" options, and the
// dates of October.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [repo, out] = process.argv.slice(2);
const load = (path) => import(pathToFileURL(`${repo}/${path}`).href);
const { buildUpcomingWidget, buildCountdownWidget, buildMonthWidget } =
  await load('src/widgets.js');
const { computeOccurrence } = await load('src/dates.js');
const { LANGUAGES } = await load('src/i18n.js');
const manifest = JSON.parse(readFileSync(`${repo}/gladys-assistant-integration.json`, 'utf8'));

const TODAY = '2026-10-16';
const NOW = Date.parse('2026-10-16T08:00:00Z');
const entry = (values) => ({
  year: null,
  kind: 'birthday',
  recurrence: 'yearly',
  reminder: null,
  countUp: false,
  half: false,
  ...values,
});
const wedding = entry({
  id: 'b2c3d4e5',
  name: 'Claire & Alex',
  day: 16,
  month: 10,
  year: 2010,
  kind: 'wedding',
  countUp: true,
  half: true,
});
const entries = [
  entry({ id: 'a1b2c3d4', name: 'Marie', day: 24, month: 12, year: 1995 }),
  wedding,
  entry({ id: 'c3d4e5f6', name: 'Grandpa Louis', day: 23, month: 10, year: 1948, reminder: 7 }),
  entry({ id: 'd4e5f6a7', name: 'Tom', day: 2, month: 11, year: 2016 }),
  entry({
    id: 'e5f6a7b8',
    name: 'Moving day',
    day: 1,
    month: 3,
    year: 2027,
    kind: 'event',
    recurrence: 'once',
  }),
  entry({ id: 'f6a7b8c9', name: 'Grandma Jeanne', day: 8, month: 1, kind: 'memorial' }),
  entry({ id: 'a7b8c9d0', name: 'Léa', day: 5, month: 10, year: 2001 }),
];

const contents = {};
for (const language of LANGUAGES) {
  contents[language] = {
    upcoming: buildUpcomingWidget({
      entries,
      today: TODAY,
      language,
      settings: { count: 5 },
      ttl: 3600,
      defaultReminder: 7,
    }),
    countdown: buildCountdownWidget({
      entry: wedding,
      occurrence: computeOccurrence(wedding, '2026-10-09'),
      language,
      ttl: 3600,
      defaultReminder: 7,
    }),
    month: buildMonthWidget({
      entries,
      today: TODAY,
      language,
      settings: {},
      ttl: 3600,
      defaultReminder: 7,
    }),
  };
}
const widgets = Object.fromEntries(
  manifest.widgets.map((w) => [w.key, { icon: w.icon, label: w.label }]),
);
writeFileSync(out, JSON.stringify({ now: NOW, widgets, contents }));
