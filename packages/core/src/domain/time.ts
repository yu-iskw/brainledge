export type IsoUtcTimestamp = string & { readonly __brand: 'IsoUtcTimestamp' };

// eslint-disable-next-line security/detect-unsafe-regex -- bounded ISO-8601 UTC; fractional seconds capped at 9 digits
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u;

export function parseIsoUtc(value: string): IsoUtcTimestamp {
  if (!ISO_UTC.test(value)) {
    throw new Error(`Invalid UTC timestamp: ${value}`);
  }
  const millis = Date.parse(value);
  if (Number.isNaN(millis)) {
    throw new Error(`Invalid UTC timestamp: ${value}`);
  }
  return value as IsoUtcTimestamp;
}

export function toIsoUtc(date: Date): IsoUtcTimestamp {
  return parseIsoUtc(date.toISOString());
}
