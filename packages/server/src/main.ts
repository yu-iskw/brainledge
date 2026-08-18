import { LOCAL_SPACE_ID, localContext, runQueuedJobs } from '@brainledge/core';
import { openStandalone } from '@brainledge/storage';
import { serve } from '@hono/node-server';

import { resolveServerDataDir } from './data-dir.js';
import { createHttpApp } from './http/app.js';

import { defaultListenHost, defaultListenPort, prepareListen } from './index.js';

const role = process.argv[2] ?? 'api';
const handle = openStandalone(resolveServerDataDir());

if (role === 'worker') {
  const processed = await runQueuedJobs(handle.application.ports.jobs, {
    async consolidate(job) {
      const payload = JSON.parse(job.payloadJson) as { spaceId?: string };
      await handle.application.memory.consolidate(localContext(), {
        spaceId: payload.spaceId ?? LOCAL_SPACE_ID,
      });
    },
  });
  console.log(`worker processed ${processed} jobs`);
  handle.close();
} else {
  prepareListen();
  const app = createHttpApp(handle.application, {
    apiToken: process.env.BRAINLEDGE_API_TOKEN,
    uiHtml: process.env.BRAINLEDGE_UI_HTML,
  });
  serve({ fetch: app.fetch, hostname: defaultListenHost(), port: defaultListenPort() });
  console.log(`Brainledge listening on ${defaultListenHost()}:${defaultListenPort()}`);
}
