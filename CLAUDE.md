# CLAUDE.md

Project rules for coding assistants (Claude Code reads this file) and for human
contributors.

## What this is

A Gladys Assistant **external integration** that counts down to birthdays,
wedding anniversaries and important dates: a Node.js service (Node 22+, ESM, no
build step) that runs in its own sandboxed Docker container and talks to Gladys
through
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js),
its only runtime dependency. The dates are typed in plain forms (configuration
buttons, no JSON) and stored with `setConfig` in the Gladys configuration. The
date semantics follow the Home Assistant Anniversaries integration
(pinkywafer, MIT, see NOTICE). Transport: local; no network call at all.

## Commands

```bash
npm install
npm test                                  # node --test, the built-in runner
node --test test/widgets.test.js          # one file
DEBUG=gladys-integration-sdk npm test     # with the SDK debug logs
npm run lint                              # ESLint
npm run format:check                      # Prettier, as the CI runs it
npm run format                            # Prettier, fix in place
npx github:GladysAssistant/integration-store . --skip-image-check   # store checks
scripts/build-cover.sh                    # cover.jpg from docs/assets/cover.svg
docs/illustrations/render.sh              # docs/assets/widgets.<lang>.png
node .github/scripts/release.mjs next     # the version the next release would get
```

## Architecture

```
index.js                SDK wiring only (new GladysIntegration + createApp)
src/app.js              every handler, registered before connect(); the clock (tick)
src/dates.js            calendar arithmetic, pure (years, 29 February, half anniversary,
                        round years, 1,000-day milestones, a date in a month)
src/weddings.js         traditional names of the wedding anniversaries, one tradition per language
src/time.js             timezone helpers (TZ given by the supervisor)
src/registry.js         the dates: forms -> entries, checks, serialized setConfig writes
src/fired.js            scene events fired today, in /data/fired.json
src/events.js           scene trigger payloads and the get_upcoming outputs
src/device.js           one device per date, its features and states
src/widgets.js          upcoming, countdown and month dashboard widgets, "Add a date" button
src/config.js           configuration (event hour, default reminder, language)
src/i18n.js             runtime texts, en / fr / de / es, date formatting
gladys-assistant-integration.json   manifest
docs/{en,fr,de,es}.md   user documentation, re-hosted by the store
docs/illustrations/     generated widget images (render.sh, gen.mjs, render.js)
.github/scripts/release.mjs         version, changelog, bump (tested in test/)
```

## Rules

- **External ids are forever**, and so is every key users store: a date's
  random identifier (8 hex digits, given at creation, never its name), the
  feature keys (`days_remaining`, `years_next`, `years_current`, `days_since`,
  `half_days_remaining`, `next_date`), feature `category` / `type` / `unit` /
  `min` / `max`, the keys of `config_schema`, `actions` and their fields, the
  internal config keys (`anniversaries`, `last_language`), the widgets and
  their settings, scene triggers (fields, options, variables) and the scene
  action (fields, outputs). `test/structure.test.js` compares them to
  `test/fixtures/discovery.baseline.json`: never update the baseline to make a
  test pass without a documented migration.
- **Category / type pairs**: `duration` / `integer` (days, years) and `text` /
  `text`, from the SDK constants, with an icon in the Gladys front.
- **`should_poll` stays false**: the values change once a day, on the
  integration's own clock (a tick every 30 s: new local day -> states and
  widget refresh; event hour reached -> scene events).
- **Days are calendar days in the timezone of Gladys** (`TZ`): never compute a
  day from UTC. The widget lists send no card `date`: the front
  shows either the date or the subtitle of an item, never both, so the day
  is written in the subtitle (formatted integration-side).
- **Scene events**: one per date, trigger and day, fired at the event hour,
  remembered in `/data/fired.json`; a refused event is retried at the next
  tick; events are spaced (300 events per minute at most). Never fire an
  event as the consequence of an action.
- **The registry** is written through `setConfig` one change at a time, and
  applied in memory only once Gladys saved it.
- **Gladys does not pass DEBUG / LOG_LEVEL to the container**: never tell a
  store user to set them; "List the dates" is the diagnostic button.
- **The container rootfs is read-only.** Write only under `/data`.
- **Four languages.** Every user-facing text (manifest, runtime messages in
  `src/i18n.js`, `docs/*.md`, README) exists in English, French, German and
  Spanish. `test/i18n.test.js` checks it.
- **Widget images.** After any change to the content of a widget, run
  `docs/illustrations/render.sh` again and look at the four PNG files.
- **Versions belong to the Release workflow**: never edit `version` in
  `package.json`, the lockfile or the manifest, nor the `docker_image` tag.
  The version stays below 1.0.0 until the maintainer runs the Release workflow
  with `release-as: 1.0.0`.
- **Changelog.** Never edit CHANGELOG.md by hand, it is generated at the
  release. Write the PR title as the line the user will read.
- **Commits and PR titles** follow Conventional Commits, in English: `feat` ->
  minor, `fix` / `perf` -> patch, `!` or `BREAKING CHANGE:` -> major (minor
  below 1.0.0); `docs`, `chore`, `ci`, `test`, `style`, `refactor`, `build`
  release nothing.
- **Manifest.** Texts are objects `{ "en", "fr", "de", "es" }`; the catalog
  `description` holds 10 to 100 characters per language; the file stays under
  100 KB; at most 10 configuration actions. A field older cores do not know
  needs a higher `gladys_version` minimum (see `src/constants.js` of the
  integration-store): the "Add a date" button of the widgets carries a form,
  hence `>=5.2.0`. A widget button form holds 4 fields at most. Transport:
  `["local"]`.
- **Forum drafts** (`.github/forum-*.md`) are never committed.
- **Style.** Prettier formats, ESLint catches mistakes. Comments explain why,
  in English. Tests never touch the network.
