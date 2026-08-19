export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
}

export function passthroughUnitOfWork(): UnitOfWork {
  return {
    run<T>(work: () => Promise<T>): Promise<T> {
      return work();
    },
  };
}
