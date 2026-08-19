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
  cmdWorker,
} from './commands/io.js';
import {
  cmdConsolidate,
  cmdForget,
  cmdInit,
  cmdRecall,
  cmdRemember,
  parseForgetMode,
} from './commands/memory.js';
import { cmdDoctor, cmdStatus } from './commands/status.js';
import { resolveDataDir } from './data-dir.js';

const USAGE =
  'Usage: brainledge <init|remember|recall|forget|consolidate|status|doctor|backup|restore|import|export|serve|mcp|worker|migrate> [--data-dir DIR] [--server URL] [--token TOKEN]';

const DATA_DIR_FLAG = '--data-dir';
const VALUE_FLAGS = [
  DATA_DIR_FLAG,
  '--server',
  '--from-dir',
  '--to-dir',
  '--token',
  '--mode',
] as const;

type CommandHandler = (rest: string[]) => Promise<number>;

const COMMANDS: Record<string, CommandHandler> = {
  init(rest) {
    console.log(`Initialized ${cmdInit(readFlag(rest, DATA_DIR_FLAG))}`);
    return Promise.resolve(0);
  },
  async remember(rest) {
    console.log(
      await cmdRemember(
        readPositional(rest, VALUE_FLAGS),
        readFlag(rest, DATA_DIR_FLAG),
        readFlag(rest, '--server'),
        undefined,
        readFlag(rest, '--token'),
      ),
    );
    return 0;
  },
  async recall(rest) {
    console.log(
      await cmdRecall(
        readPositional(rest, VALUE_FLAGS),
        readFlag(rest, DATA_DIR_FLAG),
        readFlag(rest, '--server'),
        undefined,
        readFlag(rest, '--token'),
      ),
    );
    return 0;
  },
  async forget(rest) {
    console.log(
      await cmdForget(readPositional(rest, VALUE_FLAGS), {
        dataDirFlag: readFlag(rest, DATA_DIR_FLAG),
        mode: parseForgetMode(readFlag(rest, '--mode')),
        serverUrl: readFlag(rest, '--server'),
        apiToken: readFlag(rest, '--token'),
      }),
    );
    return 0;
  },
  async consolidate(rest) {
    console.log(
      await cmdConsolidate(
        readFlag(rest, DATA_DIR_FLAG),
        readFlag(rest, '--server'),
        undefined,
        readFlag(rest, '--token'),
      ),
    );
    return 0;
  },
  status(rest) {
    console.log(cmdStatus(readFlag(rest, DATA_DIR_FLAG)));
    return Promise.resolve(0);
  },
  doctor(rest) {
    console.log(cmdDoctor(readFlag(rest, DATA_DIR_FLAG)));
    return Promise.resolve(0);
  },
  backup: (rest) =>
    withRequiredPath('backup', readPositional(rest, VALUE_FLAGS), (dest) =>
      cmdBackup(dest, readFlag(rest, DATA_DIR_FLAG)),
    ),
  restore: (rest) =>
    withRequiredPath('restore', readPositional(rest, VALUE_FLAGS), (src) =>
      cmdRestore(src, readFlag(rest, DATA_DIR_FLAG)),
    ),
  export: (rest) =>
    withRequiredPath('export', readPositional(rest, VALUE_FLAGS), (dest) =>
      cmdExport(dest, readFlag(rest, DATA_DIR_FLAG)),
    ),
  async import(rest) {
    return withRequiredPath('import', readPositional(rest, VALUE_FLAGS), async (src) => {
      console.log(await cmdImport(src, readFlag(rest, DATA_DIR_FLAG)));
    });
  },
  serve(rest) {
    cmdServe(readFlag(rest, DATA_DIR_FLAG), readFlag(rest, '--server'));
    return Promise.resolve(0);
  },
  async mcp(rest) {
    const line = readPositional(rest, VALUE_FLAGS);
    const output = await cmdMcp(readFlag(rest, DATA_DIR_FLAG), line.length > 0 ? line : undefined);
    if (output.length > 0) {
      console.log(output);
    }
    return 0;
  },
  async worker(rest) {
    console.log(await cmdWorker(readFlag(rest, DATA_DIR_FLAG)));
    return 0;
  },
  async migrate(rest) {
    assertMigrateConsent(rest);
    const dataDir = readFlag(rest, DATA_DIR_FLAG);
    const fromDir = readFlag(rest, '--from-dir') ?? dataDir ?? resolveDataDir();
    const toDir = readFlag(rest, '--to-dir');
    if (toDir === undefined) {
      console.log(cmdMigrateHelp());
      return 0;
    }
    console.log(await cmdMigrate(fromDir, toDir, rest));
    return 0;
  },
};

export async function runCli(argv: string[]): Promise<number> {
  const command = argv[2] ?? '';
  if (command.length === 0) {
    console.log(USAGE);
    return 0;
  }
  const handler = Object.hasOwn(COMMANDS, command) ? COMMANDS[command] : undefined;
  if (handler === undefined) {
    console.log(USAGE);
    return 1;
  }
  return handler(argv.slice(3));
}

async function withRequiredPath(
  action: string,
  pathValue: string,
  run: (pathValue: string) => Promise<unknown>,
): Promise<number> {
  if (pathValue.length === 0) {
    throw new Error(`${action} requires a path`);
  }
  await run(pathValue);
  return 0;
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

const entry = process.argv[1] ?? '';
if (entry.endsWith('main.js') || entry.endsWith('main.ts')) {
  runCli(process.argv)
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    });
}
