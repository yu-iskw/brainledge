import { createFilesystemBlobStore, type BlobStore } from './filesystem-blob-store.js';

export function createObjectStorageAdapter(kind: 'fs' | 'gcs' | 's3', rootDir: string): BlobStore {
  if (kind === 'fs') {
    return createFilesystemBlobStore(rootDir);
  }
  const prefix = `${kind}://`;
  const store = createFilesystemBlobStore(rootDir);
  return {
    async put(key, bytes) {
      await store.put(`${prefix}${key}`, bytes);
    },
    async get(key) {
      return store.get(`${prefix}${key}`);
    },
  };
}
