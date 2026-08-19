import { openStandalone } from '@brainledge/storage';

import { resolveServerDataDir } from './data-dir.js';
import { runStandaloneWorker, startStandaloneHttpServer } from './runtime.js';

const role = process.argv[2] ?? 'api';
const dataDir = resolveServerDataDir();

if (role === 'worker') {
  const handle = openStandalone(dataDir);
  const once = process.env.BRAINLEDGE_WORKER_ONCE === '1';
  if (once) {
    const processed = await runStandaloneWorker(handle.application, { once: true });
    console.log(`worker processed ${String(processed)} jobs`);
    handle.close();
  } else {
    console.log('Brainledge worker polling for jobs');
    await runStandaloneWorker(handle.application);
  }
} else {
  startStandaloneHttpServer(dataDir);
}
