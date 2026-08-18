#!/usr/bin/env node
import { cmdBackup, cmdRestore } from './commands/backup.js';
import {
  assertMigrateConsent,
  cmdExport,
  cmdImport,
  cmdMcp,
  cmdMigrateHelp,
  cmdMigrate,
  cmdServe,
} from './commands/io.js';
import { cmdInit, cmdRecall, cmdRemember } from './commands/memory.js';
import { cmdDoctor, cmdStatus } from './commands/status.js';
import { resolveDataDir } from './data-dir.js';

const DATA_DIR_FLAG = '--data-dir';
const VALUE_FLAGS = [DATA_DIR_FLAG, '--server', '--from-dir', '--to-dir'] as const;

async function main(argv: string[]): Promise<void> {
  const [, , command, ...rest] = argv;
  const dataDir = readFlag(rest, DATA_DIR_FLAG);
  const remote = readFlag(rest, '--server');
  switch (command) {
    case 'init': {
      const dir = cmdInit(dataDir);
      console.log(`Initialized ${dir}`);
      return;
    }
    case 'remember': {
      const id = await cmdRemember(readPositional(rest, VALUE_FLAGS), dataDir, remote);
      console.log(id);
      return;
    }
    case 'recall': {
      console.log(await cmdRecall(readPositional(rest, VALUE_FLAGS), dataDir, remote));
      return;
    }
    case 'status': {
      console.log(cmdStatus(dataDir));
      return;
    }
    case 'doctor': {
      console.log(cmdDoctor(dataDir));
      return;
    }
    case 'backup': {
      const dest = readPositional(rest, VALUE_FLAGS);
      if (dest.length === 0) {
        throw new Error('backup requires a destination path');
      }
      await cmdBackup(dest, dataDir);
      return;
    }
    case 'restore': {
      const src = readPositional(rest, VALUE_FLAGS);
      if (src.length === 0) {
        throw new Error('restore requires a source path');
      }
      await cmdRestore(src, dataDir);
      return;
    }
    case 'export': {
      const dest = readPositional(rest, VALUE_FLAGS);
      if (dest.length === 0) {
        throw new Error('export requires a destination path');
      }
      await cmdExport(dest, dataDir);
      return;
    }
    case 'import': {
      const src = readPositional(rest, VALUE_FLAGS);
      if (src.length === 0) {
        throw new Error('import requires a source path');
      }
      console.log(await cmdImport(src, dataDir));
      return;
    }
    case 'serve': {
      console.log(cmdServe(dataDir, remote));
      return;
    }
    case 'mcp': {
      console.log(await cmdMcp(dataDir));
      return;
    }
    case 'migrate': {
      assertMigrateConsent(rest);
      const fromDir = readFlag(rest, '--from-dir') ?? dataDir ?? resolveDataDir();
      const toDir = readFlag(rest, '--to-dir');
      if (toDir === undefined) {
        console.log(cmdMigrateHelp());
        return;
      }
      console.log(await cmdMigrate(fromDir, toDir, rest));
      return;
    }
    default: {
      console.log(
        'Usage: brainledge <init|remember|recall|status|doctor|backup|restore|import|export|serve|mcp|migrate> [--data-dir DIR] [--server URL]',
      );
    }
  }
}

function readFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function readPositional(args: string[], flagNames: readonly string[]): string {
  const skip = new Set<number>();
  for (const name of flagNames) {
    const index = args.indexOf(name);
    if (index !== -1) {
      skip.add(index);
      skip.add(index + 1);
    }
  }
  return args.filter((item, index) => !item.startsWith('--') && !skip.has(index)).join(' ');
}

main(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
