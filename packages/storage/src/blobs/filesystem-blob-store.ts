import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export interface BlobStore {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | undefined>;
}

export function createFilesystemBlobStore(root: string): BlobStore {
  return {
    put(key, bytes) {
      const full = path.join(root, key);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, bytes);
      return Promise.resolve();
    },
    get(key) {
      const full = path.join(root, key);
      if (!existsSync(full)) {
        return Promise.resolve(undefined);
      }
      return Promise.resolve(new Uint8Array(readFileSync(full)));
    },
  };
}
