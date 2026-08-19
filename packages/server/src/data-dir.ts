import { homedir } from 'node:os';
import path from 'node:path';

export function resolveServerDataDir(): string {
  const fromEnv = process.env.BRAINLEDGE_DATA_DIR;
  if (fromEnv !== undefined && fromEnv.length > 0) {
    return fromEnv;
  }
  return path.join(homedir(), '.brainledge');
}
