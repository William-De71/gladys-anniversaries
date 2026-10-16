// -----------------------------------------------------------------------------
// Entry point of the Anniversaries external integration.
//
// Counts down to birthdays, wedding anniversaries and important dates:
//   - devices: one per date declared in the configuration (days remaining,
//     years, days elapsed, half anniversary, next date), offered on the
//     Discovery screen (see src/device.js);
//   - scene triggers: a date today, in N days, at its reminder;
//   - scene action: the dates of the next N days;
//   - dashboard widgets: upcoming dates, countdown of one date.
//
// This file only wires the SDK client: the handlers are in src/app.js.
//
// Environment variables provided by the Gladys supervisor:
//   GLADYS_HOST_API_URL / GLADYS_INTEGRATION_TOKEN / GLADYS_INTEGRATION_SELECTOR
//   TZ (the timezone of Gladys: a day starts at its midnight)
// The SDK reads the first three: `new GladysIntegration()` is enough.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { createApp } from './src/app.js';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const gladys = new GladysIntegration();
createApp(gladys);

// --- Startup -----------------------------------------------------------------------
logger.info(`Starting the Anniversaries integration ${version}...`);
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
