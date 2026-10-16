# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions
follow [Semantic Versioning](https://semver.org/). This file is generated at
each release from the Conventional Commits: do not edit it by hand.

## [0.1.0] - unreleased

### Added

- Dates declared from the configuration with plain forms ("Add a date", "Edit a date", "Remove a date", "List the dates"), no JSON: name, day, month, optional year, kind (birthday, wedding anniversary, anniversary, remembrance, event, other), yearly or one time, own reminder, "count up" and "half anniversary" options.
- One device per date: days remaining, years at the next anniversary and years so far (when the year is known), days elapsed, days to the half anniversary, next date. Values change at midnight in the timezone of Gladys; 29 February falls on 28 February in the other years.
- Scene triggers: a date is today, a date is in N days (1 to 60), reminder of a date; fired once a day at a configurable hour, never twice for the same date.
- Scene action: get the upcoming dates (count, one-line summary per date, nearest date).
- Dashboard widgets: upcoming dates (list with badges and detail) and countdown of one date.
- Local only: the integration calls no online service.
- English, French, German and Spanish everywhere: settings, devices, widgets, scenes and documentation.

[0.1.0]: https://github.com/William-De71/gladys-anniversaries/releases/tag/v0.1.0
