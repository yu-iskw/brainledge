export function isExpired(observedAt: string, now: string, days: number): boolean {
  const observed = Date.parse(observedAt);
  const current = Date.parse(now);
  return current - observed > days * 86_400_000;
}
