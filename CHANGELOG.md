# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions
follow [Semantic Versioning](https://semver.org/). This file is generated at
each release from the Conventional Commits: do not edit it by hand.

## [0.3.0] - 2026-10-20

### Added

- put the nearest date forward in the widgets, with subtitles, clearer colors and an option to hide the add button ([f5343c1](https://github.com/William-De71/gladys-anniversaries/commit/f5343c1adcab05d31757129e68bfaf1e1c5dfaf6))

## [0.2.0] - 2026-10-19

### Added

- add wedding anniversary names, round years, 1,000-day milestones, month widget and an add button on the dashboard ([bab4de8](https://github.com/William-De71/gladys-anniversaries/commit/bab4de884cd02c563de903cfc9439d1b1b0eee99))

### Fixed

- name the features in the user's language, clearer labels and a step-by-step configuration page ([d10a550](https://github.com/William-De71/gladys-anniversaries/commit/d10a5501e6f8f358ca04f0f8254c4368ca50e29f))

## [0.1.0] - 2026-10-16

### Added

- Dates declared from the configuration with plain forms ("Add a date", "Edit a date", "Remove a date", "List the dates"), no JSON: name, day, month, optional year, kind (birthday, wedding anniversary, anniversary, remembrance, event, other), yearly or one time, own reminder, "count up" and "half anniversary" options.
- One device per date: days remaining, years at the next anniversary and years so far (when the year is known), days elapsed, days to the half anniversary, next date. Values change at midnight in the timezone of Gladys; 29 February falls on 28 February in the other years.
- Scene triggers: a date is today, a date is in N days (1 to 60), reminder of a date; fired once a day at a configurable hour, never twice for the same date.
- Scene action: get the upcoming dates (count, one-line summary per date, nearest date).
- Dashboard widgets: upcoming dates (list with badges and detail) and countdown of one date.
- Local only: the integration calls no online service.
- English, French, German and Spanish everywhere: settings, devices, widgets, scenes and documentation.

[0.3.0]: https://github.com/William-De71/gladys-anniversaries/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/William-De71/gladys-anniversaries/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/William-De71/gladys-anniversaries/releases/tag/v0.1.0
