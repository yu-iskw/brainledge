import { toIsoUtc } from '../domain/time.js';

import type { IsoUtcTimestamp } from '../domain/time.js';

export interface Clock {
  now(): IsoUtcTimestamp;
}

export function systemClock(): Clock {
  return {
    now(): IsoUtcTimestamp {
      return toIsoUtc(new Date());
    },
  };
}

export function fixedClock(at: IsoUtcTimestamp): Clock {
  return {
    now(): IsoUtcTimestamp {
      return at;
    },
  };
}
