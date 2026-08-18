export { cmdInit, cmdRemember, cmdRecall } from './commands/memory.js';
export { cmdStatus, cmdDoctor } from './commands/status.js';
export { cmdBackup, cmdRestore, backupManifest } from './commands/backup.js';
export {
  cmdExport,
  cmdImport,
  cmdServe,
  cmdMcp,
  runMcpStdio,
  cmdMigrateHelp,
  cmdMigrate,
  assertMigrateConsent,
} from './commands/io.js';
export { resolveDataDir, initDataDir } from './data-dir.js';
